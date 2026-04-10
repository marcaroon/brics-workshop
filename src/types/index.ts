export interface PackageOption {
  id: string; // eg "pkg-mat-1-0"
  label: string; // eg "Per 10 Pcs"
  qtyPerPackage: number; // how many individual units in 1 package
  hargaPerPackage: number; // total price per package
}

export interface MaterialItem {
  id: string;
  namaKomponen: string;
  satuan: string;
  hargaPerPcs: number;
  packages?: PackageOption[]; // optional: package purchase options
  imageUrl?: string; // cloudinary URL
  order?: number; // for drag-to-reorder
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
  bonus: number;
  penalty: number;
}

/**
 * Per-material purchase limits for a team.
 *
 * Each material can have:
 *   - `packageLimits`: a map of packageId → max number of *packages* that
 *     can be purchased for that package option (cumulative across all days).
 *   - `unitLimit`: max number of individual units (satuan) that can be
 *     purchased in retail/satuan mode (cumulative across all days).
 *
 * A value of 0 or a missing key means unlimited for that mode.
 *
 * Example — "Large Brick":
 *   packageLimits: { "pkg-b-0": 7 }   → max 7 packs of 50 pcs
 *   unitLimit: 10                       → max 10 loose pcs
 *
 * Stored in Firestore collection "teamLimits", doc id = teamId.
 */
export interface MaterialLimit {
  packageLimits?: Record<string, number>; // packageId → max packages (0 = unlimited)
  unitLimit?: number; // max pcs in retail mode (0 = unlimited)
}

export interface TeamLimits {
  teamId: string;
  workshopId: string;
  limits: Record<string, MaterialLimit>; // materialId → MaterialLimit
}

export interface WorkshopSettings {
  id: string;
  namaWorkshop: string;
  jumlahHari: number;
  maxPengeluaran: number;
  jumlahPendapatan: number;
  adminPassword: string;
  materials: MaterialItem[];
  paymentStages: PaymentStage[];
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
  // package info (populated when bought as package)
  isPackage?: boolean;
  packageLabel?: string;
  qtyPerPackage?: number;
  packageCount?: number; // how many packages bought
  packageId?: string; // which PackageOption was used
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
  totalPendapatan: number;
  totalPerMaterial: Record<
    string,
    { jumlah: number; total: number; nama: string; satuan: string }
  >;
  paymentStatuses: TeamPaymentStatus[];
}