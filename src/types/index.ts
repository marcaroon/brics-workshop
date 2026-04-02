// src/types/index.ts

export interface MaterialItem {
  id: string;
  namaKomponen: string;
  satuan: string;
  hargaPerPcs: number;
  imageUrl?: string; // Cloudinary URL
  order?: number;    // for drag-to-reorder
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
  // maxPengeluaran = budget cap (reference only — shown on admin)
  maxPengeluaran: number;
  // jumlahPendapatan = Total Project Value (reference only — shown on admin)
  jumlahPendapatan: number;
  adminPassword: string;
  materials: MaterialItem[];
  paymentStages: PaymentStage[];
  // Cloudinary config (stored in settings so it's accessible client-side)
  cloudinaryCloudName?: string;
  cloudinaryUploadPreset?: string;
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
