// src/lib/exportExcel.ts
import { TeamSummary, WorkshopSettings } from "@/types";
import { formatRupiah } from "./utils";
import { BONUS_PENALTY_VALUE } from "./defaultData";

export function exportRekapCSV(
  summaries: TeamSummary[],
  settings: WorkshopSettings,
) {
  const rows: string[][] = [];

  rows.push([settings.namaWorkshop]);
  rows.push([
    `Maksimal Pengeluaran: ${formatRupiah(settings.jumlahPendapatan)}`,
  ]);
  rows.push([`Total Nilai Project: ${formatRupiah(settings.maxPengeluaran)}`]);
  rows.push([]);

  summaries.forEach((summary) => {
    const keuntungan = summary.totalPendapatan - summary.totalPengeluaran;

    rows.push([`=== ${summary.team.namaTeam} ===`]);
    rows.push([
      "Total Pendapatan (Anggaran Diterima)",
      formatRupiah(summary.totalPendapatan),
    ]);
    rows.push(["Total Pengeluaran", formatRupiah(summary.totalPengeluaran)]);
    rows.push(["Keuntungan", formatRupiah(keuntungan)]);
    rows.push([]);

    // Payment stages
    rows.push(["TAHAPAN PEMBAYARAN"]);
    rows.push(["Tahap", "Nominal", "Status", "Bonus", "Penalti"]);
    settings.paymentStages.forEach((stage) => {
      const ps = summary.paymentStatuses.find((p) => p.stageId === stage.id);
      const completed = ps?.completed ?? false;
      const bonus = ps?.bonus ?? 0;
      const penalty = ps?.penalty ?? 0;
      rows.push([
        stage.label,
        formatRupiah(stage.nominal),
        completed ? "✓ Lunas" : "Belum",
        bonus > 0 ? `+${formatRupiah(bonus * BONUS_PENALTY_VALUE)}` : "-",
        penalty > 0 ? `-${formatRupiah(penalty * BONUS_PENALTY_VALUE)}` : "-",
      ]);
    });
    rows.push([]);

    // Per day
    rows.push(["RIWAYAT PEMBELIAN"]);
    if (summary.submissions.length === 0) {
      rows.push(["Belum ada pembelian"]);
    } else {
      rows.push([
        "Hari",
        "Material / SDM",
        "Jumlah",
        "Satuan",
        "Harga Satuan",
        "Total",
      ]);
      summary.submissions.forEach((sub) => {
        if (sub.entries.length === 0) {
          rows.push([
            `Hari ${sub.hari}`,
            "(tidak ada pembelian)",
            "",
            "",
            "",
            formatRupiah(0),
          ]);
        } else {
          sub.entries.forEach((e) => {
            rows.push([
              `Hari ${sub.hari}`,
              e.namaKomponen,
              String(e.jumlah),
              e.satuan,
              formatRupiah(e.hargaPerPcs),
              formatRupiah(e.totalHarga),
            ]);
          });
          rows.push([
            `Hari ${sub.hari} - TOTAL`,
            "",
            "",
            "",
            "",
            formatRupiah(sub.totalHari),
          ]);
        }
      });
    }
    rows.push([]);

    // Material summary
    if (Object.keys(summary.totalPerMaterial).length > 0) {
      rows.push(["REKAPAN MATERIAL & SDM"]);
      rows.push(["Nama Komponen", "Total Jumlah", "Satuan", "Total Biaya"]);
      Object.values(summary.totalPerMaterial).forEach((m) => {
        rows.push([m.nama, String(m.jumlah), m.satuan, formatRupiah(m.total)]);
      });
    }
    rows.push([]);
    rows.push([]);
  });

  // Leaderboard
  const ranked = [...summaries].sort(
    (a, b) =>
      b.totalPendapatan -
      b.totalPengeluaran -
      (a.totalPendapatan - a.totalPengeluaran),
  );
  rows.push(["=== LEADERBOARD ==="]);
  rows.push([
    "Peringkat",
    "Nama Tim",
    "Pendapatan",
    "Pengeluaran",
    "Keuntungan",
    "Status",
  ]);
  ranked.forEach((s, i) => {
    const k = s.totalPendapatan - s.totalPengeluaran;
    const over = s.totalPengeluaran > s.totalPendapatan;
    rows.push([
      String(i + 1),
      s.team.namaTeam,
      formatRupiah(s.totalPendapatan),
      formatRupiah(s.totalPengeluaran),
      formatRupiah(k),
      over ? "MELEBIHI ANGGARAN" : "AMAN",
    ]);
  });

  const csv = rows
    .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(","))
    .join("\n");

  const bom = "\uFEFF";
  const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `Rekap_Workshop_BRICS_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
