"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  getWorkshopSettings,
  getTeamSubmissions,
  submitDailyPurchase,
  checkDaySubmitted,
  getTeams,
} from "@/lib/db";
import { WorkshopSettings, Team, DailySubmission, PurchaseEntry, MaterialItem } from "@/types";
import { formatRupiah, getSpendingStatus } from "@/lib/utils";
import {
  ShoppingCart,
  CheckCircle,
  AlertTriangle,
  ArrowLeft,
  Plus,
  Trash2,
  Loader2,
  TrendingUp,
  Lock,
} from "lucide-react";

export default function TeamPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [settings, setSettings] = useState<WorkshopSettings | null>(null);
  const [team, setTeam] = useState<Team | null>(null);
  const [submissions, setSubmissions] = useState<DailySubmission[]>([]);
  const [currentHari, setCurrentHari] = useState(1);
  const [cart, setCart] = useState<PurchaseEntry[]>([]);
  const [success, setSuccess] = useState(false);
  const [view, setView] = useState<"input" | "history">("input");

  useEffect(() => {
    const teamId = sessionStorage.getItem("selectedTeamId");
    if (!teamId) { router.push("/"); return; }
    load(teamId);
  }, []);

  async function load(teamId: string) {
    const [ws, teams, subs] = await Promise.all([
      getWorkshopSettings(),
      import("@/lib/db").then(m => m.getTeams()),
      getTeamSubmissions(teamId),
    ]);
    if (!ws) { router.push("/"); return; }
    const t = teams.find(t => t.id === teamId) || null;
    setSettings(ws);
    setTeam(t);
    setSubmissions(subs);

    // Determine current day
    const submittedDays = subs.map(s => s.hari);
    let nextDay = 1;
    for (let i = 1; i <= ws.jumlahHari; i++) {
      if (!submittedDays.includes(i)) { nextDay = i; break; }
      nextDay = ws.jumlahHari + 1;
    }
    setCurrentHari(nextDay);
    initCart(ws.materials);
    setLoading(false);
  }

  function initCart(materials: MaterialItem[]) {
    setCart(
      materials.map(m => ({
        materialId: m.id,
        namaKomponen: m.namaKomponen,
        satuan: m.satuan,
        hargaPerPcs: m.hargaPerPcs,
        jumlah: 0,
        totalHarga: 0,
      }))
    );
  }

  function updateJumlah(idx: number, val: string) {
    const jumlah = Math.max(0, parseInt(val) || 0);
    setCart(prev => prev.map((item, i) =>
      i === idx ? { ...item, jumlah, totalHarga: jumlah * item.hargaPerPcs } : item
    ));
  }

  const cartTotal = cart.reduce((s, i) => s + i.totalHarga, 0);
  const prevTotal = submissions.reduce((s, sub) => s + sub.totalHari, 0);
  const runningTotal = prevTotal + cartTotal;
  const maxPengeluaran = settings?.maxPengeluaran ?? 0;
  const status = getSpendingStatus(runningTotal, maxPengeluaran);

  async function handleSubmit() {
    if (!team || !settings) return;
    const hasPurchase = cart.some(c => c.jumlah > 0);
    if (!hasPurchase) { alert("Masukkan setidaknya satu item pembelian!"); return; }
    if (runningTotal > maxPengeluaran) {
      if (!confirm(`Total pengeluaran (${formatRupiah(runningTotal)}) MELEBIHI batas maksimal (${formatRupiah(maxPengeluaran)}). Lanjutkan?`)) return;
    }

    setSubmitting(true);
    try {
      const activeEntries = cart.filter(c => c.jumlah > 0);
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
    } catch (e) {
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
            Hari {Math.min(currentHari, settings?.jumlahHari ?? 1)}/{settings?.jumlahHari}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        {/* Budget Card */}
        <div className="card">
          <div className="flex justify-between items-start mb-3">
            <div>
              <p className="text-xs text-slate-500">Total Pengeluaran</p>
              <p className="text-2xl font-bold text-slate-800">{formatRupiah(prevTotal)}</p>
            </div>
            <span className={`text-xs font-bold px-2 py-1 rounded-full ${status.bg} ${status.color}`}>
              {status.label}
            </span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2.5 mb-1">
            <div
              className={`${status.barColor} h-2.5 rounded-full transition-all`}
              style={{ width: `${Math.min((prevTotal / maxPengeluaran) * 100, 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-slate-500">
            <span>Terpakai: {formatRupiah(prevTotal)}</span>
            <span>Maks: {formatRupiah(maxPengeluaran)}</span>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 flex justify-between text-xs text-slate-500">
            <span>Sisa: <span className="font-semibold text-slate-700">{formatRupiah(Math.max(0, maxPengeluaran - prevTotal))}</span></span>
            <span>Pendapatan: <span className="font-semibold text-slate-700">{formatRupiah(settings?.jumlahPendapatan ?? 0)}</span></span>
          </div>
        </div>

        {/* Tab Nav */}
        <div className="flex bg-white rounded-xl border border-slate-200 p-1">
          <button
            onClick={() => setView("input")}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${view === "input" ? "bg-blue-700 text-white" : "text-slate-500 hover:text-slate-700"}`}
          >
            Input Hari Ini
          </button>
          <button
            onClick={() => setView("history")}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${view === "history" ? "bg-blue-700 text-white" : "text-slate-500 hover:text-slate-700"}`}
          >
            Riwayat ({submissions.length})
          </button>
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

        {view === "input" && (
          <>
            {workshopDone ? (
              <div className="card text-center py-8">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                <p className="font-semibold text-slate-700 text-lg">Workshop Selesai!</p>
                <p className="text-slate-500 text-sm mt-1">Semua hari telah diisi.</p>
                <div className="mt-4 p-3 bg-slate-50 rounded-lg">
                  <p className="text-xs text-slate-500">Total Pengeluaran Akhir</p>
                  <p className="text-xl font-bold text-slate-800">{formatRupiah(prevTotal)}</p>
                  <p className={`text-sm font-semibold mt-1 ${status.color}`}>{status.label}</p>
                </div>
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
                  {cart.map((item, idx) => (
                    <div key={item.materialId} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-700 truncate">{item.namaKomponen}</p>
                        <p className="text-xs text-slate-500">{formatRupiah(item.hargaPerPcs)} / {item.satuan}</p>
                      </div>
                      <input
                        type="number"
                        min="0"
                        value={item.jumlah || ""}
                        onChange={e => updateJumlah(idx, e.target.value)}
                        className="w-20 text-center border border-slate-300 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="0"
                      />
                      <div className="w-24 text-right">
                        <p className="text-sm font-semibold text-slate-700">
                          {item.jumlah > 0 ? formatRupiah(item.totalHarga) : "-"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Summary */}
                <div className="mt-4 pt-4 border-t border-slate-200">
                  <div className="flex justify-between text-sm text-slate-600 mb-1">
                    <span>Pembelian hari ini:</span>
                    <span className="font-semibold">{formatRupiah(cartTotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-slate-600 mb-1">
                    <span>Akumulasi sebelumnya:</span>
                    <span className="font-semibold">{formatRupiah(prevTotal)}</span>
                  </div>
                  <div className={`flex justify-between font-bold text-base mt-2 pt-2 border-t border-slate-200 ${runningTotal > maxPengeluaran ? "text-red-600" : "text-slate-800"}`}>
                    <span>Total akumulasi:</span>
                    <span>{formatRupiah(runningTotal)}</span>
                  </div>
                  {runningTotal > maxPengeluaran && (
                    <div className="mt-2 flex items-center gap-2 text-red-600 text-xs">
                      <AlertTriangle className="w-4 h-4" />
                      Melebihi batas {formatRupiah(maxPengeluaran)} sebesar {formatRupiah(runningTotal - maxPengeluaran)}
                    </div>
                  )}
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="btn-primary w-full mt-4 flex items-center justify-center gap-2"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                  {submitting ? "Menyimpan..." : `Kunci & Submit Hari ke-${currentHari}`}
                </button>
                <p className="text-xs text-slate-400 text-center mt-2">
                  ⚠️ Data yang sudah disubmit tidak dapat diubah
                </p>
              </div>
            )}
          </>
        )}

        {view === "history" && (
          <div className="space-y-3">
            {submissions.length === 0 ? (
              <div className="card text-center py-8 text-slate-400">
                Belum ada data yang disubmit
              </div>
            ) : (
              submissions.map(sub => (
                <div key={sub.id} className="card">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-slate-700 flex items-center gap-2">
                      <Lock className="w-4 h-4 text-slate-400" />
                      Hari ke-{sub.hari}
                    </h3>
                    <span className="font-bold text-blue-700">{formatRupiah(sub.totalHari)}</span>
                  </div>
                  <div className="space-y-1">
                    {sub.entries.map((e, i) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span className="text-slate-600">{e.namaKomponen} <span className="text-slate-400">×{e.jumlah} {e.satuan}</span></span>
                        <span className="text-slate-700">{formatRupiah(e.totalHarga)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
