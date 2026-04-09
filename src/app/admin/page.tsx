"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  getWorkshopSettings,
  updateWorkshopSettings,
  getTeams,
  createTeam,
  deleteTeam,
  getAllSubmissions,
  getAllPaymentStatuses,
  setPaymentStatus,
  resetAllSubmissions,
  getAllTeamLimits,
  setTeamLimits,
} from "@/lib/db";
import { uploadToCloudinary } from "@/lib/cloudinary";
import {
  WorkshopSettings,
  Team,
  DailySubmission,
  TeamSummary,
  TeamPaymentStatus,
  MaterialItem,
  PackageOption,
  PaymentStage,
  TeamLimits,
} from "@/types";
import { formatRupiah, getSpendingStatus } from "@/lib/utils";
import { exportRekapCSV } from "@/lib/exportExcel";
import Leaderboard from "@/components/Leaderboard";
import { BONUS_PENALTY_VALUE } from "@/lib/defaultData";
import {
  Settings,
  Users,
  BarChart3,
  Plus,
  Trash2,
  Save,
  Loader2,
  LogOut,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Lock,
  Package,
  Trophy,
  Download,
  CreditCard,
  CheckCircle,
  Circle,
  GripVertical,
  X,
  Upload,
  CloudOff,
  RotateCcw,
  Tag,
  ShieldAlert,
} from "lucide-react";

type Tab = "monitor" | "payments" | "leaderboard" | "teams" | "limits" | "settings";

interface DragState {
  draggingIdx: number | null;
  overIdx: number | null;
}

// ─── Local edit state for limits tab ──────────────────────────────────
// Map: teamId → { materialId → maxQty string (for input binding) }
type LimitsEditState = Record<string, Record<string, string>>;

export default function AdminPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("monitor");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [settings, setSettings] = useState<WorkshopSettings | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [summaries, setSummaries] = useState<TeamSummary[]>([]);
  const [allPaymentStatuses, setAllPaymentStatuses] = useState<TeamPaymentStatus[]>([]);
  const [allTeamLimits, setAllTeamLimits] = useState<TeamLimits[]>([]);
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null);
  const [newTeamName, setNewTeamName] = useState("");
  const [addingTeam, setAddingTeam] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsForm, setSettingsForm] = useState<Partial<WorkshopSettings>>({});
  const [savingPayment, setSavingPayment] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);
  const [expandedPackageIdx, setExpandedPackageIdx] = useState<number | null>(null);

  // Limits tab state
  const [limitsEdit, setLimitsEdit] = useState<LimitsEditState>({});
  const [savingLimits, setSavingLimits] = useState<string | null>(null); // teamId being saved
  const [limitsSelectedTeam, setLimitsSelectedTeam] = useState<string | null>(null);

  const [drag, setDrag] = useState<DragState>({ draggingIdx: null, overIdx: null });
  const [uploadState, setUploadState] = useState<Record<number, "uploading" | "done" | "error">>({});

  useEffect(() => {
    if (!sessionStorage.getItem("isAdmin")) { router.push("/"); return; }
    load();
  }, []);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const [ws, t, allSubs, allPay, allLimits] = await Promise.all([
        getWorkshopSettings(),
        getTeams(),
        getAllSubmissions(),
        getAllPaymentStatuses(),
        getAllTeamLimits(),
      ]);
      if (!ws) { router.push("/"); return; }
      setSettings(ws);
      setTeams(t);
      setAllPaymentStatuses(allPay);
      setAllTeamLimits(allLimits);
      setSettingsForm({
        namaWorkshop: ws.namaWorkshop,
        jumlahHari: ws.jumlahHari,
        maxPengeluaran: ws.maxPengeluaran,
        jumlahPendapatan: ws.jumlahPendapatan,
        adminPassword: ws.adminPassword,
        cloudinaryCloudName: ws.cloudinaryCloudName ?? "",
        cloudinaryUploadPreset: ws.cloudinaryUploadPreset ?? "",
        materials: ws.materials
          .map((m) => ({ ...m, packages: m.packages ? [...m.packages.map((p) => ({ ...p }))] : [] }))
          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
        paymentStages: ws.paymentStages?.map((p) => ({ ...p })) ?? [],
      });
      setSummaries(buildSummaries(t, allSubs, allPay, ws));

      // Build local limitsEdit from fetched data
      const editState: LimitsEditState = {};
      t.forEach((team) => {
        const tl = allLimits.find((l) => l.teamId === team.id);
        editState[team.id] = {};
        ws.materials.forEach((m) => {
          const val = tl?.limits?.[m.id] ?? 0;
          editState[team.id][m.id] = val === 0 ? "" : String(val);
        });
      });
      setLimitsEdit(editState);
      if (t.length > 0 && !limitsSelectedTeam) {
        setLimitsSelectedTeam(t[0].id);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router]);

  function buildSummaries(t: Team[], allSubs: DailySubmission[], allPay: TeamPaymentStatus[], ws: WorkshopSettings): TeamSummary[] {
    return t.map((team) => {
      const teamSubs = allSubs.filter((s) => s.teamId === team.id);
      const totalPengeluaran = teamSubs.reduce((s, sub) => s + sub.totalHari, 0);
      const totalPerMaterial: TeamSummary["totalPerMaterial"] = {};
      teamSubs.forEach((sub) => {
        sub.entries.forEach((e) => {
          if (!totalPerMaterial[e.materialId]) {
            totalPerMaterial[e.materialId] = { jumlah: 0, total: 0, nama: e.namaKomponen, satuan: e.satuan };
          }
          totalPerMaterial[e.materialId].jumlah += e.jumlah;
          totalPerMaterial[e.materialId].total += e.totalHarga;
        });
      });
      const teamPayments = allPay.filter((p) => p.teamId === team.id);
      const totalPendapatan = (ws.paymentStages ?? []).reduce((sum, stage) => {
        const ps = teamPayments.find((p) => p.stageId === stage.id);
        if (!ps?.completed) return sum;
        const bonusAmt = (ps.bonus ?? 0) * BONUS_PENALTY_VALUE;
        const penaltyAmt = (ps.penalty ?? 0) * BONUS_PENALTY_VALUE;
        return sum + stage.nominal + bonusAmt - penaltyAmt;
      }, 0);
      return { team, submissions: teamSubs, totalPengeluaran, totalPendapatan, totalPerMaterial, paymentStatuses: teamPayments };
    });
  }

  // ─── Reset ────────────────────────────────────────────────────────

  async function handleResetSubmissions() {
    const totalSubs = summaries.reduce((s, t) => s + t.submissions.length, 0);
    if (!confirm(`Reset data transaksi?\n\nIni akan menghapus:\n• ${totalSubs} submission dari semua tim\n• Semua status pembayaran\n\nPengaturan workshop, daftar tim, dan material TIDAK akan berubah.\n\nLanjutkan?`)) return;
    if (!confirm("Yakin? Data yang dihapus tidak bisa dipulihkan.")) return;
    setResetting(true);
    try {
      await resetAllSubmissions();
      await load();
      alert("Reset berhasil! Semua data transaksi telah dihapus.");
    } catch (err) {
      alert("Reset gagal. Coba lagi.");
      console.error(err);
    } finally {
      setResetting(false);
    }
  }

  // ─── Payment handlers ─────────────────────────────────────────────

  async function handleTogglePayment(teamId: string, stageId: string, currentCompleted: boolean, bonus: number, penalty: number) {
    const key = `${teamId}_${stageId}`;
    setSavingPayment(key);
    await setPaymentStatus(teamId, stageId, !currentCompleted, bonus, penalty);
    await load();
    setSavingPayment(null);
  }

  async function handleUpdateBonusPenalty(teamId: string, stageId: string, completed: boolean, bonus: number, penalty: number) {
    const key = `${teamId}_${stageId}`;
    setSavingPayment(key);
    await setPaymentStatus(teamId, stageId, completed, bonus, penalty);
    await load();
    setSavingPayment(null);
  }

  // ─── Team handlers ────────────────────────────────────────────────

  async function handleAddTeam(e: React.FormEvent) {
    e.preventDefault();
    if (!newTeamName.trim()) return;
    setAddingTeam(true);
    await createTeam(newTeamName.trim());
    setNewTeamName("");
    await load();
    setAddingTeam(false);
  }

  async function handleDeleteTeam(teamId: string, name: string) {
    if (!confirm(`Hapus tim "${name}"?`)) return;
    await deleteTeam(teamId);
    await load();
  }

  // ─── Settings handlers ────────────────────────────────────────────

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    setSavingSettings(true);
    const materials = settingsForm.materials?.map((m, i) => ({ ...m, order: i }));
    await updateWorkshopSettings({
      namaWorkshop: settingsForm.namaWorkshop,
      jumlahHari: Number(settingsForm.jumlahHari),
      maxPengeluaran: Number(settingsForm.maxPengeluaran),
      jumlahPendapatan: Number(settingsForm.jumlahPendapatan),
      adminPassword: settingsForm.adminPassword,
      cloudinaryCloudName: settingsForm.cloudinaryCloudName,
      cloudinaryUploadPreset: settingsForm.cloudinaryUploadPreset,
      materials,
      paymentStages: settingsForm.paymentStages,
    });
    await load();
    setSavingSettings(false);
    alert("Pengaturan berhasil disimpan!");
  }

  function updateMaterial(idx: number, field: string, val: string) {
    setSettingsForm((prev) => ({
      ...prev,
      materials: prev.materials?.map((m, i) =>
        i === idx ? { ...m, [field]: field === "hargaPerPcs" ? Number(val) : val } : m
      ),
    }));
  }

  function updateMaterialDirect(idx: number, field: keyof MaterialItem, val: string | number) {
    setSettingsForm((prev) => ({
      ...prev,
      materials: prev.materials?.map((m, i) => (i === idx ? { ...m, [field]: val } : m)),
    }));
  }

  // ─── Package management ───────────────────────────────────────────

  function addPackage(matIdx: number) {
    setSettingsForm((prev) => {
      const mats = [...(prev.materials ?? [])];
      const mat = { ...mats[matIdx] };
      const pkgs = [...(mat.packages ?? [])];
      const newId = `pkg-${mat.id}-${Date.now()}`;
      pkgs.push({ id: newId, label: "", qtyPerPackage: 1, hargaPerPackage: 0 });
      mat.packages = pkgs;
      mats[matIdx] = mat;
      return { ...prev, materials: mats };
    });
  }

  function updatePackage(matIdx: number, pkgIdx: number, field: keyof PackageOption, val: string) {
    setSettingsForm((prev) => {
      const mats = [...(prev.materials ?? [])];
      const mat = { ...mats[matIdx] };
      const pkgs = [...(mat.packages ?? [])];
      const pkg = { ...pkgs[pkgIdx] };
      if (field === "qtyPerPackage" || field === "hargaPerPackage") {
        (pkg as Record<string, unknown>)[field] = Number(val);
      } else {
        (pkg as Record<string, unknown>)[field] = val;
      }
      pkgs[pkgIdx] = pkg;
      mat.packages = pkgs;
      mats[matIdx] = mat;
      return { ...prev, materials: mats };
    });
  }

  function removePackage(matIdx: number, pkgIdx: number) {
    setSettingsForm((prev) => {
      const mats = [...(prev.materials ?? [])];
      const mat = { ...mats[matIdx] };
      mat.packages = (mat.packages ?? []).filter((_, i) => i !== pkgIdx);
      mats[matIdx] = mat;
      return { ...prev, materials: mats };
    });
  }

  // ─── Stage handlers ───────────────────────────────────────────────

  function updateStage(idx: number, field: string, val: string) {
    setSettingsForm((prev) => ({
      ...prev,
      paymentStages: prev.paymentStages?.map((s, i) =>
        i === idx ? { ...s, [field]: field === "nominal" ? Number(val) : val } : s
      ),
    }));
  }

  function addPaymentStage() {
    const stages = settingsForm.paymentStages ?? [];
    const newId = `stage-${Date.now()}`;
    setSettingsForm((prev) => ({
      ...prev,
      paymentStages: [...stages, { id: newId, label: `Tahap ${stages.length}`, nominal: 0 }],
    }));
  }

  function removePaymentStage(idx: number) {
    setSettingsForm((prev) => ({
      ...prev,
      paymentStages: prev.paymentStages?.filter((_, i) => i !== idx),
    }));
  }

  // ─── Drag-to-reorder ──────────────────────────────────────────────

  function handleDragStart(idx: number) { setDrag({ draggingIdx: idx, overIdx: idx }); }
  function handleDragEnter(idx: number) { setDrag((d) => ({ ...d, overIdx: idx })); }
  function handleDragEnd() {
    const { draggingIdx, overIdx } = drag;
    if (draggingIdx === null || overIdx === null || draggingIdx === overIdx) {
      setDrag({ draggingIdx: null, overIdx: null });
      return;
    }
    setSettingsForm((prev) => {
      const mats = [...(prev.materials ?? [])];
      const [moved] = mats.splice(draggingIdx, 1);
      mats.splice(overIdx, 0, moved);
      return { ...prev, materials: mats };
    });
    setDrag({ draggingIdx: null, overIdx: null });
  }

  // ─── Cloudinary upload ────────────────────────────────────────────

  async function handleImageUpload(idx: number, file: File) {
    const cloudName = settingsForm.cloudinaryCloudName ?? "";
    const preset = settingsForm.cloudinaryUploadPreset ?? "";
    if (!cloudName || !preset) {
      alert("Isi Cloud Name dan Upload Preset Cloudinary di bagian Konfigurasi Cloudinary terlebih dahulu.");
      return;
    }
    setUploadState((s) => ({ ...s, [idx]: "uploading" }));
    try {
      const url = await uploadToCloudinary(file, cloudName, preset);
      updateMaterialDirect(idx, "imageUrl", url);
      setUploadState((s) => ({ ...s, [idx]: "done" }));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Upload gagal";
      alert(msg);
      setUploadState((s) => ({ ...s, [idx]: "error" }));
    }
  }

  function removeMaterialImage(idx: number) { updateMaterialDirect(idx, "imageUrl", ""); }

  // ─── Limits handlers ──────────────────────────────────────────────

  function setLimitValue(teamId: string, materialId: string, val: string) {
    // Only allow non-negative integers or empty string
    if (val !== "" && !/^\d+$/.test(val)) return;
    setLimitsEdit((prev) => ({
      ...prev,
      [teamId]: { ...prev[teamId], [materialId]: val },
    }));
  }

  async function handleSaveLimits(teamId: string) {
    setSavingLimits(teamId);
    const raw = limitsEdit[teamId] ?? {};
    const limits: Record<string, number> = {};
    Object.entries(raw).forEach(([matId, val]) => {
      limits[matId] = val === "" ? 0 : Number(val);
    });
    await setTeamLimits(teamId, limits);
    await load();
    setSavingLimits(null);
  }

  function handleCopyLimits(fromTeamId: string, toTeamId: string) {
    const source = limitsEdit[fromTeamId] ?? {};
    setLimitsEdit((prev) => ({
      ...prev,
      [toTeamId]: { ...source },
    }));
  }

  function handleClearLimits(teamId: string) {
    setLimitsEdit((prev) => {
      const cleared: Record<string, string> = {};
      Object.keys(prev[teamId] ?? {}).forEach((k) => { cleared[k] = ""; });
      return { ...prev, [teamId]: cleared };
    });
  }

  // ─── Render ───────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">Memuat dashboard...</p>
        </div>
      </div>
    );
  }

  const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: "monitor", label: "Monitoring", icon: BarChart3 },
    { key: "payments", label: "Pembayaran", icon: CreditCard },
    { key: "leaderboard", label: "Leaderboard", icon: Trophy },
    { key: "teams", label: "Kelola Tim", icon: Users },
    { key: "limits", label: "Batas Pembelian", icon: ShieldAlert },
    { key: "settings", label: "Pengaturan", icon: Settings },
  ];

  const totalSubmissions = summaries.reduce((s, t) => s + t.submissions.length, 0);
  const sortedMaterials = settings
    ? [...settings.materials].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    : [];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-blue-900 text-white px-4 py-4 shadow-lg">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <p className="text-xs text-blue-300">Panel Penyelenggara</p>
            <h1 className="font-bold text-xl leading-tight">{settings?.namaWorkshop}</h1>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={load} disabled={refreshing} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            </button>
            {settings && summaries.length > 0 && (
              <button onClick={() => exportRekapCSV(summaries, settings)} className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 transition-colors">
                <Download className="w-4 h-4" /> Export CSV
              </button>
            )}
            <button onClick={() => { sessionStorage.removeItem("isAdmin"); router.push("/"); }} className="flex items-center gap-1 text-sm px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors">
              <LogOut className="w-4 h-4" /> Keluar
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 flex overflow-x-auto">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setTab(key)} className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${tab === key ? "border-blue-600 text-blue-700" : "border-transparent text-slate-500 hover:text-slate-700"}`}>
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">

        {/* ═══ MONITORING ═══ */}
        {tab === "monitor" && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Total Tim", value: String(teams.length), sub: "tim aktif", color: "text-blue-700" },
                { label: "Total Hari", value: String(settings?.jumlahHari), sub: "hari workshop", color: "text-slate-700" },
                { label: "Maksimal Pengeluaran", value: formatRupiah(settings?.jumlahPendapatan ?? 0), sub: "per tim", color: "text-green-700" },
                { label: "Nilai Project", value: formatRupiah(settings?.maxPengeluaran ?? 0), sub: "total", color: "text-orange-600" },
              ].map(({ label, value, sub, color }) => (
                <div key={label} className="card text-center">
                  <p className={`text-lg font-bold ${color} leading-tight`}>{value}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{label}</p>
                  <p className="text-xs text-slate-400">{sub}</p>
                </div>
              ))}
            </div>

            {summaries.length === 0 ? (
              <div className="card text-center py-12 text-slate-400">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Belum ada tim. Buat tim di tab "Kelola Tim".</p>
              </div>
            ) : (
              summaries.map((summary, teamIdx) => {
                const { team, submissions, totalPengeluaran, totalPendapatan, totalPerMaterial } = summary;
                const status = getSpendingStatus(totalPengeluaran, totalPendapatan);
                const isExpanded = expandedTeam === team.id;
                const pct = totalPendapatan > 0 ? (totalPengeluaran / totalPendapatan) * 100 : 0;
                const keuntungan = totalPendapatan - totalPengeluaran;
                const stagesCompleted = summary.paymentStatuses.filter((p) => p.completed).length;
                const totalStages = settings?.paymentStages?.length ?? 0;
                const teamLimitDoc = allTeamLimits.find((l) => l.teamId === team.id);
                const hasLimits = teamLimitDoc && Object.values(teamLimitDoc.limits ?? {}).some((v) => v > 0);

                return (
                  <div key={team.id} className="card">
                    <button onClick={() => setExpandedTeam(isExpanded ? null : team.id)} className="w-full">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-11 h-11 rounded-xl bg-blue-100 text-blue-700 font-bold text-lg flex items-center justify-center flex-shrink-0">{teamIdx + 1}</div>
                        <div className="flex-1 text-left">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-slate-800">{team.namaTeam}</p>
                              {hasLimits && (
                                <span className="flex items-center gap-1 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold">
                                  <ShieldAlert className="w-3 h-3" /> Ada batas
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${status.bg} ${status.color}`}>{status.label}</span>
                              {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                            </div>
                          </div>
                          <p className="text-xs text-slate-500">{submissions.length} submisi · {stagesCompleted}/{totalStages} tahap lunas</p>
                        </div>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2.5">
                        <div className={`${status.barColor} h-2.5 rounded-full`} style={{ width: `${Math.min(pct, 100)}%` }} />
                      </div>
                      <div className="flex justify-between text-xs text-slate-400 mt-1">
                        <span>Pengeluaran: <span className="font-semibold text-slate-600">{formatRupiah(totalPengeluaran)}</span></span>
                        <span>Anggaran diterima: <span className="font-semibold text-green-600">{formatRupiah(totalPendapatan)}</span></span>
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="mt-5 pt-5 border-t border-slate-100 space-y-5">
                        <div className="grid grid-cols-3 gap-3">
                          <div className="bg-green-50 rounded-xl p-3 text-center">
                            <p className="text-xs text-slate-500 mb-1">Pendapatan / Anggaran</p>
                            <p className="font-bold text-sm text-green-700">{formatRupiah(totalPendapatan)}</p>
                          </div>
                          <div className="bg-slate-50 rounded-xl p-3 text-center">
                            <p className="text-xs text-slate-500 mb-1">Pengeluaran</p>
                            <p className="font-bold text-sm text-slate-700">{formatRupiah(totalPengeluaran)}</p>
                          </div>
                          <div className={`rounded-xl p-3 text-center ${keuntungan >= 0 ? "bg-green-50" : "bg-red-50"}`}>
                            <p className="text-xs text-slate-500 mb-1">Keuntungan</p>
                            <p className={`font-bold text-sm ${keuntungan >= 0 ? "text-green-700" : "text-red-700"}`}>{keuntungan >= 0 ? "+" : ""}{formatRupiah(keuntungan)}</p>
                          </div>
                        </div>

                        <div>
                          <p className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                            <Lock className="w-4 h-4 text-slate-400" /> Riwayat Pembelian
                          </p>
                          {submissions.length === 0 ? (
                            <p className="text-sm text-slate-400 italic">Belum ada submission</p>
                          ) : (
                            <div className="space-y-2">
                              {submissions.map((sub) => (
                                <div key={sub.id} className="bg-slate-50 rounded-xl p-3">
                                  <div className="flex justify-between items-center mb-2">
                                    <span className="font-semibold text-sm text-slate-700 flex items-center gap-1.5">
                                      <Lock className="w-3.5 h-3.5 text-slate-400" /> Hari ke-{sub.hari}
                                    </span>
                                    <span className="font-bold text-blue-700 text-sm">{formatRupiah(sub.totalHari)}</span>
                                  </div>
                                  {sub.entries.length === 0 ? (
                                    <p className="text-xs text-slate-400 italic">Tidak ada pembelian</p>
                                  ) : (
                                    <div className="space-y-1">
                                      {sub.entries.map((e, i) => (
                                        <div key={i} className="flex justify-between text-xs">
                                          <span className="text-slate-600">
                                            {e.namaKomponen}
                                            {e.isPackage && (
                                              <span className="ml-1 text-blue-500 font-medium">[{e.packageLabel}×{e.packageCount}]</span>
                                            )}
                                            <span className="text-slate-400"> × {e.jumlah} {e.satuan}</span>
                                          </span>
                                          <span className="text-slate-700 font-medium">{formatRupiah(e.totalHarga)}</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {Object.keys(totalPerMaterial).length > 0 && (
                          <div>
                            <p className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                              <Package className="w-4 h-4 text-slate-400" /> Rekapan Total Material & SDM
                            </p>
                            <div className="overflow-x-auto rounded-xl border border-slate-200">
                              <table className="w-full text-xs">
                                <thead className="bg-slate-50">
                                  <tr className="text-left text-slate-500">
                                    <th className="px-3 py-2">Komponen</th>
                                    <th className="px-3 py-2 text-right">Total Qty</th>
                                    <th className="px-3 py-2 text-right">Batas</th>
                                    <th className="px-3 py-2 text-right">Total Biaya</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {Object.entries(totalPerMaterial).map(([matId, m], i) => {
                                    const limit = teamLimitDoc?.limits?.[matId] ?? 0;
                                    const overLimit = limit > 0 && m.jumlah > limit;
                                    return (
                                      <tr key={i} className={`border-t border-slate-100 ${overLimit ? "bg-red-50" : ""}`}>
                                        <td className="px-3 py-2 text-slate-700">{m.nama}</td>
                                        <td className={`px-3 py-2 text-right font-semibold ${overLimit ? "text-red-600" : "text-slate-600"}`}>
                                          {m.jumlah} {m.satuan}
                                        </td>
                                        <td className="px-3 py-2 text-right text-slate-400">
                                          {limit > 0 ? `maks ${limit}` : "—"}
                                        </td>
                                        <td className="px-3 py-2 text-right font-semibold text-slate-700">{formatRupiah(m.total)}</td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                                <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                                  <tr>
                                    <td className="px-3 py-2 font-bold text-slate-700" colSpan={3}>TOTAL</td>
                                    <td className="px-3 py-2 text-right font-bold text-blue-700">{formatRupiah(totalPengeluaran)}</td>
                                  </tr>
                                </tfoot>
                              </table>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ═══ PEMBAYARAN ═══ */}
        {tab === "payments" && (
          <div className="space-y-4">
            <div className="card bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
              <div className="flex items-center gap-3">
                <CreditCard className="w-7 h-7 text-blue-600" />
                <div>
                  <h2 className="font-bold text-slate-800">Manajemen Pembayaran</h2>
                  <p className="text-xs text-slate-500">Centang tahap setelah tim konfirmasi pembayaran. Bonus/penalti masing-masing {formatRupiah(BONUS_PENALTY_VALUE)}. Anggaran belanja tim = total pembayaran yang sudah diterima.</p>
                </div>
              </div>
            </div>

            {summaries.length === 0 ? (
              <div className="card text-center py-12 text-slate-400">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-30" /><p>Belum ada tim.</p>
              </div>
            ) : (
              summaries.map((summary) => {
                const stages = settings?.paymentStages ?? [];
                const totalBonus = summary.paymentStatuses.reduce((s, p) => s + (p.bonus ?? 0) * BONUS_PENALTY_VALUE, 0);
                const totalPenalty = summary.paymentStatuses.reduce((s, p) => s + (p.penalty ?? 0) * BONUS_PENALTY_VALUE, 0);

                return (
                  <div key={summary.team.id} className="card">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-bold text-slate-800 text-lg">{summary.team.namaTeam}</h3>
                      <div className="text-right">
                        <p className="text-xs text-slate-500">Anggaran Diterima</p>
                        <p className="font-bold text-green-700">{formatRupiah(summary.totalPendapatan)}</p>
                      </div>
                    </div>
                    {(totalBonus > 0 || totalPenalty > 0) && (
                      <div className="flex gap-3 mb-4">
                        {totalBonus > 0 && <div className="flex items-center gap-1.5 text-xs bg-green-50 text-green-700 px-3 py-1.5 rounded-full font-semibold"><span>+{formatRupiah(totalBonus)} bonus</span></div>}
                        {totalPenalty > 0 && <div className="flex items-center gap-1.5 text-xs bg-red-50 text-red-700 px-3 py-1.5 rounded-full font-semibold"><span>-{formatRupiah(totalPenalty)} penalti</span></div>}
                      </div>
                    )}
                    <div className="overflow-x-auto rounded-xl border border-slate-200">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50">
                          <tr className="text-left text-slate-500 text-xs">
                            <th className="px-3 py-2.5">Tahap</th>
                            <th className="px-3 py-2.5 text-right">Nominal</th>
                            <th className="px-3 py-2.5 text-center">Lunas</th>
                            <th className="px-3 py-2.5 text-center">Bonus</th>
                            <th className="px-3 py-2.5 text-center">Penalti</th>
                          </tr>
                        </thead>
                        <tbody>
                          {stages.map((stage) => {
                            const ps = summary.paymentStatuses.find((p) => p.stageId === stage.id);
                            const completed = ps?.completed ?? false;
                            const bonus = ps?.bonus ?? 0;
                            const penalty = ps?.penalty ?? 0;
                            const key = `${summary.team.id}_${stage.id}`;
                            const isSaving = savingPayment === key;

                            return (
                              <tr key={stage.id} className={`border-t border-slate-100 ${completed ? "bg-green-50/50" : ""}`}>
                                <td className="px-3 py-2.5"><span className={`font-medium ${completed ? "text-green-700" : "text-slate-700"}`}>{stage.label}</span></td>
                                <td className="px-3 py-2.5 text-right text-slate-600 font-medium">{formatRupiah(stage.nominal)}</td>
                                <td className="px-3 py-2.5 text-center">
                                  <button onClick={() => handleTogglePayment(summary.team.id, stage.id, completed, bonus, penalty)} disabled={isSaving} className={`inline-flex items-center justify-center w-8 h-8 rounded-lg transition-all ${completed ? "bg-green-100 text-green-600 hover:bg-green-200" : "bg-slate-100 text-slate-400 hover:bg-slate-200"} ${isSaving ? "opacity-50" : ""}`}>
                                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : completed ? <CheckCircle className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                                  </button>
                                </td>
                                <td className="px-3 py-2.5 text-center">
                                  <div className="flex items-center justify-center gap-1">
                                    <button onClick={() => handleUpdateBonusPenalty(summary.team.id, stage.id, completed, Math.max(0, bonus - 1), penalty)} disabled={bonus === 0 || isSaving} className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center disabled:opacity-30 text-xs font-bold">−</button>
                                    <span className={`w-5 text-center text-xs font-bold ${bonus > 0 ? "text-green-600" : "text-slate-400"}`}>{bonus > 0 ? `+${bonus}` : "0"}</span>
                                    <button onClick={() => handleUpdateBonusPenalty(summary.team.id, stage.id, completed, bonus + 1, penalty)} disabled={isSaving} className="w-6 h-6 rounded bg-green-100 hover:bg-green-200 text-green-700 flex items-center justify-center text-xs font-bold">+</button>
                                  </div>
                                </td>
                                <td className="px-3 py-2.5 text-center">
                                  <div className="flex items-center justify-center gap-1">
                                    <button onClick={() => handleUpdateBonusPenalty(summary.team.id, stage.id, completed, bonus, Math.max(0, penalty - 1))} disabled={penalty === 0 || isSaving} className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center disabled:opacity-30 text-xs font-bold">−</button>
                                    <span className={`w-5 text-center text-xs font-bold ${penalty > 0 ? "text-red-600" : "text-slate-400"}`}>{penalty > 0 ? `-${penalty}` : "0"}</span>
                                    <button onClick={() => handleUpdateBonusPenalty(summary.team.id, stage.id, completed, bonus, penalty + 1)} disabled={isSaving} className="w-6 h-6 rounded bg-red-100 hover:bg-red-200 text-red-700 flex items-center justify-center text-xs font-bold">+</button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot className="border-t-2 border-slate-200 bg-slate-50">
                          <tr>
                            <td className="px-3 py-2.5 font-bold text-slate-700">TOTAL ANGGARAN</td>
                            <td className="px-3 py-2.5 text-right font-bold text-slate-600">{formatRupiah(stages.reduce((s, st) => s + st.nominal, 0))}</td>
                            <td className="px-3 py-2.5 text-center text-xs text-slate-500">{summary.paymentStatuses.filter((p) => p.completed).length}/{stages.length}</td>
                            <td colSpan={2} className="px-3 py-2.5 text-center font-bold text-green-700">{formatRupiah(summary.totalPendapatan)}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ═══ LEADERBOARD ═══ */}
        {tab === "leaderboard" && (
          <div className="max-w-2xl mx-auto space-y-4">
            <div className="card bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-200">
              <div className="flex items-center gap-3">
                <Trophy className="w-8 h-8 text-yellow-500" />
                <div>
                  <h2 className="font-bold text-slate-800 text-lg">Leaderboard</h2>
                  <p className="text-xs text-slate-500">Ranking berdasarkan keuntungan (Pendapatan − Pengeluaran)</p>
                </div>
              </div>
            </div>
            {summaries.length === 0 ? (
              <div className="card text-center py-12 text-slate-400">
                <Trophy className="w-12 h-12 mx-auto mb-3 opacity-30" /><p>Belum ada tim untuk ditampilkan</p>
              </div>
            ) : (
              <Leaderboard summaries={summaries} settings={settings!} />
            )}
          </div>
        )}

        {/* ═══ KELOLA TIM ═══ */}
        {tab === "teams" && (
          <div className="max-w-lg space-y-4">
            <div className="card">
              <h2 className="font-semibold text-slate-800 mb-4 flex items-center gap-2"><Plus className="w-5 h-5 text-blue-600" /> Tambah Tim Baru</h2>
              <form onSubmit={handleAddTeam} className="flex gap-3">
                <input value={newTeamName} onChange={(e) => setNewTeamName(e.target.value)} className="input-field" placeholder="Nama tim (contoh: Tim Alpha)" />
                <button type="submit" disabled={addingTeam || !newTeamName.trim()} className="btn-primary whitespace-nowrap flex items-center gap-1.5">
                  {addingTeam ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Tambah
                </button>
              </form>
            </div>
            <div className="card">
              <h2 className="font-semibold text-slate-800 mb-4 flex items-center gap-2"><Users className="w-5 h-5 text-blue-600" /> Daftar Tim ({teams.length})</h2>
              {teams.length === 0 ? (
                <p className="text-slate-400 text-sm italic">Belum ada tim</p>
              ) : (
                <div className="space-y-2">
                  {teams.map((team, idx) => {
                    const summary = summaries.find((s) => s.team.id === team.id);
                    return (
                      <div key={team.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                        <div className="flex items-center gap-3">
                          <span className="w-8 h-8 bg-blue-100 text-blue-700 text-sm font-bold rounded-lg flex items-center justify-center">{idx + 1}</span>
                          <div>
                            <p className="font-medium text-slate-700">{team.namaTeam}</p>
                            {summary && <p className="text-xs text-slate-400">{summary.submissions.length} submisi · {formatRupiah(summary.totalPengeluaran)} pengeluaran</p>}
                          </div>
                        </div>
                        <button onClick={() => handleDeleteTeam(team.id, team.namaTeam)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══ BATAS PEMBELIAN ═══ */}
        {tab === "limits" && (
          <div className="space-y-4">
            {/* Info card */}
            <div className="card bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200">
              <div className="flex items-start gap-3">
                <ShieldAlert className="w-7 h-7 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h2 className="font-bold text-slate-800">Batas Pembelian per Tim</h2>
                  <p className="text-xs text-slate-600 mt-1">
                    Batas berlaku kumulatif untuk seluruh hari dan dihitung dalam satuan dasar — baik pembelian satuan maupun paket.
                    Untuk material berpaket, atur batas langsung dalam jumlah paket menggunakan tombol <strong>− / +</strong>, atau ketik jumlah satuan secara manual.
                    Biarkan kosong berarti tidak ada batas.
                  </p>
                </div>
              </div>
            </div>

            {teams.length === 0 ? (
              <div className="card text-center py-12 text-slate-400">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Belum ada tim. Buat tim di tab "Kelola Tim" terlebih dahulu.</p>
              </div>
            ) : (
              <>
                {/* Team selector */}
                <div className="flex gap-2 flex-wrap">
                  {teams.map((team) => (
                    <button
                      key={team.id}
                      onClick={() => setLimitsSelectedTeam(team.id)}
                      className={`px-4 py-2 rounded-xl text-sm font-semibold border-2 transition-colors ${
                        limitsSelectedTeam === team.id
                          ? "border-blue-600 bg-blue-600 text-white"
                          : "border-slate-200 bg-white text-slate-600 hover:border-blue-400"
                      }`}
                    >
                      {team.namaTeam}
                    </button>
                  ))}
                </div>

                {limitsSelectedTeam && (() => {
                  const selectedTeam = teams.find((t) => t.id === limitsSelectedTeam)!;
                  const teamEdit = limitsEdit[limitsSelectedTeam] ?? {};
                  const isSaving = savingLimits === limitsSelectedTeam;
                  const activeCount = Object.values(teamEdit).filter((v) => v !== "" && v !== "0").length;
                  const teamSummary = summaries.find((s) => s.team.id === limitsSelectedTeam);

                  return (
                    <div className="card space-y-5">
                      {/* Card header */}
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-bold text-slate-800 text-lg">{selectedTeam.namaTeam}</h3>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {activeCount > 0
                              ? `${activeCount} dari ${sortedMaterials.length} material dibatasi`
                              : "Semua material belum dibatasi"}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {teams.filter((t) => t.id !== limitsSelectedTeam).length > 0 && (
                            <div className="relative group">
                              <button className="text-xs px-3 py-1.5 rounded-lg border border-slate-300 text-slate-600 hover:border-blue-400 hover:text-blue-600 transition-colors">
                                Salin dari ▾
                              </button>
                              <div className="absolute right-0 top-8 z-20 bg-white border border-slate-200 rounded-xl shadow-lg min-w-36 py-1 hidden group-hover:block">
                                {teams.filter((t) => t.id !== limitsSelectedTeam).map((t) => (
                                  <button
                                    key={t.id}
                                    onClick={() => handleCopyLimits(t.id, limitsSelectedTeam)}
                                    className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-blue-50 hover:text-blue-700"
                                  >
                                    {t.namaTeam}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                          <button
                            onClick={() => handleClearLimits(limitsSelectedTeam)}
                            className="text-xs px-3 py-1.5 rounded-lg border border-slate-300 text-slate-600 hover:border-red-400 hover:text-red-600 transition-colors"
                          >
                            Reset semua
                          </button>
                        </div>
                      </div>

                      {/* Material rows */}
                      <div className="divide-y divide-slate-100">
                        {sortedMaterials.map((mat, i) => {
                          const val = teamEdit[mat.id] ?? "";
                          const maxQty = val === "" ? 0 : Number(val);
                          const boughtQty = teamSummary?.totalPerMaterial[mat.id]?.jumlah ?? 0;
                          const isLimited = maxQty > 0;
                          const isOver = isLimited && boughtQty > maxQty;
                          const isNearLimit = isLimited && !isOver && boughtQty > 0 && boughtQty / maxQty >= 0.8;
                          const pkgs = mat.packages ?? [];
                          // Use the first (primary) package for the stepper
                          const primaryPkg = pkgs[0] ?? null;
                          const stepSize = primaryPkg?.qtyPerPackage ?? 1;
                          // How many "steps" (packages) does the current limit represent?
                          const currentPkgCount = primaryPkg && maxQty > 0 && maxQty % stepSize === 0
                            ? maxQty / stepSize
                            : null;
                          // Package equiv label for the current limit
                          const pkgEquivLabel = currentPkgCount !== null && primaryPkg
                            ? `= ${currentPkgCount} ${primaryPkg.label}`
                            : null;

                          return (
                            <div key={mat.id} className={`py-3 first:pt-0 last:pb-0 ${isOver ? "bg-red-50 -mx-6 px-6 rounded-xl" : ""}`}>
                              <div className="flex items-start gap-3">
                                {/* Index + image */}
                                <div className="flex items-center gap-2 flex-shrink-0 pt-0.5">
                                  <span className="text-xs text-slate-400 w-4 text-right">{i + 1}</span>
                                  {mat.imageUrl
                                    ? <img src={mat.imageUrl} alt={mat.namaKomponen} className="w-8 h-8 rounded-lg object-cover border border-slate-200" />
                                    : <div className="w-8 h-8 rounded-lg bg-slate-100 flex-shrink-0" />
                                  }
                                </div>

                                {/* Name + status */}
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-semibold text-slate-800 truncate">{mat.namaKomponen}</p>
                                  {isLimited ? (
                                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                      <span className={`text-xs font-medium ${isOver ? "text-red-600" : isNearLimit ? "text-amber-600" : "text-slate-500"}`}>
                                        Dibeli: {boughtQty} / {maxQty} {mat.satuan}
                                        {isOver && " — melebihi batas!"}
                                        {isNearLimit && " — hampir habis"}
                                      </span>
                                      {pkgEquivLabel && (
                                        <span className="text-xs text-blue-600 font-medium bg-blue-50 px-1.5 py-0.5 rounded">
                                          {pkgEquivLabel}
                                        </span>
                                      )}
                                    </div>
                                  ) : (
                                    <p className="text-xs text-slate-400 mt-0.5">Tidak dibatasi</p>
                                  )}

                                  {/* Progress bar (only when limited) */}
                                  {isLimited && (
                                    <div className="mt-1.5 w-full bg-slate-200 rounded-full h-1">
                                      <div
                                        className={`h-1 rounded-full transition-all ${isOver ? "bg-red-500" : isNearLimit ? "bg-amber-500" : "bg-blue-500"}`}
                                        style={{ width: `${Math.min((boughtQty / maxQty) * 100, 100)}%` }}
                                      />
                                    </div>
                                  )}
                                </div>

                                {/* Controls */}
                                <div className="flex-shrink-0 flex flex-col items-end gap-1.5">
                                  {/* If material has packages: show a package stepper + raw pcs input */}
                                  {primaryPkg ? (
                                    <div className="flex flex-col items-end gap-1">
                                      {/* Package stepper */}
                                      <div className="flex items-center gap-1">
                                        <span className="text-xs text-slate-500 mr-1">{primaryPkg.label}:</span>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const cur = maxQty;
                                            const next = Math.max(0, cur - stepSize);
                                            setLimitValue(limitsSelectedTeam, mat.id, next === 0 ? "" : String(next));
                                          }}
                                          disabled={maxQty === 0}
                                          className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm flex items-center justify-center disabled:opacity-30 transition-colors"
                                        >−</button>
                                        <span className={`w-8 text-center text-sm font-bold ${currentPkgCount !== null ? "text-blue-700" : "text-slate-400"}`}>
                                          {currentPkgCount ?? "—"}
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const cur = maxQty;
                                            // If current isn't a clean multiple, round up to next multiple first
                                            const next = cur === 0
                                              ? stepSize
                                              : cur % stepSize === 0
                                              ? cur + stepSize
                                              : Math.ceil(cur / stepSize) * stepSize;
                                            setLimitValue(limitsSelectedTeam, mat.id, String(next));
                                          }}
                                          className="w-7 h-7 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-700 font-bold text-sm flex items-center justify-center transition-colors"
                                        >+</button>
                                      </div>
                                      {/* Raw pcs override input */}
                                      <div className="flex items-center gap-1">
                                        <span className="text-xs text-slate-400">atau</span>
                                        <input
                                          type="text"
                                          inputMode="numeric"
                                          value={val}
                                          onChange={(e) => setLimitValue(limitsSelectedTeam, mat.id, e.target.value)}
                                          placeholder="bebas"
                                          className={`w-16 text-center border rounded-lg px-1.5 py-1 text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                                            isLimited
                                              ? "border-blue-400 bg-blue-50 text-blue-800 font-semibold"
                                              : "border-slate-300 text-slate-400"
                                          }`}
                                        />
                                        <span className="text-xs text-slate-400">{mat.satuan}</span>
                                      </div>
                                    </div>
                                  ) : (
                                    /* No packages: just a plain pcs input */
                                    <div className="flex items-center gap-1.5">
                                      <input
                                        type="text"
                                        inputMode="numeric"
                                        value={val}
                                        onChange={(e) => setLimitValue(limitsSelectedTeam, mat.id, e.target.value)}
                                        placeholder="Bebas"
                                        className={`w-20 text-center border rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                                          isLimited
                                            ? "border-blue-400 bg-blue-50 text-blue-800 font-semibold"
                                            : "border-slate-300 text-slate-500"
                                        }`}
                                      />
                                      <span className="text-xs text-slate-500">{mat.satuan}</span>
                                    </div>
                                  )}
                                  {/* Clear limit link */}
                                  {isLimited && (
                                    <button
                                      type="button"
                                      onClick={() => setLimitValue(limitsSelectedTeam, mat.id, "")}
                                      className="text-xs text-slate-400 hover:text-red-500 transition-colors"
                                    >
                                      Hapus batas
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                        <p className="text-xs text-slate-400">
                          Batas berlaku setelah disimpan. Tim tidak bisa submit jika melebihi batas.
                        </p>
                        <button
                          onClick={() => handleSaveLimits(limitsSelectedTeam)}
                          disabled={isSaving}
                          className="btn-primary flex items-center gap-2"
                        >
                          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                          {isSaving ? "Menyimpan..." : "Simpan Batas"}
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </>
            )}
          </div>
        )}

        {/* ═══ PENGATURAN ═══ */}
        {tab === "settings" && (
          <div className="space-y-5 max-w-2xl">
            <form onSubmit={handleSaveSettings} className="space-y-5">

              {/* Workshop info */}
              <div className="card space-y-4">
                <h2 className="font-semibold text-slate-800 flex items-center gap-2"><Settings className="w-5 h-5 text-blue-600" /> Pengaturan Workshop</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Nama Workshop</label>
                    <input className="input-field" value={settingsForm.namaWorkshop ?? ""} onChange={(e) => setSettingsForm((p) => ({ ...p, namaWorkshop: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Jumlah Hari</label>
                    <input type="number" min="1" className="input-field" value={settingsForm.jumlahHari ?? ""} onChange={(e) => setSettingsForm((p) => ({ ...p, jumlahHari: Number(e.target.value) }))} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Password Admin</label>
                    <input type="text" className="input-field" value={settingsForm.adminPassword ?? ""} onChange={(e) => setSettingsForm((p) => ({ ...p, adminPassword: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Total Nilai Project (Rp)</label>
                    <input type="number" className="input-field" value={settingsForm.maxPengeluaran ?? ""} onChange={(e) => setSettingsForm((p) => ({ ...p, maxPengeluaran: Number(e.target.value) }))} />
                    <p className="text-xs text-slate-400 mt-1">{formatRupiah(settingsForm.maxPengeluaran ?? 0)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Maksimal Pengeluaran (Rp)</label>
                    <input type="number" className="input-field" value={settingsForm.jumlahPendapatan ?? ""} onChange={(e) => setSettingsForm((p) => ({ ...p, jumlahPendapatan: Number(e.target.value) }))} />
                    <p className="text-xs text-slate-400 mt-1">{formatRupiah(settingsForm.jumlahPendapatan ?? 0)}</p>
                  </div>
                </div>
              </div>

              {/* Cloudinary */}
              <div className="card space-y-4">
                <h2 className="font-semibold text-slate-800 flex items-center gap-2"><CloudOff className="w-5 h-5 text-blue-600" /> Konfigurasi Cloudinary</h2>
                <p className="text-xs text-slate-500">Diperlukan untuk mengupload gambar material. Buat akun gratis di <a href="https://cloudinary.com" target="_blank" rel="noreferrer" className="text-blue-600 underline">cloudinary.com</a>, lalu buat <strong>unsigned upload preset</strong>.</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Cloud Name</label>
                    <input className="input-field" placeholder="contoh: my-cloud" value={settingsForm.cloudinaryCloudName ?? ""} onChange={(e) => setSettingsForm((p) => ({ ...p, cloudinaryCloudName: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Upload Preset (unsigned)</label>
                    <input className="input-field" placeholder="contoh: brics_unsigned" value={settingsForm.cloudinaryUploadPreset ?? ""} onChange={(e) => setSettingsForm((p) => ({ ...p, cloudinaryUploadPreset: e.target.value }))} />
                  </div>
                </div>
              </div>

              {/* Payment Stages */}
              <div className="card">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold text-slate-800 flex items-center gap-2"><CreditCard className="w-5 h-5 text-blue-600" /> Tahapan Pembayaran</h2>
                  <button type="button" onClick={addPaymentStage} className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium"><Plus className="w-4 h-4" /> Tambah Tahap</button>
                </div>
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr className="text-left text-slate-500 text-xs">
                        <th className="px-3 py-2.5">#</th>
                        <th className="px-3 py-2.5">Label</th>
                        <th className="px-3 py-2.5 w-40">Nominal (Rp)</th>
                        <th className="px-3 py-2.5 w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {settingsForm.paymentStages?.map((s, i) => (
                        <tr key={s.id} className="border-t border-slate-100">
                          <td className="px-3 py-1.5 text-slate-400 text-xs">{i + 1}</td>
                          <td className="px-3 py-1.5"><input className="input-field text-xs" value={s.label} onChange={(e) => updateStage(i, "label", e.target.value)} /></td>
                          <td className="px-3 py-1.5"><input type="number" className="input-field text-xs" value={s.nominal} onChange={(e) => updateStage(i, "nominal", e.target.value)} /></td>
                          <td className="px-3 py-1.5"><button type="button" onClick={() => removePaymentStage(i)} className="p-1 text-red-400 hover:text-red-600 rounded"><Trash2 className="w-3.5 h-3.5" /></button></td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                      <tr>
                        <td className="px-3 py-2.5 font-bold text-slate-700" colSpan={2}>TOTAL</td>
                        <td className="px-3 py-2.5 font-bold text-blue-700 text-xs">{formatRupiah(settingsForm.paymentStages?.reduce((s, p) => s + p.nominal, 0) ?? 0)}</td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>
                <p className="text-xs text-slate-400 mt-2">⚠️ Perubahan nominal tidak mempengaruhi pembayaran yang sudah dicatat.</p>
              </div>

              {/* Materials + Packages */}
              <div className="card">
                <h2 className="font-semibold text-slate-800 mb-1 flex items-center gap-2"><Package className="w-5 h-5 text-blue-600" /> Data Material & SDM</h2>
                <p className="text-xs text-slate-500 mb-4">Seret baris (≡) untuk mengurutkan ulang. Klik ikon gambar untuk foto. Klik <Tag className="inline w-3 h-3" /> untuk mengatur opsi paket per material.</p>

                <div className="space-y-2">
                  {settingsForm.materials?.map((m, i) => {
                    const isDragging = drag.draggingIdx === i;
                    const isOver = drag.overIdx === i && drag.draggingIdx !== i;
                    const uploading = uploadState[i] === "uploading";
                    const isPkgExpanded = expandedPackageIdx === i;
                    const pkgCount = (m.packages ?? []).length;

                    return (
                      <div
                        key={m.id}
                        draggable
                        onDragStart={() => handleDragStart(i)}
                        onDragEnter={() => handleDragEnter(i)}
                        onDragOver={(e) => e.preventDefault()}
                        onDragEnd={handleDragEnd}
                        className={`rounded-xl border transition-all select-none
                          ${isDragging ? "opacity-40 scale-95 bg-blue-50 border-blue-300" : ""}
                          ${isOver ? "border-blue-400 bg-blue-50 shadow-md" : "border-slate-200 bg-white"}
                        `}
                      >
                        {/* Main row */}
                        <div className="flex items-center gap-2 p-2">
                          <button type="button" className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 px-1 flex-shrink-0" title="Seret untuk mengurutkan">
                            <GripVertical className="w-4 h-4" />
                          </button>
                          <span className="text-xs text-slate-400 w-5 text-center flex-shrink-0">{i + 1}</span>

                          {/* Image */}
                          <div className="relative flex-shrink-0">
                            {m.imageUrl ? (
                              <div className="relative group">
                                <img src={m.imageUrl} alt={m.namaKomponen} className="w-10 h-10 rounded-lg object-cover border border-slate-200" />
                                <button type="button" onClick={() => removeMaterialImage(i)} className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full hidden group-hover:flex items-center justify-center"><X className="w-2.5 h-2.5" /></button>
                              </div>
                            ) : (
                              <label className={`w-10 h-10 rounded-lg border-2 border-dashed flex items-center justify-center cursor-pointer transition-colors ${uploading ? "border-blue-400 bg-blue-50" : "border-slate-300 hover:border-blue-400 hover:bg-blue-50"}`}>
                                {uploading ? <Loader2 className="w-4 h-4 animate-spin text-blue-500" /> : <Upload className="w-4 h-4 text-slate-400" />}
                                <input type="file" accept="image/*" className="hidden" disabled={uploading} onChange={(e) => { const file = e.target.files?.[0]; if (file) handleImageUpload(i, file); e.target.value = ""; }} />
                              </label>
                            )}
                          </div>

                          <input className="input-field text-xs flex-1 min-w-0" value={m.namaKomponen} onChange={(e) => updateMaterial(i, "namaKomponen", e.target.value)} />
                          <input className="input-field text-xs w-20 flex-shrink-0" value={m.satuan} onChange={(e) => updateMaterial(i, "satuan", e.target.value)} />
                          <input type="number" className="input-field text-xs w-28 flex-shrink-0" value={m.hargaPerPcs} onChange={(e) => updateMaterial(i, "hargaPerPcs", e.target.value)} />

                          {/* Package toggle button */}
                          <button
                            type="button"
                            onClick={() => setExpandedPackageIdx(isPkgExpanded ? null : i)}
                            title="Kelola opsi paket"
                            className={`flex items-center gap-1 text-xs px-2 py-1.5 rounded-lg border transition-colors flex-shrink-0 ${
                              pkgCount > 0
                                ? "border-blue-400 bg-blue-50 text-blue-700 hover:bg-blue-100"
                                : "border-slate-300 text-slate-500 hover:border-blue-400 hover:text-blue-600"
                            }`}
                          >
                            <Tag className="w-3.5 h-3.5" />
                            {pkgCount > 0 && <span className="font-semibold">{pkgCount}</span>}
                          </button>
                        </div>

                        {/* Package panel */}
                        {isPkgExpanded && (
                          <div className="border-t border-slate-200 bg-blue-50/40 px-4 py-3 space-y-2">
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-semibold text-blue-700 flex items-center gap-1.5">
                                <Tag className="w-3.5 h-3.5" /> Opsi Paket untuk {m.namaKomponen}
                              </p>
                              <button type="button" onClick={() => addPackage(i)} className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-semibold">
                                <Plus className="w-3.5 h-3.5" /> Tambah Paket
                              </button>
                            </div>

                            {(m.packages ?? []).length === 0 ? (
                              <p className="text-xs text-slate-400 italic py-1">Belum ada opsi paket. Material hanya bisa dibeli satuan.</p>
                            ) : (
                              <div className="space-y-2">
                                {(m.packages ?? []).map((pkg, pkgIdx) => (
                                  <div key={pkg.id} className="flex items-center gap-2 bg-white rounded-lg p-2 border border-slate-200">
                                    <div className="flex-1 min-w-0">
                                      <input
                                        className="input-field text-xs w-full mb-1"
                                        placeholder="Label paket (contoh: Per 10 Pcs)"
                                        value={pkg.label}
                                        onChange={(e) => updatePackage(i, pkgIdx, "label", e.target.value)}
                                      />
                                      <div className="flex gap-2">
                                        <div className="flex-1">
                                          <label className="text-xs text-slate-400">Isi per paket ({m.satuan})</label>
                                          <input
                                            type="number"
                                            min="1"
                                            className="input-field text-xs w-full"
                                            placeholder="10"
                                            value={pkg.qtyPerPackage || ""}
                                            onChange={(e) => updatePackage(i, pkgIdx, "qtyPerPackage", e.target.value)}
                                          />
                                        </div>
                                        <div className="flex-1">
                                          <label className="text-xs text-slate-400">Harga per paket (Rp)</label>
                                          <input
                                            type="number"
                                            min="0"
                                            className="input-field text-xs w-full"
                                            placeholder="50000"
                                            value={pkg.hargaPerPackage || ""}
                                            onChange={(e) => updatePackage(i, pkgIdx, "hargaPerPackage", e.target.value)}
                                          />
                                        </div>
                                      </div>
                                      {pkg.qtyPerPackage > 0 && pkg.hargaPerPackage > 0 && (
                                        <p className="text-xs text-slate-400 mt-1">
                                          Efektif: {formatRupiah(Math.round(pkg.hargaPerPackage / pkg.qtyPerPackage))}/{m.satuan}
                                          {" "} vs satuan {formatRupiah(m.hargaPerPcs)}/{m.satuan}
                                          {pkg.hargaPerPackage / pkg.qtyPerPackage < m.hargaPerPcs && (
                                            <span className="ml-1 text-green-600 font-semibold">✓ Lebih hemat</span>
                                          )}
                                        </p>
                                      )}
                                    </div>
                                    <button type="button" onClick={() => removePackage(i, pkgIdx)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg flex-shrink-0">
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center gap-2 mt-2 px-2 text-xs text-slate-400">
                  <span className="w-4 flex-shrink-0" />
                  <span className="w-5 flex-shrink-0" />
                  <span className="w-10 flex-shrink-0 text-center">Foto</span>
                  <span className="flex-1">Nama Komponen</span>
                  <span className="w-20 flex-shrink-0">Satuan</span>
                  <span className="w-28 flex-shrink-0">Harga/Satuan (Rp)</span>
                  <span className="w-12 flex-shrink-0 text-center">Paket</span>
                </div>
                <p className="text-xs text-slate-400 mt-3">⚠️ Perubahan harga tidak mempengaruhi submission yang sudah ada.</p>
              </div>

              <button type="submit" disabled={savingSettings} className="btn-primary flex items-center gap-2">
                {savingSettings ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {savingSettings ? "Menyimpan..." : "Simpan Semua Pengaturan"}
              </button>
            </form>

            {/* Danger Zone */}
            <div className="card border-red-200 bg-red-50/50">
              <h2 className="font-semibold text-red-700 flex items-center gap-2 mb-1"><RotateCcw className="w-5 h-5" /> Reset Data Transaksi</h2>
              <p className="text-xs text-slate-600 mb-4">Hapus semua riwayat pembelian dan status pembayaran dari seluruh tim. Pengaturan workshop, daftar tim, dan data material <strong>tidak akan berubah</strong>. Gunakan fitur ini untuk memulai ulang workshop dengan template yang sama.</p>
              <div className="flex items-center justify-between">
                <div className="text-xs text-slate-500">
                  {totalSubmissions > 0 ? (
                    <span className="font-semibold text-red-600">{totalSubmissions} submission aktif</span>
                  ) : (
                    <span className="text-green-600 font-semibold">Tidak ada data transaksi</span>
                  )}{" "}dari {teams.length} tim
                </div>
                <button type="button" onClick={handleResetSubmissions} disabled={resetting || totalSubmissions === 0} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                  {resetting ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                  {resetting ? "Mereset..." : "Reset Transaksi"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}