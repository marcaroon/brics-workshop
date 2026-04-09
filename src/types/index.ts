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
 * purchase limits per team.
 * stored as a map: materialId → maxQty (in base units, i.e. satuan).
 * a value of 0 or undefined means unlimited.
 * stored in Firestore as collection "teamLimits", doc id = teamId.
 */
export interface TeamLimits {
  teamId: string;
  workshopId: string;
  limits: Record<string, number>; // materialId → maxQty (0 = unlimited)
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
