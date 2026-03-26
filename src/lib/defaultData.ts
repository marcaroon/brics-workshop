// src/lib/defaultData.ts
import { MaterialItem } from "@/types";

export const DEFAULT_MATERIALS: Omit<MaterialItem, "id">[] = [
  { namaKomponen: "Komponen A (Bata Kecil)", satuan: "Pcs", hargaPerPcs: 5000 },
  { namaKomponen: "Komponen B (Bata Besar)", satuan: "Pcs", hargaPerPcs: 10000 },
  { namaKomponen: "Komponen C (Tiang Penyangga)", satuan: "Pcs", hargaPerPcs: 50000 },
  { namaKomponen: "Komponen D (Kanal C)", satuan: "Pcs", hargaPerPcs: 100000 },
  { namaKomponen: "Komponen E (Bata Penyangga)", satuan: "Pcs", hargaPerPcs: 45000 },
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

export const DEFAULT_SETTINGS = {
  namaWorkshop: "Workshop Simulasi BRICS",
  jumlahHari: 5,
  maxPengeluaran: 21700000,
  jumlahPendapatan: 31000000,
  adminPassword: "admin123",
};

export const WORKSHOP_ID = "main-workshop";
