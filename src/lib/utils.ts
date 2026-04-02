// src/lib/utils.ts

export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ");
}

/**
 * Spending status is now relative to totalPendapatan (payments received),
 * not maxPengeluaran.  maxPengeluaran is a reference ceiling shown in the UI
 * but the operative budget is how much the team has actually been paid.
 *
 * @param totalPengeluaran  running spend
 * @param budget            effective budget = totalPendapatan (paid so far)
 */
export function getSpendingStatus(totalPengeluaran: number, budget: number) {
  const pct = budget > 0 ? (totalPengeluaran / budget) * 100 : 0;
  if (pct >= 100)
    return {
      color: "text-red-600",
      bg: "bg-red-100",
      label: "MELEBIHI ANGGARAN",
      barColor: "bg-red-500",
    };
  if (pct >= 80)
    return {
      color: "text-orange-600",
      bg: "bg-orange-100",
      label: "MENDEKATI BATAS",
      barColor: "bg-orange-500",
    };
  return {
    color: "text-green-600",
    bg: "bg-green-100",
    label: "AMAN",
    barColor: "bg-green-500",
  };
}
