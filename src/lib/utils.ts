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

export function getSpendingStatus(total: number, max: number) {
  const pct = (total / max) * 100;
  if (pct >= 100) return { color: "text-red-600", bg: "bg-red-100", label: "MELEBIHI BATAS", barColor: "bg-red-500" };
  if (pct >= 80) return { color: "text-orange-600", bg: "bg-orange-100", label: "MENDEKATI BATAS", barColor: "bg-orange-500" };
  return { color: "text-green-600", bg: "bg-green-100", label: "AMAN", barColor: "bg-green-500" };
}
