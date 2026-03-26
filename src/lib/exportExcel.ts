// src/lib/exportExcel.ts
import { TeamSummary, WorkshopSettings } from "@/types";
import { formatRupiah } from "./utils";

// Export rekap all teams as CSV (works without external library)
export function exportRekapCSV(summaries: TeamSummary[], settings: WorkshopSettings) {
  const rows: string[][] = [];

  // Header info
  rows.push([settings.namaWorkshop]);
  rows.push([`Total Nilai Project: ${formatRupiah(settings.jumlahPendapatan)}`]);
  rows.push([`Maks Pengeluaran: ${formatRupiah(settings.maxPengeluaran)}`]);
  rows.push([]);

  // Per team
  summaries.forEach((summary, idx) => {
    const keuntungan = settings.jumlahPendapatan - summary.totalPengeluaran;

    rows.push([`=== ${summary.team.namaTeam} ===`]);
    rows.push(["Total Pengeluaran", formatRupiah(summary.totalPengeluaran)]);
    rows.push(["Keuntungan", formatRupiah(keuntungan)]);
    rows.push([]);

    // Per day
    rows.push(["RIWAYAT PER HARI"]);
    rows.push(["Hari", "Material / SDM", "Jumlah", "Satuan", "Harga Satuan", "Total"]);
    summary.submissions.forEach(sub => {
      sub.entries.forEach(e => {
        rows.push([
          `Hari ${sub.hari}`,
          e.namaKomponen,
          String(e.jumlah),
          e.satuan,
          formatRupiah(e.hargaPerPcs),
          formatRupiah(e.totalHarga),
        ]);
      });
      rows.push([`Hari ${sub.hari} - TOTAL`, "", "", "", "", formatRupiah(sub.totalHari)]);
    });

    rows.push([]);

    // Material summary
    rows.push(["REKAPAN MATERIAL & SDM"]);
    rows.push(["Nama Komponen", "Total Jumlah", "Satuan", "Total Biaya"]);
    Object.values(summary.totalPerMaterial).forEach(m => {
      rows.push([m.nama, String(m.jumlah), m.satuan, formatRupiah(m.total)]);
    });

    rows.push([]);
    rows.push([]);
  });

  // Leaderboard
  const ranked = [...summaries].sort((a, b) =>
    (settings.jumlahPendapatan - a.totalPengeluaran) > (settings.jumlahPendapatan - b.totalPengeluaran) ? -1 : 1
  );
  rows.push(["=== LEADERBOARD ==="]);
  rows.push(["Peringkat", "Nama Tim", "Total Pengeluaran", "Keuntungan", "Status"]);
  ranked.forEach((s, i) => {
    const k = settings.jumlahPendapatan - s.totalPengeluaran;
    const over = s.totalPengeluaran > settings.maxPengeluaran;
    rows.push([
      String(i + 1),
      s.team.namaTeam,
      formatRupiah(s.totalPengeluaran),
      formatRupiah(k),
      over ? "MELEBIHI BATAS" : "AMAN",
    ]);
  });

  // Convert to CSV string
  const csv = rows.map(row =>
    row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(",")
  ).join("\n");

  // BOM for Excel to recognize UTF-8
  const bom = "\uFEFF";
  const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `Rekap_Workshop_BRICS_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
