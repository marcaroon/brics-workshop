// src/types/index.ts

export interface MaterialItem {
  id: string;
  namaKomponen: string;
  satuan: string;
  hargaPerPcs: number;
}

export interface WorkshopSettings {
  id: string;
  namaWorkshop: string;
  jumlahHari: number;
  maxPengeluaran: number;
  jumlahPendapatan: number; // Total Nilai Project
  adminPassword: string;
  materials: MaterialItem[];
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
  hari: number; // Day number (1, 2, 3, ...)
  entries: PurchaseEntry[];
  totalHari: number;
  submittedAt?: unknown;
  locked: boolean;
}

export interface TeamSummary {
  team: Team;
  submissions: DailySubmission[];
  totalPengeluaran: number;
  totalPerMaterial: Record<string, { jumlah: number; total: number; nama: string; satuan: string }>;
}
