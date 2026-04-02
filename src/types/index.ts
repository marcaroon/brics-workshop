// src/types/index.ts

export interface MaterialItem {
  id: string;
  namaKomponen: string;
  satuan: string;
  hargaPerPcs: number;
}

export interface PaymentStage {
  id: string; // "dp" | "stage-1" | "stage-2" | ...
  label: string; // "DP" | "Tahap 1" | ...
  nominal: number;
}

export interface TeamPaymentStatus {
  teamId: string;
  stageId: string;
  completed: boolean;
  completedAt?: unknown;
  // bonus/penalty applied at this stage for this team
  bonus: number; // positive = bonus added (multiples of 1_000_000)
  penalty: number; // positive = penalty deducted (multiples of 1_000_000)
}

export interface WorkshopSettings {
  id: string;
  namaWorkshop: string;
  jumlahHari: number;
  maxPengeluaran: number;
  jumlahPendapatan: number; // Total Nilai Project (base, before stage payments)
  adminPassword: string;
  materials: MaterialItem[];
  paymentStages: PaymentStage[];
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface Team {
  id: string;
  namaTeam: string;
  workshopId: string;
  createdAt?: unknown;
}

export interface PurchaseEntry {
  materialId: string;
  namaKomponen: string;
  satuan: string;
  hargaPerPcs: number;
  jumlah: number;
  totalHarga: number;
}

export interface DailySubmission {
  id: string;
  teamId: string;
  workshopId: string;
  hari: number;
  entries: PurchaseEntry[];
  totalHari: number;
  submittedAt?: unknown;
  locked: boolean;
}

export interface TeamSummary {
  team: Team;
  submissions: DailySubmission[];
  totalPengeluaran: number;
  totalPendapatan: number; // sum of completed stage nominals + bonuses - penalties
  totalPerMaterial: Record<
    string,
    { jumlah: number; total: number; nama: string; satuan: string }
  >;
  paymentStatuses: TeamPaymentStatus[];
}
