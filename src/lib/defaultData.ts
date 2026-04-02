// src/lib/defaultData.ts
import { MaterialItem, PaymentStage } from "@/types";

export const DEFAULT_MATERIALS: Omit<MaterialItem, "id">[] = [
  { namaKomponen: "Komponen A (Bata Kecil)", satuan: "Pcs", hargaPerPcs: 5000 },
  {
    namaKomponen: "Komponen B (Bata Besar)",
    satuan: "Pcs",
    hargaPerPcs: 10000,
  },
  {
    namaKomponen: "Komponen C (Tiang Penyangga)",
    satuan: "Pcs",
    hargaPerPcs: 50000,
  },
  { namaKomponen: "Komponen D (Kanal C)", satuan: "Pcs", hargaPerPcs: 100000 },
  {
    namaKomponen: "Komponen E (Bata Penyangga)",
    satuan: "Pcs",
    hargaPerPcs: 45000,
  },
  { namaKomponen: "Komponen F (Pagar)", satuan: "Pcs", hargaPerPcs: 150000 },
  { namaKomponen: "Komponen G (Tiang)", satuan: "Pcs", hargaPerPcs: 125000 },
  { namaKomponen: "Komponen H (Atap)", satuan: "Pcs", hargaPerPcs: 200000 },
  { namaKomponen: "Komponen I (Atap)", satuan: "Pcs", hargaPerPcs: 175000 },
  { namaKomponen: "Semen", satuan: "Sak", hargaPerPcs: 35000 },
  { namaKomponen: "Cat", satuan: "Pil", hargaPerPcs: 110000 },
  { namaKomponen: "Alat", satuan: "Pcs", hargaPerPcs: 65000 },
  { namaKomponen: "Pintu", satuan: "Pcs", hargaPerPcs: 600000 },
  { namaKomponen: "Jendela", satuan: "Pcs", hargaPerPcs: 350000 },
  { namaKomponen: "Fondasi Lantai 1", satuan: "Pcs", hargaPerPcs: 1750000 },
  { namaKomponen: "Fondasi Lantai 2", satuan: "Pcs", hargaPerPcs: 1500000 },
  { namaKomponen: "Fondasi Lantai 3", satuan: "Pcs", hargaPerPcs: 1450000 },
  { namaKomponen: "Pekerja", satuan: "Org/Hari", hargaPerPcs: 55000 },
];

export const DEFAULT_PAYMENT_STAGES: PaymentStage[] = [
  { id: "dp", label: "DP", nominal: 6200000 },
  { id: "stage-1", label: "Tahap 1", nominal: 1800000 },
  { id: "stage-2", label: "Tahap 2", nominal: 2000000 },
  { id: "stage-3", label: "Tahap 3", nominal: 1500000 },
  { id: "stage-4", label: "Tahap 4", nominal: 2250000 },
  { id: "stage-5", label: "Tahap 5", nominal: 550000 },
  { id: "stage-6", label: "Tahap 6", nominal: 1250000 },
  { id: "stage-7", label: "Tahap 7", nominal: 1000000 },
  { id: "stage-8", label: "Tahap 8", nominal: 1150000 },
  { id: "stage-9", label: "Tahap 9", nominal: 2500000 },
  { id: "stage-10", label: "Tahap 10", nominal: 1500000 },
  { id: "stage-11", label: "Tahap 11", nominal: 500000 },
  { id: "stage-12", label: "Tahap 12", nominal: 2250000 },
  { id: "stage-13", label: "Tahap 13", nominal: 1250000 },
  { id: "stage-14", label: "Tahap 14", nominal: 750000 },
  { id: "stage-15", label: "Tahap 15", nominal: 1250000 },
  { id: "stage-16", label: "Tahap 16", nominal: 1500000 },
  { id: "stage-17", label: "Tahap 17", nominal: 800000 },
  { id: "stage-18", label: "Tahap 18", nominal: 1000000 },
];

export const DEFAULT_SETTINGS = {
  namaWorkshop: "Workshop Simulasi BRICS",
  jumlahHari: 5,
  maxPengeluaran: 21700000,
  jumlahPendapatan: 31000000,
  adminPassword: "admin123",
};

export const WORKSHOP_ID = "main-workshop";
export const BONUS_PENALTY_VALUE = 1000000;
