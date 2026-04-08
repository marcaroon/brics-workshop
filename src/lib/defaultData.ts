// src/lib/defaultData.ts
import { MaterialItem, PaymentStage } from "@/types";

export const DEFAULT_MATERIALS: Omit<MaterialItem, "id">[] = [
  {
    namaKomponen: "Komponen A (Bata Kecil)",
    satuan: "Pcs",
    hargaPerPcs: 6000,
    order: 0,
    packages: [
      { id: "pkg-a-0", label: "Per 10 Pcs", qtyPerPackage: 10, hargaPerPackage: 50000 },
    ],
  },
  {
    namaKomponen: "Komponen B (Bata Besar)",
    satuan: "Pcs",
    hargaPerPcs: 3000,
    order: 1,
    packages: [
      { id: "pkg-b-0", label: "Per 50 Pcs", qtyPerPackage: 50, hargaPerPackage: 100000 },
    ],
  },
  {
    namaKomponen: "Komponen C (Tiang Penyangga)",
    satuan: "Pcs",
    hargaPerPcs: 60000,
    order: 2,
    packages: [
      { id: "pkg-c-0", label: "Per 12 Pcs", qtyPerPackage: 12, hargaPerPackage: 600000 },
    ],
  },
  {
    namaKomponen: "Komponen D (Kanal C)",
    satuan: "Pcs",
    hargaPerPcs: 12000,
    order: 3,
    packages: [
      { id: "pkg-d-0", label: "Per 10 Pcs", qtyPerPackage: 10, hargaPerPackage: 100000 },
    ],
  },
  {
    namaKomponen: "Komponen E (Bata Penyangga)",
    satuan: "Pcs",
    hargaPerPcs: 50000,
    order: 4,
    packages: [
      { id: "pkg-e-0", label: "Per 3 Pcs", qtyPerPackage: 3, hargaPerPackage: 135000 },
    ],
  },
  {
    namaKomponen: "Komponen F (Pagar)",
    satuan: "Pcs",
    hargaPerPcs: 175000,
    order: 5,
    packages: [
      { id: "pkg-f-0", label: "Per 4 Pcs", qtyPerPackage: 4, hargaPerPackage: 600000 },
    ],
  },
  {
    namaKomponen: "Komponen G (Tiang)",
    satuan: "Pcs",
    hargaPerPcs: 140000,
    order: 6,
    packages: [
      { id: "pkg-g-0", label: "Per 11 Pcs", qtyPerPackage: 11, hargaPerPackage: 1375000 },
    ],
  },
  {
    namaKomponen: "Komponen H (Atap)",
    satuan: "Pcs",
    hargaPerPcs: 300000,
    order: 7,
    packages: [
      { id: "pkg-h-0", label: "Per 6 Pcs", qtyPerPackage: 6, hargaPerPackage: 1200000 },
    ],
  },
  {
    namaKomponen: "Komponen I (Atap)",
    satuan: "Pcs",
    hargaPerPcs: 175000,
    order: 8,
    // no package for this one in the Excel
  },
  {
    namaKomponen: "Semen",
    satuan: "Sak",
    hargaPerPcs: 35000,
    order: 9,
  },
  {
    namaKomponen: "Cat",
    satuan: "Pil",
    hargaPerPcs: 110000,
    order: 10,
  },
  {
    namaKomponen: "Alat",
    satuan: "Pcs",
    hargaPerPcs: 65000,
    order: 11,
  },
  {
    namaKomponen: "Pintu",
    satuan: "Pcs",
    hargaPerPcs: 600000,
    order: 12,
  },
  {
    namaKomponen: "Jendela",
    satuan: "Pcs",
    hargaPerPcs: 450000,
    order: 13,
  },
  {
    namaKomponen: "Fondasi Lantai 1",
    satuan: "Pcs",
    hargaPerPcs: 1750000,
    order: 14,
  },
  {
    namaKomponen: "Fondasi Lantai 2",
    satuan: "Pcs",
    hargaPerPcs: 1500000,
    order: 15,
  },
  {
    namaKomponen: "Fondasi Lantai 3",
    satuan: "Pcs",
    hargaPerPcs: 1450000,
    order: 16,
  },
  {
    namaKomponen: "Pekerja",
    satuan: "Org/Hari",
    hargaPerPcs: 55000,
    order: 17,
  },
];

export const DEFAULT_PAYMENT_STAGES: PaymentStage[] = [
  { id: "dp",       label: "DP",       nominal: 6200000 },
  { id: "stage-1",  label: "Tahap 1",  nominal: 1800000 },
  { id: "stage-2",  label: "Tahap 2",  nominal: 2000000 },
  { id: "stage-3",  label: "Tahap 3",  nominal: 1500000 },
  { id: "stage-4",  label: "Tahap 4",  nominal: 2250000 },
  { id: "stage-5",  label: "Tahap 5",  nominal: 550000  },
  { id: "stage-6",  label: "Tahap 6",  nominal: 1250000 },
  { id: "stage-7",  label: "Tahap 7",  nominal: 1000000 },
  { id: "stage-8",  label: "Tahap 8",  nominal: 1150000 },
  { id: "stage-9",  label: "Tahap 9",  nominal: 2500000 },
  { id: "stage-10", label: "Tahap 10", nominal: 1500000 },
  { id: "stage-11", label: "Tahap 11", nominal: 500000  },
  { id: "stage-12", label: "Tahap 12", nominal: 2250000 },
  { id: "stage-13", label: "Tahap 13", nominal: 1250000 },
  { id: "stage-14", label: "Tahap 14", nominal: 750000  },
  { id: "stage-15", label: "Tahap 15", nominal: 1250000 },
  { id: "stage-16", label: "Tahap 16", nominal: 1500000 },
  { id: "stage-17", label: "Tahap 17", nominal: 800000  },
  { id: "stage-18", label: "Tahap 18", nominal: 1000000 },
];

export const DEFAULT_SETTINGS = {
  namaWorkshop: "Workshop Simulasi BRICS",
  jumlahHari: 5,
  maxPengeluaran: 21700000,
  jumlahPendapatan: 31000000,
  adminPassword: "admin123",
  cloudinaryCloudName: "",
  cloudinaryUploadPreset: "",
};

export const WORKSHOP_ID = "main-workshop";
export const BONUS_PENALTY_VALUE = 1000000;
