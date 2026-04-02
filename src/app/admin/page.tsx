"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  getWorkshopSettings,
  updateWorkshopSettings,
  getTeams,
  createTeam,
  deleteTeam,
  getAllSubmissions,
  getAllPaymentStatuses,
  setPaymentStatus,
} from "@/lib/db";
import { WorkshopSettings, Team, DailySubmission, TeamSummary, TeamPaymentStatus, PaymentStage } from "@/types";
import { formatRupiah, getSpendingStatus } from "@/lib/utils";
import { exportRekapCSV } from "@/lib/exportExcel";
import Leaderboard from "@/components/Leaderboard";
import { BONUS_PENALTY_VALUE } from "@/lib/defaultData";
import {
  Settings, Users, BarChart3, Plus, Trash2, Save,
  Loader2, LogOut, RefreshCw, ChevronDown, ChevronUp,
  Lock, Package, Trophy, Download, CreditCard, CheckCircle,
  Circle, Minus, AlertTriangle,
} from "lucide-react";

type Tab = "monitor" | "payments" | "leaderboard" | "teams" | "settings";

export default function AdminPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("monitor");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [settings, setSettings] = useState<WorkshopSettings | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [summaries, setSummaries] = useState<TeamSummary[]>([]);
  const [allPaymentStatuses, setAllPaymentStatuses] = useState<TeamPaymentStatus[]>([]);
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null);
  const [newTeamName, setNewTeamName] = useState("");
  const [addingTeam, setAddingTeam] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsForm, setSettingsForm] = useState<Partial<WorkshopSettings>>({});
  const [savingPayment, setSavingPayment] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionStorage.getItem("isAdmin")) { router.push("/"); return; }
    load();
  }, []);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const [ws, t, allSubs, allPay] = await Promise.all([
        getWorkshopSettings(),
        getTeams(),
        getAllSubmissions(),
        getAllPaymentStatuses(),
      ]);
      if (!ws) { router.push("/"); return; }
      setSettings(ws);
      setTeams(t);
      setAllPaymentStatuses(allPay);
      setSettingsForm({
        namaWorkshop: ws.namaWorkshop,
        jumlahHari: ws.jumlahHari,
        maxPengeluaran: ws.maxPengeluaran,
        jumlahPendapatan: ws.jumlahPendapatan,
        adminPassword: ws.adminPassword,
        materials: ws.materials.map((m) => ({ ...m })),
        paymentStages: ws.paymentStages?.map((p) => ({ ...p })) ?? [],
      });
      setSummaries(buildSummaries(t, allSubs, allPay, ws));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router]);

  function buildSummaries(
    t: Team[],
    allSubs: DailySubmission[],
    allPay: TeamPaymentStatus[],
    ws: WorkshopSettings
  ): TeamSummary[] {
    return t.map((team) => {
      const teamSubs = allSubs.filter((s) => s.teamId === team.id);
      const totalPengeluaran = teamSubs.reduce((s, sub) => s + sub.totalHari, 0);
      const totalPerMaterial: TeamSummary["totalPerMaterial"] = {};
      teamSubs.forEach((sub) => {
        sub.entries.forEach((e) => {
          if (!totalPerMaterial[e.materialId]) {
            totalPerMaterial[e.materialId] = { jumlah: 0, total: 0, nama: e.namaKomponen, satuan: e.satuan };
          }
          totalPerMaterial[e.materialId].jumlah += e.jumlah;
          totalPerMaterial[e.materialId].total += e.totalHarga;
        });
      });
      const teamPayments = allPay.filter((p) => p.teamId === team.id);
      const totalPendapatan = (ws.paymentStages ?? []).reduce((sum, stage) => {
        const ps = teamPayments.find((p) => p.stageId === stage.id);
        if (!ps?.completed) return sum;
        const bonusAmt = (ps.bonus ?? 0) * BONUS_PENALTY_VALUE;
        const penaltyAmt = (ps.penalty ?? 0) * BONUS_PENALTY_VALUE;
        return sum + stage.nominal + bonusAmt - penaltyAmt;
      }, 0);
      return { team, submissions: teamSubs, totalPengeluaran, totalPendapatan, totalPerMaterial, paymentStatuses: teamPayments };
    });
  }

  async function handleTogglePayment(
    teamId: string,
    stageId: string,
    currentCompleted: boolean,
    bonus: number,
    penalty: number
  ) {
    const key = `${teamId}_${stageId}`;
    setSavingPayment(key);
    await setPaymentStatus(teamId, stageId, !currentCompleted, bonus, penalty);
    await load();
    setSavingPayment(null);
  }

  async function handleUpdateBonusPenalty(
    teamId: string,
    stageId: string,
    completed: boolean,
    bonus: number,
    penalty: number
  ) {
    const key = `${teamId}_${stageId}`;
    setSavingPayment(key);
    await setPaymentStatus(teamId, stageId, completed, bonus, penalty);
    await load();
    setSavingPayment(null);
  }

  async function handleAddTeam(e: React.FormEvent) {
    e.preventDefault();
    if (!newTeamName.trim()) return;
    setAddingTeam(true);
    await createTeam(newTeamName.trim());
    setNewTeamName("");
    await load();
    setAddingTeam(false);
  }

  async function handleDeleteTeam(teamId: string, name: string) {
    if (!confirm(`Hapus tim "${name}"?`)) return;
    await deleteTeam(teamId);
    await load();
  }

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    setSavingSettings(true);
    await updateWorkshopSettings({
      namaWorkshop: settingsForm.namaWorkshop,
      jumlahHari: Number(settingsForm.jumlahHari),
      maxPengeluaran: Number(settingsForm.maxPengeluaran),
      jumlahPendapatan: Number(settingsForm.jumlahPendapatan),
      adminPassword: settingsForm.adminPassword,
      materials: settingsForm.materials,
      paymentStages: settingsForm.paymentStages,
    });
    await load();
    setSavingSettings(false);
    alert("Pengaturan berhasil disimpan!");
  }

  function updateMaterial(idx: number, field: string, val: string) {
    setSettingsForm((prev) => ({
      ...prev,
      materials: prev.materials?.map((m, i) =>
        i === idx ? { ...m, [field]: field === "hargaPerPcs" ? Number(val) : val } : m
      ),
    }));
  }

  function updateStage(idx: number, field: string, val: string) {
    setSettingsForm((prev) => ({
      ...prev,
      paymentStages: prev.paymentStages?.map((s, i) =>
        i === idx ? { ...s, [field]: field === "nominal" ? Number(val) : val } : s
      ),
    }));
  }

  function addPaymentStage() {
    const stages = settingsForm.paymentStages ?? [];
    const newId = `stage-${Date.now()}`;
    setSettingsForm((prev) => ({
      ...prev,
      paymentStages: [...stages, { id: newId, label: `Tahap ${stages.length}`, nominal: 0 }],
    }));
  }

  function removePaymentStage(idx: number) {
    setSettingsForm((prev) => ({
      ...prev,
      paymentStages: prev.paymentStages?.filter((_, i) => i !== idx),
    }));
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">Memuat dashboard...</p>
        </div>
      </div>
    );
  }

  const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: "monitor", label: "Monitoring", icon: BarChart3 },
    { key: "payments", label: "Pembayaran", icon: CreditCard },
    { key: "leaderboard", label: "Leaderboard", icon: Trophy },
    { key: "teams", label: "Kelola Tim", icon: Users },
    { key: "settings", label: "Pengaturan", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-blue-900 text-white px-4 py-4 shadow-lg">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <p className="text-xs text-blue-300">Panel Penyelenggara</p>
            <h1 className="font-bold text-xl leading-tight">{settings?.namaWorkshop}</h1>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={load} disabled={refreshing} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            </button>
            {settings && summaries.length > 0 && (
              <button
                onClick={() => exportRekapCSV(summaries, settings)}
                className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 transition-colors"
              >
                <Download className="w-4 h-4" /> Export CSV
              </button>
            )}
            <button
              onClick={() => { sessionStorage.removeItem("isAdmin"); router.push("/"); }}
              className="flex items-center gap-1 text-sm px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
            >
              <LogOut className="w-4 h-4" /> Keluar
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 flex overflow-x-auto">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${
                tab === key ? "border-blue-600 text-blue-700" : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">

        {/* TAB: MONITORING */}
        {tab === "monitor" && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Total Tim", value: String(teams.length), sub: "tim aktif", color: "text-blue-700" },
                { label: "Total Hari", value: String(settings?.jumlahHari), sub: "hari workshop", color: "text-slate-700" },
                { label: "Maks Pengeluaran", value: formatRupiah(settings?.maxPengeluaran ?? 0), sub: "per tim", color: "text-orange-600" },
                { label: "Nilai Project", value: formatRupiah(settings?.jumlahPendapatan ?? 0), sub: "total", color: "text-green-700" },
              ].map(({ label, value, sub, color }) => (
                <div key={label} className="card text-center">
                  <p className={`text-lg font-bold ${color} leading-tight`}>{value}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{label}</p>
                  <p className="text-xs text-slate-400">{sub}</p>
                </div>
              ))}
            </div>

            {summaries.length === 0 ? (
              <div className="card text-center py-12 text-slate-400">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Belum ada tim. Buat tim di tab "Kelola Tim".</p>
              </div>
            ) : (
              summaries.map((summary, teamIdx) => {
                const { team, submissions, totalPengeluaran, totalPendapatan, totalPerMaterial } = summary;
                const status = getSpendingStatus(totalPengeluaran, settings?.maxPengeluaran ?? 1);
                const isExpanded = expandedTeam === team.id;
                const pct = (totalPengeluaran / (settings?.maxPengeluaran ?? 1)) * 100;
                const keuntungan = totalPendapatan - totalPengeluaran;
                const stagesCompleted = summary.paymentStatuses.filter((p) => p.completed).length;
                const totalStages = settings?.paymentStages?.length ?? 0;

                return (
                  <div key={team.id} className="card">
                    <button onClick={() => setExpandedTeam(isExpanded ? null : team.id)} className="w-full">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-11 h-11 rounded-xl bg-blue-100 text-blue-700 font-bold text-lg flex items-center justify-center flex-shrink-0">
                          {teamIdx + 1}
                        </div>
                        <div className="flex-1 text-left">
                          <div className="flex items-center justify-between">
                            <p className="font-bold text-slate-800">{team.namaTeam}</p>
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${status.bg} ${status.color}`}>
                                {status.label}
                              </span>
                              {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                            </div>
                          </div>
                          <p className="text-xs text-slate-500">
                            {submissions.length} submisi · {stagesCompleted}/{totalStages} tahap lunas
                          </p>
                        </div>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2.5">
                        <div className={`${status.barColor} h-2.5 rounded-full`} style={{ width: `${Math.min(pct, 100)}%` }} />
                      </div>
                      <div className="flex justify-between text-xs text-slate-400 mt-1">
                        <span>Pengeluaran: <span className="font-semibold text-slate-600">{formatRupiah(totalPengeluaran)}</span></span>
                        <span>Pendapatan: <span className="font-semibold text-green-600">{formatRupiah(totalPendapatan)}</span></span>
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="mt-5 pt-5 border-t border-slate-100 space-y-5">
                        <div className="grid grid-cols-3 gap-3">
                          <div className="bg-green-50 rounded-xl p-3 text-center">
                            <p className="text-xs text-slate-500 mb-1">Pendapatan</p>
                            <p className="font-bold text-sm text-green-700">{formatRupiah(totalPendapatan)}</p>
                          </div>
                          <div className="bg-slate-50 rounded-xl p-3 text-center">
                            <p className="text-xs text-slate-500 mb-1">Pengeluaran</p>
                            <p className="font-bold text-sm text-slate-700">{formatRupiah(totalPengeluaran)}</p>
                          </div>
                          <div className={`rounded-xl p-3 text-center ${keuntungan >= 0 ? "bg-green-50" : "bg-red-50"}`}>
                            <p className="text-xs text-slate-500 mb-1">Keuntungan</p>
                            <p className={`font-bold text-sm ${keuntungan >= 0 ? "text-green-700" : "text-red-700"}`}>
                              {keuntungan >= 0 ? "+" : ""}{formatRupiah(keuntungan)}
                            </p>
                          </div>
                        </div>

                        <div>
                          <p className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                            <Lock className="w-4 h-4 text-slate-400" /> Riwayat Pembelian
                          </p>
                          {submissions.length === 0 ? (
                            <p className="text-sm text-slate-400 italic">Belum ada submission</p>
                          ) : (
                            <div className="space-y-2">
                              {submissions.map((sub) => (
                                <div key={sub.id} className="bg-slate-50 rounded-xl p-3">
                                  <div className="flex justify-between items-center mb-2">
                                    <span className="font-semibold text-sm text-slate-700 flex items-center gap-1.5">
                                      <Lock className="w-3.5 h-3.5 text-slate-400" /> Hari ke-{sub.hari}
                                    </span>
                                    <span className="font-bold text-blue-700 text-sm">{formatRupiah(sub.totalHari)}</span>
                                  </div>
                                  {sub.entries.length === 0 ? (
                                    <p className="text-xs text-slate-400 italic">Tidak ada pembelian</p>
                                  ) : (
                                    <div className="space-y-1">
                                      {sub.entries.map((e, i) => (
                                        <div key={i} className="flex justify-between text-xs">
                                          <span className="text-slate-600">{e.namaKomponen} <span className="text-slate-400">× {e.jumlah} {e.satuan}</span></span>
                                          <span className="text-slate-700 font-medium">{formatRupiah(e.totalHarga)}</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {Object.keys(totalPerMaterial).length > 0 && (
                          <div>
                            <p className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                              <Package className="w-4 h-4 text-slate-400" /> Rekapan Total Material & SDM
                            </p>
                            <div className="overflow-x-auto rounded-xl border border-slate-200">
                              <table className="w-full text-xs">
                                <thead className="bg-slate-50">
                                  <tr className="text-left text-slate-500">
                                    <th className="px-3 py-2">Komponen</th>
                                    <th className="px-3 py-2 text-right">Total Qty</th>
                                    <th className="px-3 py-2 text-right">Total Biaya</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {Object.values(totalPerMaterial).map((m, i) => (
                                    <tr key={i} className="border-t border-slate-100">
                                      <td className="px-3 py-2 text-slate-700">{m.nama}</td>
                                      <td className="px-3 py-2 text-right text-slate-600">{m.jumlah} {m.satuan}</td>
                                      <td className="px-3 py-2 text-right font-semibold text-slate-700">{formatRupiah(m.total)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                                <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                                  <tr>
                                    <td className="px-3 py-2 font-bold text-slate-700" colSpan={2}>TOTAL</td>
                                    <td className="px-3 py-2 text-right font-bold text-blue-700">{formatRupiah(totalPengeluaran)}</td>
                                  </tr>
                                </tfoot>
                              </table>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* TAB: PEMBAYARAN */}
        {tab === "payments" && (
          <div className="space-y-4">
            <div className="card bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
              <div className="flex items-center gap-3">
                <CreditCard className="w-7 h-7 text-blue-600" />
                <div>
                  <h2 className="font-bold text-slate-800">Manajemen Pembayaran</h2>
                  <p className="text-xs text-slate-500">
                    Centang tahap setelah tim konfirmasi pembayaran. Bonus/penalti masing-masing {formatRupiah(BONUS_PENALTY_VALUE)}.
                  </p>
                </div>
              </div>
            </div>

            {summaries.length === 0 ? (
              <div className="card text-center py-12 text-slate-400">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Belum ada tim.</p>
              </div>
            ) : (
              summaries.map((summary) => {
                const stages = settings?.paymentStages ?? [];
                const totalBonus = summary.paymentStatuses.reduce((s, p) => s + (p.bonus ?? 0) * BONUS_PENALTY_VALUE, 0);
                const totalPenalty = summary.paymentStatuses.reduce((s, p) => s + (p.penalty ?? 0) * BONUS_PENALTY_VALUE, 0);

                return (
                  <div key={summary.team.id} className="card">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-bold text-slate-800 text-lg">{summary.team.namaTeam}</h3>
                      <div className="text-right">
                        <p className="text-xs text-slate-500">Total Pendapatan</p>
                        <p className="font-bold text-green-700">{formatRupiah(summary.totalPendapatan)}</p>
                      </div>
                    </div>

                    {totalBonus > 0 || totalPenalty > 0 ? (
                      <div className="flex gap-3 mb-4">
                        {totalBonus > 0 && (
                          <div className="flex items-center gap-1.5 text-xs bg-green-50 text-green-700 px-3 py-1.5 rounded-full font-semibold">
                            <span>+{formatRupiah(totalBonus)} bonus</span>
                          </div>
                        )}
                        {totalPenalty > 0 && (
                          <div className="flex items-center gap-1.5 text-xs bg-red-50 text-red-700 px-3 py-1.5 rounded-full font-semibold">
                            <span>-{formatRupiah(totalPenalty)} penalti</span>
                          </div>
                        )}
                      </div>
                    ) : null}

                    <div className="overflow-x-auto rounded-xl border border-slate-200">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50">
                          <tr className="text-left text-slate-500 text-xs">
                            <th className="px-3 py-2.5">Tahap</th>
                            <th className="px-3 py-2.5 text-right">Nominal</th>
                            <th className="px-3 py-2.5 text-center">Lunas</th>
                            <th className="px-3 py-2.5 text-center">Bonus</th>
                            <th className="px-3 py-2.5 text-center">Penalti</th>
                          </tr>
                        </thead>
                        <tbody>
                          {stages.map((stage) => {
                            const ps = summary.paymentStatuses.find((p) => p.stageId === stage.id);
                            const completed = ps?.completed ?? false;
                            const bonus = ps?.bonus ?? 0;
                            const penalty = ps?.penalty ?? 0;
                            const key = `${summary.team.id}_${stage.id}`;
                            const isSaving = savingPayment === key;

                            return (
                              <tr key={stage.id} className={`border-t border-slate-100 ${completed ? "bg-green-50/50" : ""}`}>
                                <td className="px-3 py-2.5">
                                  <span className={`font-medium ${completed ? "text-green-700" : "text-slate-700"}`}>
                                    {stage.label}
                                  </span>
                                </td>
                                <td className="px-3 py-2.5 text-right text-slate-600 font-medium">
                                  {formatRupiah(stage.nominal)}
                                </td>
                                <td className="px-3 py-2.5 text-center">
                                  <button
                                    onClick={() => handleTogglePayment(summary.team.id, stage.id, completed, bonus, penalty)}
                                    disabled={isSaving}
                                    className={`inline-flex items-center justify-center w-8 h-8 rounded-lg transition-all ${
                                      completed
                                        ? "bg-green-100 text-green-600 hover:bg-green-200"
                                        : "bg-slate-100 text-slate-400 hover:bg-slate-200"
                                    } ${isSaving ? "opacity-50" : ""}`}
                                  >
                                    {isSaving ? (
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : completed ? (
                                      <CheckCircle className="w-4 h-4" />
                                    ) : (
                                      <Circle className="w-4 h-4" />
                                    )}
                                  </button>
                                </td>
                                <td className="px-3 py-2.5 text-center">
                                  <div className="flex items-center justify-center gap-1">
                                    <button
                                      onClick={() => handleUpdateBonusPenalty(summary.team.id, stage.id, completed, Math.max(0, bonus - 1), penalty)}
                                      disabled={bonus === 0 || isSaving}
                                      className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center disabled:opacity-30 text-xs font-bold"
                                    >−</button>
                                    <span className={`w-5 text-center text-xs font-bold ${bonus > 0 ? "text-green-600" : "text-slate-400"}`}>
                                      {bonus > 0 ? `+${bonus}` : "0"}
                                    </span>
                                    <button
                                      onClick={() => handleUpdateBonusPenalty(summary.team.id, stage.id, completed, bonus + 1, penalty)}
                                      disabled={isSaving}
                                      className="w-6 h-6 rounded bg-green-100 hover:bg-green-200 text-green-700 flex items-center justify-center text-xs font-bold"
                                    >+</button>
                                  </div>
                                </td>
                                <td className="px-3 py-2.5 text-center">
                                  <div className="flex items-center justify-center gap-1">
                                    <button
                                      onClick={() => handleUpdateBonusPenalty(summary.team.id, stage.id, completed, bonus, Math.max(0, penalty - 1))}
                                      disabled={penalty === 0 || isSaving}
                                      className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center disabled:opacity-30 text-xs font-bold"
                                    >−</button>
                                    <span className={`w-5 text-center text-xs font-bold ${penalty > 0 ? "text-red-600" : "text-slate-400"}`}>
                                      {penalty > 0 ? `-${penalty}` : "0"}
                                    </span>
                                    <button
                                      onClick={() => handleUpdateBonusPenalty(summary.team.id, stage.id, completed, bonus, penalty + 1)}
                                      disabled={isSaving}
                                      className="w-6 h-6 rounded bg-red-100 hover:bg-red-200 text-red-700 flex items-center justify-center text-xs font-bold"
                                    >+</button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot className="border-t-2 border-slate-200 bg-slate-50">
                          <tr>
                            <td className="px-3 py-2.5 font-bold text-slate-700">TOTAL</td>
                            <td className="px-3 py-2.5 text-right font-bold text-slate-600">
                              {formatRupiah(stages.reduce((s, st) => s + st.nominal, 0))}
                            </td>
                            <td className="px-3 py-2.5 text-center text-xs text-slate-500">
                              {summary.paymentStatuses.filter((p) => p.completed).length}/{stages.length}
                            </td>
                            <td colSpan={2} className="px-3 py-2.5 text-center font-bold text-green-700">
                              {formatRupiah(summary.totalPendapatan)}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* TAB: LEADERBOARD */}
        {tab === "leaderboard" && (
          <div className="max-w-2xl mx-auto space-y-4">
            <div className="card bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-200">
              <div className="flex items-center gap-3">
                <Trophy className="w-8 h-8 text-yellow-500" />
                <div>
                  <h2 className="font-bold text-slate-800 text-lg">Leaderboard</h2>
                  <p className="text-xs text-slate-500">Ranking berdasarkan keuntungan (Pendapatan − Pengeluaran)</p>
                </div>
              </div>
            </div>
            {summaries.length === 0 ? (
              <div className="card text-center py-12 text-slate-400">
                <Trophy className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Belum ada tim untuk ditampilkan</p>
              </div>
            ) : (
              <Leaderboard summaries={summaries} settings={settings!} />
            )}
          </div>
        )}

        {/* TAB: KELOLA TIM */}
        {tab === "teams" && (
          <div className="max-w-lg space-y-4">
            <div className="card">
              <h2 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <Plus className="w-5 h-5 text-blue-600" /> Tambah Tim Baru
              </h2>
              <form onSubmit={handleAddTeam} className="flex gap-3">
                <input
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  className="input-field"
                  placeholder="Nama tim (contoh: Tim Alpha)"
                />
                <button type="submit" disabled={addingTeam || !newTeamName.trim()} className="btn-primary whitespace-nowrap flex items-center gap-1.5">
                  {addingTeam ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Tambah
                </button>
              </form>
            </div>
            <div className="card">
              <h2 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" /> Daftar Tim ({teams.length})
              </h2>
              {teams.length === 0 ? (
                <p className="text-slate-400 text-sm italic">Belum ada tim</p>
              ) : (
                <div className="space-y-2">
                  {teams.map((team, idx) => {
                    const summary = summaries.find((s) => s.team.id === team.id);
                    return (
                      <div key={team.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                        <div className="flex items-center gap-3">
                          <span className="w-8 h-8 bg-blue-100 text-blue-700 text-sm font-bold rounded-lg flex items-center justify-center">{idx + 1}</span>
                          <div>
                            <p className="font-medium text-slate-700">{team.namaTeam}</p>
                            {summary && (
                              <p className="text-xs text-slate-400">
                                {summary.submissions.length} submisi · {formatRupiah(summary.totalPengeluaran)} pengeluaran
                              </p>
                            )}
                          </div>
                        </div>
                        <button onClick={() => handleDeleteTeam(team.id, team.namaTeam)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB: PENGATURAN */}
        {tab === "settings" && (
          <form onSubmit={handleSaveSettings} className="space-y-5 max-w-2xl">
            <div className="card space-y-4">
              <h2 className="font-semibold text-slate-800 flex items-center gap-2">
                <Settings className="w-5 h-5 text-blue-600" /> Pengaturan Workshop
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nama Workshop</label>
                  <input className="input-field" value={settingsForm.namaWorkshop ?? ""} onChange={(e) => setSettingsForm((p) => ({ ...p, namaWorkshop: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Jumlah Hari</label>
                  <input type="number" min="1" className="input-field" value={settingsForm.jumlahHari ?? ""} onChange={(e) => setSettingsForm((p) => ({ ...p, jumlahHari: Number(e.target.value) }))} />
                  <p className="text-xs text-slate-400 mt-1">Tidak ada batas maksimal hari</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Password Admin</label>
                  <input type="text" className="input-field" value={settingsForm.adminPassword ?? ""} onChange={(e) => setSettingsForm((p) => ({ ...p, adminPassword: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Maks Pengeluaran (Rp)</label>
                  <input type="number" className="input-field" value={settingsForm.maxPengeluaran ?? ""} onChange={(e) => setSettingsForm((p) => ({ ...p, maxPengeluaran: Number(e.target.value) }))} />
                  <p className="text-xs text-slate-400 mt-1">{formatRupiah(settingsForm.maxPengeluaran ?? 0)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Total Nilai Project (Rp)</label>
                  <input type="number" className="input-field" value={settingsForm.jumlahPendapatan ?? ""} onChange={(e) => setSettingsForm((p) => ({ ...p, jumlahPendapatan: Number(e.target.value) }))} />
                  <p className="text-xs text-slate-400 mt-1">{formatRupiah(settingsForm.jumlahPendapatan ?? 0)}</p>
                </div>
              </div>
            </div>

            {/* Payment Stages */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-slate-800 flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-blue-600" /> Tahapan Pembayaran
                </h2>
                <button type="button" onClick={addPaymentStage} className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium">
                  <Plus className="w-4 h-4" /> Tambah Tahap
                </button>
              </div>
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr className="text-left text-slate-500 text-xs">
                      <th className="px-3 py-2.5">#</th>
                      <th className="px-3 py-2.5">Label</th>
                      <th className="px-3 py-2.5 w-40">Nominal (Rp)</th>
                      <th className="px-3 py-2.5 w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {settingsForm.paymentStages?.map((s, i) => (
                      <tr key={s.id} className="border-t border-slate-100">
                        <td className="px-3 py-1.5 text-slate-400 text-xs">{i + 1}</td>
                        <td className="px-3 py-1.5">
                          <input className="input-field text-xs" value={s.label} onChange={(e) => updateStage(i, "label", e.target.value)} />
                        </td>
                        <td className="px-3 py-1.5">
                          <input type="number" className="input-field text-xs" value={s.nominal} onChange={(e) => updateStage(i, "nominal", e.target.value)} />
                        </td>
                        <td className="px-3 py-1.5">
                          <button type="button" onClick={() => removePaymentStage(i)} className="p-1 text-red-400 hover:text-red-600 rounded">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                    <tr>
                      <td className="px-3 py-2.5 font-bold text-slate-700" colSpan={2}>TOTAL</td>
                      <td className="px-3 py-2.5 font-bold text-blue-700 text-xs">
                        {formatRupiah(settingsForm.paymentStages?.reduce((s, p) => s + p.nominal, 0) ?? 0)}
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
              <p className="text-xs text-slate-400 mt-2">⚠️ Perubahan nominal tidak mempengaruhi pembayaran yang sudah dicatat.</p>
            </div>

            {/* Materials */}
            <div className="card">
              <h2 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <Package className="w-5 h-5 text-blue-600" /> Data Material & SDM
              </h2>
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr className="text-left text-slate-500 text-xs">
                      <th className="px-3 py-2.5">#</th>
                      <th className="px-3 py-2.5">Nama Komponen</th>
                      <th className="px-3 py-2.5 w-24">Satuan</th>
                      <th className="px-3 py-2.5 w-36">Harga / Satuan (Rp)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {settingsForm.materials?.map((m, i) => (
                      <tr key={m.id} className="border-t border-slate-100">
                        <td className="px-3 py-1.5 text-slate-400 text-xs">{i + 1}</td>
                        <td className="px-3 py-1.5"><input className="input-field text-xs" value={m.namaKomponen} onChange={(e) => updateMaterial(i, "namaKomponen", e.target.value)} /></td>
                        <td className="px-3 py-1.5"><input className="input-field text-xs" value={m.satuan} onChange={(e) => updateMaterial(i, "satuan", e.target.value)} /></td>
                        <td className="px-3 py-1.5"><input type="number" className="input-field text-xs" value={m.hargaPerPcs} onChange={(e) => updateMaterial(i, "hargaPerPcs", e.target.value)} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-slate-400 mt-2">⚠️ Perubahan harga tidak mempengaruhi submission yang sudah ada.</p>
            </div>

            <button type="submit" disabled={savingSettings} className="btn-primary flex items-center gap-2">
              {savingSettings ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {savingSettings ? "Menyimpan..." : "Simpan Semua Pengaturan"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}