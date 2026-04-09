// src/lib/db.ts
import {
  db,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  addDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from "./firebase";
import {
  WorkshopSettings,
  Team,
  DailySubmission,
  MaterialItem,
  TeamPaymentStatus,
  TeamLimits,
} from "@/types";
import {
  DEFAULT_MATERIALS,
  DEFAULT_PAYMENT_STAGES,
  DEFAULT_SETTINGS,
  WORKSHOP_ID,
} from "./defaultData";

// ─── Workshop Settings ────────────────────────────────────────────────

export async function getWorkshopSettings(): Promise<WorkshopSettings | null> {
  const ref = doc(db, "workshops", WORKSHOP_ID);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as WorkshopSettings;
}

export async function initializeWorkshop(): Promise<WorkshopSettings> {
  const existing = await getWorkshopSettings();
  if (existing) return existing;

  const materials: MaterialItem[] = DEFAULT_MATERIALS.map((m, i) => ({
    ...m,
    id: `mat-${i + 1}`,
    order: i,
  }));

  const settings: Omit<WorkshopSettings, "id"> = {
    ...DEFAULT_SETTINGS,
    materials,
    paymentStages: DEFAULT_PAYMENT_STAGES,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(doc(db, "workshops", WORKSHOP_ID), settings);
  return { id: WORKSHOP_ID, ...settings };
}

export async function updateWorkshopSettings(
  updates: Partial<Omit<WorkshopSettings, "id" | "createdAt">>,
): Promise<void> {
  await updateDoc(doc(db, "workshops", WORKSHOP_ID), {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

// ─── Teams ───────────────────────────────────────────────────────────

export async function getTeams(): Promise<Team[]> {
  const q = query(
    collection(db, "teams"),
    where("workshopId", "==", WORKSHOP_ID),
    orderBy("namaTeam"),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Team);
}

export async function createTeam(namaTeam: string): Promise<Team> {
  const ref = await addDoc(collection(db, "teams"), {
    namaTeam,
    workshopId: WORKSHOP_ID,
    createdAt: serverTimestamp(),
  });
  return { id: ref.id, namaTeam, workshopId: WORKSHOP_ID };
}

export async function deleteTeam(teamId: string): Promise<void> {
  const { deleteDoc } = await import("firebase/firestore");
  await deleteDoc(doc(db, "teams", teamId));
}

// ─── Daily Submissions ────────────────────────────────────────────────

export async function getTeamSubmissions(
  teamId: string,
): Promise<DailySubmission[]> {
  const q = query(
    collection(db, "submissions"),
    where("teamId", "==", teamId),
    where("workshopId", "==", WORKSHOP_ID),
    orderBy("hari"),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as DailySubmission);
}

export async function getAllSubmissions(): Promise<DailySubmission[]> {
  const q = query(
    collection(db, "submissions"),
    where("workshopId", "==", WORKSHOP_ID),
    orderBy("hari"),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as DailySubmission);
}

export async function submitDailyPurchase(
  submission: Omit<DailySubmission, "id" | "submittedAt" | "locked">,
): Promise<string> {
  const ref = await addDoc(collection(db, "submissions"), {
    ...submission,
    locked: true,
    submittedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function checkDaySubmitted(
  teamId: string,
  hari: number,
): Promise<boolean> {
  const q = query(
    collection(db, "submissions"),
    where("teamId", "==", teamId),
    where("workshopId", "==", WORKSHOP_ID),
    where("hari", "==", hari),
  );
  const snap = await getDocs(q);
  return !snap.empty;
}

// ─── Reset (submissions + payment statuses only) ──────────────────────

export async function resetAllSubmissions(): Promise<void> {
  const { deleteDoc } = await import("firebase/firestore");

  const [subSnap, paySnap] = await Promise.all([
    getDocs(
      query(
        collection(db, "submissions"),
        where("workshopId", "==", WORKSHOP_ID),
      ),
    ),
    getDocs(
      query(
        collection(db, "paymentStatuses"),
        where("workshopId", "==", WORKSHOP_ID),
      ),
    ),
  ]);

  await Promise.all([
    ...subSnap.docs.map((d) => deleteDoc(d.ref)),
    ...paySnap.docs.map((d) => deleteDoc(d.ref)),
  ]);
}

// ─── Payment Statuses ─────────────────────────────────────────────────

// Doc ID pattern: {workshopId}_{teamId}_{stageId}
function paymentDocId(teamId: string, stageId: string) {
  return `${WORKSHOP_ID}_${teamId}_${stageId}`;
}

export async function getAllPaymentStatuses(): Promise<TeamPaymentStatus[]> {
  const q = query(
    collection(db, "paymentStatuses"),
    where("workshopId", "==", WORKSHOP_ID),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as TeamPaymentStatus);
}

export async function getTeamPaymentStatuses(
  teamId: string,
): Promise<TeamPaymentStatus[]> {
  const q = query(
    collection(db, "paymentStatuses"),
    where("workshopId", "==", WORKSHOP_ID),
    where("teamId", "==", teamId),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as TeamPaymentStatus);
}

export async function setPaymentStatus(
  teamId: string,
  stageId: string,
  completed: boolean,
  bonus: number,
  penalty: number,
): Promise<void> {
  const docId = paymentDocId(teamId, stageId);
  await setDoc(doc(db, "paymentStatuses", docId), {
    workshopId: WORKSHOP_ID,
    teamId,
    stageId,
    completed,
    bonus,
    penalty,
    completedAt: completed ? serverTimestamp() : null,
  });
}

// ─── Team Purchase Limits ─────────────────────────────────────────────
//
// Stored in collection "teamLimits", one doc per team.
// Doc ID = teamId.
// Shape: { workshopId, teamId, limits: { [materialId]: maxQty } }
// maxQty is in base units (satuan). 0 means unlimited.

export async function getAllTeamLimits(): Promise<TeamLimits[]> {
  const q = query(
    collection(db, "teamLimits"),
    where("workshopId", "==", WORKSHOP_ID),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as TeamLimits);
}

export async function getTeamLimits(teamId: string): Promise<TeamLimits | null> {
  const ref = doc(db, "teamLimits", teamId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return snap.data() as TeamLimits;
}

export async function setTeamLimits(
  teamId: string,
  limits: Record<string, number>,
): Promise<void> {
  await setDoc(doc(db, "teamLimits", teamId), {
    workshopId: WORKSHOP_ID,
    teamId,
    limits,
  });
}