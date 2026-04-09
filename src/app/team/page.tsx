"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  getWorkshopSettings,
  getTeamSubmissions,
  submitDailyPurchase,
  getTeams,
  getTeamPaymentStatuses,
  getTeamLimits,
} from "@/lib/db";
import {
  WorkshopSettings,
  Team,
  DailySubmission,
  PurchaseEntry,
  MaterialItem,
  PackageOption,
  TeamPaymentStatus,
  TeamLimits,
} from "@/types";
import { formatRupiah, getSpendingStatus } from "@/lib/utils";
import { BONUS_PENALTY_VALUE } from "@/lib/defaultData";
import {
  ShoppingCart,
  CheckCircle,
  AlertTriangle,
  ArrowLeft,
  Loader2,
  Lock,
  CreditCard,
  Image as ImageIcon,
  Package,
  Layers,
  ShieldAlert,
} from "lucide-react";

// ─── Material image preview modal ────────────────────────────────────

function ImageModal({
  src,
  name,
  onClose,
}: {
  src: string;
  name: string;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <img src={src} alt={name} className="w-full object-contain max-h-72" />
        <div className="px-4 py-3 flex items-center justify-between">
          <p className="font-semibold text-slate-800 text-sm">{name}</p>
          <button
            onClick={onClose}
            className="text-xs text-slate-500 hover:text-slate-700 underline"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Cart item state ──────────────────────────────────────────────────

interface CartRow {
  materialId: string;
  namaKomponen: string;
  satuan: string;
  hargaPerPcs: number;
  packages: PackageOption[];
  mode: "satuan" | "paket";
  satuanJumlah: number;
  selectedPkgId: string;
  pkgCount: number;
}

function rowToEntry(row: CartRow): PurchaseEntry | null {
  if (row.mode === "satuan") {
    if (row.satuanJumlah === 0) return null;
    return {
      materialId: row.materialId,
      namaKomponen: row.namaKomponen,
      satuan: row.satuan,
      hargaPerPcs: row.hargaPerPcs,
      jumlah: row.satuanJumlah,
      totalHarga: row.satuanJumlah * row.hargaPerPcs,
      isPackage: false,
    };
  }
  const pkg = row.packages.find((p) => p.id === row.selectedPkgId);
  if (!pkg || row.pkgCount === 0) return null;
  const totalQty = row.pkgCount * pkg.qtyPerPackage;
  const totalHarga = row.pkgCount * pkg.hargaPerPackage;
  return {
    materialId: row.materialId,
    namaKomponen: row.namaKomponen,
    satuan: row.satuan,
    hargaPerPcs: pkg.hargaPerPackage / pkg.qtyPerPackage,
    jumlah: totalQty,
    totalHarga,
    isPackage: true,
    packageLabel: pkg.label,
    qtyPerPackage: pkg.qtyPerPackage,
    packageCount: row.pkgCount,
  };
}

function rowTotal(row: CartRow): number {
  return rowToEntry(row)?.totalHarga ?? 0;
}

// ─── Main page ────────────────────────────────────────────────────────

export default function TeamPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [settings, setSettings] = useState<WorkshopSettings | null>(null);
  const [team, setTeam] = useState<Team | null>(null);
  const [submissions, setSubmissions] = useState<DailySubmission[]>([]);
  const [paymentStatuses, setPaymentStatuses] = useState<TeamPaymentStatus[]>([]);
  const [teamLimits, setTeamLimits] = useState<TeamLimits | null>(null);
  const [currentHari, setCurrentHari] = useState(1);
  const [cart, setCart] = useState<CartRow[]>([]);
  const [success, setSuccess] = useState(false);
  const [view, setView] = useState<"input" | "history" | "revenue">("input");
  const [previewImage, setPreviewImage] = useState<{ src: string; name: string } | null>(null);

  useEffect(() => {
    const teamId = sessionStorage.getItem("selectedTeamId");
    if (!teamId) { router.push("/"); return; }
    load(teamId);
  }, []);

  async function load(teamId: string) {
    const [ws, teams, subs, pays, limits] = await Promise.all([
      getWorkshopSettings(),
      getTeams(),
      getTeamSubmissions(teamId),
      getTeamPaymentStatuses(teamId),
      getTeamLimits(teamId),
    ]);
    if (!ws) { router.push("/"); return; }
    const t = teams.find((t) => t.id === teamId) || null;
    setSettings(ws);
    setTeam(t);
    setSubmissions(subs);
    setPaymentStatuses(pays);
    setTeamLimits(limits);

    const submittedDays = new Set(subs.map((s) => s.hari));
    let nextDay = 1;
    while (submittedDays.has(nextDay)) nextDay++;
    setCurrentHari(nextDay);

    const sortedMaterials = [...ws.materials].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    initCart(sortedMaterials);
    setLoading(false);
  }

  function initCart(materials: MaterialItem[]) {
    setCart(
      materials.map((m) => {
        const pkgs = m.packages ?? [];
        return {
          materialId: m.id,
          namaKomponen: m.namaKomponen,
          satuan: m.satuan,
          hargaPerPcs: m.hargaPerPcs,
          packages: pkgs,
          mode: pkgs.length > 0 ? "paket" : "satuan",
          satuanJumlah: 0,
          selectedPkgId: pkgs[0]?.id ?? "",
          pkgCount: 0,
        };
      })
    );
  }

  // ─── Helper: how much of a material has already been bought (all days) ──

  function getBoughtQty(materialId: string): number {
    return submissions.reduce((sum, sub) => {
      const entry = sub.entries.find((e) => e.materialId === materialId);
      return sum + (entry?.jumlah ?? 0);
    }, 0);
  }

  function getMaxQty(materialId: string): number {
    return teamLimits?.limits?.[materialId] ?? 0; // 0 = unlimited
  }

  /**
   * How many more units a team can buy today for a given material.
   * Returns Infinity if unlimited.
   */
  function getRemainingQty(materialId: string): number {
    const max = getMaxQty(materialId);
    if (max === 0) return Infinity;
    const bought = getBoughtQty(materialId);
    return Math.max(0, max - bought);
  }

  // ─── Cart mutations ─────────────────────────────────────────────────

  function setMode(idx: number, mode: "satuan" | "paket") {
    setCart((prev) =>
      prev.map((row, i) => (i === idx ? { ...row, mode, satuanJumlah: 0, pkgCount: 0 } : row))
    );
  }

  function setSatuanJumlah(idx: number, val: string) {
    const row = cart[idx];
    const remaining = getRemainingQty(row.materialId);
    const n = Math.max(0, parseInt(val) || 0);
    const clamped = remaining === Infinity ? n : Math.min(n, remaining);
    setCart((prev) => prev.map((r, i) => (i === idx ? { ...r, satuanJumlah: clamped } : r)));
  }

  function setSelectedPkg(idx: number, pkgId: string) {
    setCart((prev) =>
      prev.map((row, i) => (i === idx ? { ...row, selectedPkgId: pkgId, pkgCount: 0 } : row))
    );
  }

  function setPkgCount(idx: number, val: string) {
    const row = cart[idx];
    const n = Math.max(0, parseInt(val) || 0);
    const remaining = getRemainingQty(row.materialId);

    if (remaining === Infinity) {
      setCart((prev) => prev.map((r, i) => (i === idx ? { ...r, pkgCount: n } : r)));
      return;
    }

    // Clamp: how many packages fit within remaining?
    const activePkg = row.packages.find((p) => p.id === row.selectedPkgId);
    const qtyPerPkg = activePkg?.qtyPerPackage ?? 1;
    const maxPkgs = Math.floor(remaining / qtyPerPkg);
    setCart((prev) =>
      prev.map((r, i) => (i === idx ? { ...r, pkgCount: Math.min(n, maxPkgs) } : r))
    );
  }

  // ─── Derived totals ─────────────────────────────────────────────────

  const cartTotal = cart.reduce((s, row) => s + rowTotal(row), 0);
  const prevTotal = submissions.reduce((s, sub) => s + sub.totalHari, 0);
  const runningTotal = prevTotal + cartTotal;

  const totalPendapatan = (settings?.paymentStages ?? []).reduce((sum, stage) => {
    const ps = paymentStatuses.find((p) => p.stageId === stage.id);
    if (!ps?.completed) return sum;
    const bonusAmt = (ps.bonus ?? 0) * BONUS_PENALTY_VALUE;
    const penaltyAmt = (ps.penalty ?? 0) * BONUS_PENALTY_VALUE;
    return sum + stage.nominal + bonusAmt - penaltyAmt;
  }, 0);

  const keuntungan = totalPendapatan - prevTotal;
  const stagesCompleted = paymentStatuses.filter((p) => p.completed).length;
  const totalStages = settings?.paymentStages?.length ?? 0;
  const status = getSpendingStatus(runningTotal, totalPendapatan);
  const pct = totalPendapatan > 0 ? (prevTotal / totalPendapatan) * 100 : 0;

  const sortedMaterials = settings
    ? [...settings.materials].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    : [];

  // ─── Limit violations in current cart ────────────────────────────────

  interface LimitViolation {
    namaKomponen: string;
    requested: number;
    remaining: number;
    satuan: string;
  }

  function getLimitViolations(): LimitViolation[] {
    const violations: LimitViolation[] = [];
    cart.forEach((row) => {
      const entry = rowToEntry(row);
      if (!entry) return;
      const remaining = getRemainingQty(row.materialId);
      if (remaining !== Infinity && entry.jumlah > remaining) {
        violations.push({
          namaKomponen: row.namaKomponen,
          requested: entry.jumlah,
          remaining,
          satuan: row.satuan,
        });
      }
    });
    return violations;
  }

  const limitViolations = getLimitViolations();
  const hasLimitViolation = limitViolations.length > 0;

  // ─── Submit ─────────────────────────────────────────────────────────

  async function handleSubmit() {
    if (!team || !settings) return;

    if (hasLimitViolation) {
      const names = limitViolations.map((v) => `• ${v.namaKomponen}: minta ${v.requested}, sisa ${v.remaining} ${v.satuan}`).join("\n");
      alert(`Pembelian melebihi batas yang ditetapkan:\n\n${names}\n\nKurangi jumlah pembelian terlebih dahulu.`);
      return;
    }

    if (totalPendapatan === 0) {
      if (!confirm("Belum ada pembayaran yang diterima (anggaran = Rp 0). Lanjutkan tetap submit?")) return;
    } else if (runningTotal > totalPendapatan) {
      if (!confirm(`Total pengeluaran (${formatRupiah(runningTotal)}) MELEBIHI anggaran yang diterima (${formatRupiah(totalPendapatan)}). Lanjutkan?`)) return;
    }

    setSubmitting(true);
    try {
      const activeEntries = cart.map((row) => rowToEntry(row)).filter(Boolean) as PurchaseEntry[];
      await submitDailyPurchase({
        teamId: team.id,
        workshopId: settings.id,
        hari: currentHari,
        entries: activeEntries,
        totalHari: cartTotal,
      });
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        load(team.id);
        setView("history");
      }, 2000);
    } catch {
      alert("Gagal submit. Coba lagi.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const workshopDone = currentHari > (settings?.jumlahHari ?? 0);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Image preview modal */}
      {previewImage && (
        <ImageModal src={previewImage.src} name={previewImage.name} onClose={() => setPreviewImage(null)} />
      )}

      {/* Header */}
      <div className="bg-blue-800 text-white px-4 py-4 sticky top-0 z-10 shadow-lg">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <button onClick={() => router.push("/")} className="flex items-center gap-1 text-blue-200 hover:text-white text-sm">
            <ArrowLeft className="w-4 h-4" /> Ganti Tim
          </button>
          <div className="text-center">
            <p className="text-xs text-blue-300">Tim</p>
            <p className="font-bold text-lg">{team?.namaTeam}</p>
          </div>
          <div className="text-right text-xs text-blue-200">
            {workshopDone ? (
              <span className="text-green-300 font-semibold">Selesai ✓</span>
            ) : (
              <span>Hari {currentHari}/{settings?.jumlahHari}</span>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        {/* Summary Card */}
        <div className="card">
          <div className="grid grid-cols-2 gap-4 mb-3">
            <div>
              <p className="text-xs text-slate-500">Pengeluaran</p>
              <p className="text-xl font-bold text-slate-800">{formatRupiah(prevTotal)}</p>
              <p className="text-xs text-slate-400">dari anggaran {formatRupiah(totalPendapatan)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500">Anggaran Diterima</p>
              <p className="text-xl font-bold text-green-700">{formatRupiah(totalPendapatan)}</p>
              <p className="text-xs text-slate-400">{stagesCompleted}/{totalStages} tahap lunas</p>
            </div>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2.5 mb-1">
            <div className={`${status.barColor} h-2.5 rounded-full transition-all`} style={{ width: `${Math.min(pct, 100)}%` }} />
          </div>
          <div className="flex justify-between text-xs text-slate-500 mt-1">
            <span className={`font-semibold ${status.color}`}>{status.label}</span>
            <span>
              Keuntungan:{" "}
              <span className={`font-semibold ${keuntungan >= 0 ? "text-green-600" : "text-red-600"}`}>
                {keuntungan >= 0 ? "+" : ""}{formatRupiah(keuntungan)}
              </span>
            </span>
          </div>
        </div>

        {/* Tab Nav */}
        <div className="flex bg-white rounded-xl border border-slate-200 p-1">
          {[
            { key: "input", label: "Input Hari Ini" },
            { key: "history", label: `Riwayat (${submissions.length})` },
            { key: "revenue", label: "Pembayaran" },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setView(key as typeof view)}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors ${
                view === key ? "bg-blue-700 text-white" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {success && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
            <CheckCircle className="w-6 h-6 text-green-600" />
            <div>
              <p className="font-semibold text-green-800">Berhasil disimpan!</p>
              <p className="text-green-600 text-sm">Data Hari {currentHari} telah dikunci.</p>
            </div>
          </div>
        )}

        {/* ── INPUT TAB ── */}
        {view === "input" && (
          <>
            {workshopDone ? (
              <div className="card text-center py-8">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                <p className="font-semibold text-slate-700 text-lg">Workshop Selesai!</p>
                <p className="text-slate-500 text-sm mt-1">Semua {settings?.jumlahHari} hari telah diisi.</p>
              </div>
            ) : (
              <div className="card">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold text-slate-800 flex items-center gap-2">
                    <ShoppingCart className="w-5 h-5 text-blue-600" />
                    Input Hari ke-{currentHari}
                  </h2>
                  {cartTotal > 0 && (
                    <span className="text-sm font-bold text-blue-700">{formatRupiah(cartTotal)}</span>
                  )}
                </div>

                <div className="space-y-3">
                  {cart.map((row, idx) => {
                    const mat = sortedMaterials[idx];
                    const hasPkgs = row.packages.length > 0;
                    const activePkg = row.packages.find((p) => p.id === row.selectedPkgId);
                    const rowAmt = rowTotal(row);
                    const maxQty = getMaxQty(row.materialId);
                    const boughtQty = getBoughtQty(row.materialId);
                    const remaining = getRemainingQty(row.materialId);
                    const isLimited = maxQty > 0;
                    const isExhausted = isLimited && remaining === 0;
                    const entry = rowToEntry(row);
                    const isOverLimit = isLimited && entry !== null && entry.jumlah > remaining;

                    return (
                      <div
                        key={row.materialId}
                        className={`rounded-xl border overflow-hidden ${
                          isExhausted
                            ? "border-slate-300 bg-slate-50 opacity-60"
                            : isOverLimit
                            ? "border-red-400"
                            : "border-slate-200"
                        }`}
                      >
                        {/* Material header row */}
                        <div className={`flex items-center gap-3 px-3 pt-3 pb-2 ${isExhausted ? "bg-slate-100" : "bg-slate-50"}`}>
                          {/* Thumbnail */}
                          {mat?.imageUrl ? (
                            <button type="button" onClick={() => setPreviewImage({ src: mat.imageUrl!, name: row.namaKomponen })} className="flex-shrink-0">
                              <img src={mat.imageUrl} alt={row.namaKomponen} className="w-10 h-10 rounded-lg object-cover border border-slate-200 hover:opacity-80 transition-opacity" />
                            </button>
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-slate-200 flex items-center justify-center flex-shrink-0">
                              <ImageIcon className="w-4 h-4 text-slate-400" />
                            </div>
                          )}

                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-800 truncate">{row.namaKomponen}</p>
                            <p className="text-xs text-slate-500">
                              Satuan: {formatRupiah(row.hargaPerPcs)}/{row.satuan}
                            </p>
                          </div>

                          <div className="flex flex-col items-end gap-1 flex-shrink-0">
                            {rowAmt > 0 && (
                              <span className="text-sm font-bold text-blue-700">{formatRupiah(rowAmt)}</span>
                            )}
                            {/* Limit badge */}
                            {isLimited && (
                              <span className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
                                isExhausted
                                  ? "bg-slate-200 text-slate-500"
                                  : isOverLimit
                                  ? "bg-red-100 text-red-700"
                                  : remaining <= maxQty * 0.2
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-blue-100 text-blue-700"
                              }`}>
                                <ShieldAlert className="w-3 h-3" />
                                {isExhausted
                                  ? "Habis"
                                  : `Sisa ${remaining} ${row.satuan}`}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Limit progress bar */}
                        {isLimited && (
                          <div className="px-3 pb-1.5 bg-slate-50 border-b border-slate-100">
                            <div className="flex justify-between text-xs text-slate-400 mb-0.5">
                              <span>Sudah dibeli: {boughtQty} / {maxQty} {row.satuan}</span>
                              <span>{Math.round((boughtQty / maxQty) * 100)}%</span>
                            </div>
                            <div className="w-full bg-slate-200 rounded-full h-1.5">
                              <div
                                className={`h-1.5 rounded-full transition-all ${
                                  boughtQty >= maxQty
                                    ? "bg-slate-400"
                                    : boughtQty / maxQty >= 0.8
                                    ? "bg-amber-500"
                                    : "bg-blue-500"
                                }`}
                                style={{ width: `${Math.min((boughtQty / maxQty) * 100, 100)}%` }}
                              />
                            </div>
                          </div>
                        )}

                        {/* Exhausted overlay message */}
                        {isExhausted && (
                          <div className="px-3 py-2.5 bg-slate-50 text-xs text-slate-500 italic flex items-center gap-2">
                            <Lock className="w-3.5 h-3.5" /> Batas pembelian untuk material ini sudah tercapai.
                          </div>
                        )}

                        {/* Mode toggle + input (hidden when exhausted) */}
                        {!isExhausted && (
                          <>
                            {/* Mode toggle */}
                            {hasPkgs && (
                              <div className="flex gap-1 px-3 pb-2 bg-slate-50 border-b border-slate-200">
                                <button type="button" onClick={() => setMode(idx, "paket")} className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${row.mode === "paket" ? "bg-blue-700 text-white" : "bg-white border border-slate-300 text-slate-600 hover:border-blue-400"}`}>
                                  <Package className="w-3.5 h-3.5" /> Beli Paket
                                </button>
                                <button type="button" onClick={() => setMode(idx, "satuan")} className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${row.mode === "satuan" ? "bg-blue-700 text-white" : "bg-white border border-slate-300 text-slate-600 hover:border-blue-400"}`}>
                                  <Layers className="w-3.5 h-3.5" /> Beli Satuan
                                </button>
                              </div>
                            )}

                            {/* Input area */}
                            <div className="px-3 py-2.5 bg-white">
                              {row.mode === "satuan" || !hasPkgs ? (
                                <div className="flex items-center gap-3">
                                  <span className="text-xs text-slate-500 flex-1">
                                    Jumlah ({row.satuan})
                                    {isLimited && <span className="text-blue-600 ml-1">· maks {remaining}</span>}
                                  </span>
                                  <input
                                    type="number"
                                    min="0"
                                    max={isLimited ? remaining : undefined}
                                    value={row.satuanJumlah || ""}
                                    onChange={(e) => setSatuanJumlah(idx, e.target.value)}
                                    className={`w-24 text-center border rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isOverLimit ? "border-red-400 bg-red-50" : "border-slate-300"}`}
                                    placeholder="0"
                                  />
                                  <div className="w-28 text-right">
                                    <p className="text-sm font-semibold text-slate-700">
                                      {row.satuanJumlah > 0 ? formatRupiah(row.satuanJumlah * row.hargaPerPcs) : "-"}
                                    </p>
                                  </div>
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  {row.packages.length > 1 && (
                                    <div className="flex gap-1 flex-wrap">
                                      {row.packages.map((pkg) => (
                                        <button
                                          key={pkg.id}
                                          type="button"
                                          onClick={() => setSelectedPkg(idx, pkg.id)}
                                          className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition-colors ${row.selectedPkgId === pkg.id ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-300 text-slate-600 hover:border-blue-400"}`}
                                        >
                                          {pkg.label} — {formatRupiah(pkg.hargaPerPackage)}
                                        </button>
                                      ))}
                                    </div>
                                  )}

                                  <div className="flex items-center gap-3">
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs text-slate-600 font-medium">{activePkg?.label}</p>
                                      <p className="text-xs text-slate-400">
                                        {formatRupiah(activePkg?.hargaPerPackage ?? 0)} / paket · berisi {activePkg?.qtyPerPackage} {row.satuan}
                                        {isLimited && activePkg && (
                                          <span className="text-blue-600 ml-1">
                                            · maks {Math.floor(remaining / activePkg.qtyPerPackage)} paket
                                          </span>
                                        )}
                                      </p>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-xs text-slate-500">× Paket</span>
                                      <input
                                        type="number"
                                        min="0"
                                        max={
                                          isLimited && activePkg
                                            ? Math.floor(remaining / activePkg.qtyPerPackage)
                                            : undefined
                                        }
                                        value={row.pkgCount || ""}
                                        onChange={(e) => setPkgCount(idx, e.target.value)}
                                        className={`w-20 text-center border rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isOverLimit ? "border-red-400 bg-red-50" : "border-slate-300"}`}
                                        placeholder="0"
                                      />
                                    </div>
                                    <div className="w-28 text-right">
                                      <p className="text-sm font-semibold text-slate-700">
                                        {row.pkgCount > 0 ? formatRupiah(row.pkgCount * (activePkg?.hargaPerPackage ?? 0)) : "-"}
                                      </p>
                                      {row.pkgCount > 0 && activePkg && (
                                        <p className="text-xs text-slate-400">= {row.pkgCount * activePkg.qtyPerPackage} {row.satuan}</p>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Cart summary */}
                <div className="mt-4 pt-4 border-t border-slate-200">
                  <div className="flex justify-between text-sm text-slate-600 mb-1">
                    <span>Pembelian hari ini:</span>
                    <span className="font-semibold">{formatRupiah(cartTotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-slate-600 mb-1">
                    <span>Akumulasi sebelumnya:</span>
                    <span className="font-semibold">{formatRupiah(prevTotal)}</span>
                  </div>
                  <div className={`flex justify-between font-bold text-base mt-2 pt-2 border-t border-slate-200 ${runningTotal > totalPendapatan && totalPendapatan > 0 ? "text-red-600" : "text-slate-800"}`}>
                    <span>Total akumulasi:</span>
                    <span>{formatRupiah(runningTotal)}</span>
                  </div>

                  {/* Warnings */}
                  {totalPendapatan === 0 && (
                    <div className="mt-2 flex items-center gap-2 text-orange-600 text-xs">
                      <AlertTriangle className="w-4 h-4" />
                      Belum ada anggaran yang diterima. Hubungi panitia untuk konfirmasi pembayaran.
                    </div>
                  )}
                  {totalPendapatan > 0 && runningTotal > totalPendapatan && (
                    <div className="mt-2 flex items-center gap-2 text-red-600 text-xs">
                      <AlertTriangle className="w-4 h-4" />
                      Melebihi anggaran yang diterima ({formatRupiah(totalPendapatan)}) sebesar {formatRupiah(runningTotal - totalPendapatan)}
                    </div>
                  )}

                  {/* Limit violation warning */}
                  {hasLimitViolation && (
                    <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-xl">
                      <div className="flex items-center gap-2 text-red-700 text-xs font-semibold mb-1">
                        <ShieldAlert className="w-4 h-4" /> Melebihi batas pembelian:
                      </div>
                      {limitViolations.map((v, i) => (
                        <p key={i} className="text-xs text-red-600 ml-6">
                          {v.namaKomponen}: minta {v.requested} {v.satuan}, sisa {v.remaining} {v.satuan}
                        </p>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={submitting || hasLimitViolation}
                  className="btn-primary w-full mt-4 flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : hasLimitViolation ? (
                    <ShieldAlert className="w-4 h-4" />
                  ) : (
                    <Lock className="w-4 h-4" />
                  )}
                  {submitting
                    ? "Menyimpan..."
                    : hasLimitViolation
                    ? "Kurangi jumlah yang melebihi batas"
                    : `Kunci & Submit Hari ke-${currentHari}`}
                </button>
                <p className="text-xs text-slate-400 text-center mt-2">
                  Boleh submit tanpa pembelian. Data yang sudah disubmit tidak dapat diubah.
                </p>
              </div>
            )}
          </>
        )}

        {/* ── HISTORY TAB ── */}
        {view === "history" && (
          <div className="space-y-3">
            {submissions.length === 0 ? (
              <div className="card text-center py-8 text-slate-400">Belum ada data yang disubmit</div>
            ) : (
              submissions.map((sub) => (
                <div key={sub.id} className="card">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-slate-700 flex items-center gap-2">
                      <Lock className="w-4 h-4 text-slate-400" /> Hari ke-{sub.hari}
                    </h3>
                    <span className="font-bold text-blue-700">{formatRupiah(sub.totalHari)}</span>
                  </div>
                  {sub.entries.length === 0 ? (
                    <p className="text-sm text-slate-400 italic">Tidak ada pembelian</p>
                  ) : (
                    <div className="space-y-1">
                      {sub.entries.map((e, i) => (
                        <div key={i} className="flex justify-between text-sm">
                          <span className="text-slate-600">
                            {e.namaKomponen}{" "}
                            {e.isPackage ? (
                              <span className="text-blue-500 text-xs font-medium">[{e.packageLabel}×{e.packageCount}]</span>
                            ) : null}{" "}
                            <span className="text-slate-400">×{e.jumlah} {e.satuan}</span>
                          </span>
                          <span className="text-slate-700">{formatRupiah(e.totalHarga)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* ── REVENUE TAB ── */}
        {view === "revenue" && (
          <div className="space-y-4">
            <div className="card bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
              <div className="flex items-center gap-3">
                <CreditCard className="w-7 h-7 text-green-600" />
                <div>
                  <h2 className="font-bold text-slate-800">Status Pembayaran</h2>
                  <p className="text-xs text-slate-500">
                    Pembayaran yang lunas menjadi anggaran belanja tim. Informasikan ke panitia setiap tahap yang sudah dibayarkan.
                  </p>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr className="text-left text-slate-500 text-xs">
                      <th className="px-3 py-2.5">Tahap</th>
                      <th className="px-3 py-2.5 text-right">Nominal</th>
                      <th className="px-3 py-2.5 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(settings?.paymentStages ?? []).map((stage) => {
                      const ps = paymentStatuses.find((p) => p.stageId === stage.id);
                      const completed = ps?.completed ?? false;
                      const bonus = ps?.bonus ?? 0;
                      const penalty = ps?.penalty ?? 0;
                      const net = stage.nominal + bonus * BONUS_PENALTY_VALUE - penalty * BONUS_PENALTY_VALUE;

                      return (
                        <tr key={stage.id} className={`border-t border-slate-100 ${completed ? "bg-green-50/60" : ""}`}>
                          <td className="px-3 py-2.5">
                            <p className={`font-medium ${completed ? "text-green-700" : "text-slate-700"}`}>{stage.label}</p>
                            {(bonus > 0 || penalty > 0) && (
                              <div className="flex gap-1.5 mt-0.5">
                                {bonus > 0 && <span className="text-xs text-green-600 font-semibold">+{bonus}× bonus</span>}
                                {penalty > 0 && <span className="text-xs text-red-600 font-semibold">-{penalty}× penalti</span>}
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-right">
                            <p className="font-medium text-slate-600">{formatRupiah(stage.nominal)}</p>
                            {(bonus > 0 || penalty > 0) && (
                              <p className={`text-xs font-bold ${net > stage.nominal ? "text-green-600" : "text-red-600"}`}>→ {formatRupiah(net)}</p>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            {completed ? (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-100 px-2 py-1 rounded-full">
                                <CheckCircle className="w-3 h-3" /> Lunas
                              </span>
                            ) : (
                              <span className="inline-flex text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded-full">Belum</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="border-t-2 border-slate-200 bg-slate-50">
                    <tr>
                      <td className="px-3 py-2.5 font-bold text-slate-700">TOTAL ANGGARAN</td>
                      <td colSpan={2} className="px-3 py-2.5 text-right font-bold text-green-700 text-base">
                        {formatRupiah(totalPendapatan)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}