"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  getWorkshopSettings,
  updateWorkshopSettings,
  getTeams,
  createTeam,
  deleteTeam,
  getAllSubmissions,
} from "@/lib/db";
import { WorkshopSettings, Team, DailySubmission, TeamSummary } from "@/types";
import { formatRupiah, getSpendingStatus } from "@/lib/utils";
import { exportRekapCSV } from "@/lib/exportExcel";
import Leaderboard from "@/components/Leaderboard";
import {
  Settings, Users, BarChart3, Plus, Trash2, Save,
  Loader2, LogOut, RefreshCw, ChevronDown, ChevronUp,
  Lock, Package, Trophy, Download,
} from "lucide-react";

type Tab = "monitor" | "leaderboard" | "teams" | "settings";

export default function AdminPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("monitor");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [settings, setSettings] = useState<WorkshopSettings | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [summaries, setSummaries] = useState<TeamSummary[]>([]);
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null);
  const [newTeamName, setNewTeamName] = useState("");
  const [addingTeam, setAddingTeam] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsForm, setSettingsForm] = useState<Partial<WorkshopSettings>>({});

  useEffect(() => {
    if (!sessionStorage.getItem("isAdmin")) { router.push("/"); return; }
    load();
  }, []);

  async function load() {
    setRefreshing(true);
    try {
      const [ws, t, allSubs] = await Promise.all([
        getWorkshopSettings(),
        getTeams(),
        getAllSubmissions(),
      ]);
      if (!ws) { router.push("/"); return; }
      setSettings(ws);
      setTeams(t);
      setSettingsForm({
        namaWorkshop: ws.namaWorkshop,
        jumlahHari: ws.jumlahHari,
        maxPengeluaran: ws.maxPengeluaran,
        jumlahPendapatan: ws.jumlahPendapatan,
        adminPassword: ws.adminPassword,
        materials: ws.materials.map(m => ({ ...m })),
      });
      setSummaries(buildSummaries(t, allSubs));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  function buildSummaries(t: Team[], allSubs: DailySubmission[]): TeamSummary[] {
    return t.map(team => {
      const teamSubs = allSubs.filter(s => s.teamId === team.id);
      const totalPengeluaran = teamSubs.reduce((s, sub) => s + sub.totalHari, 0);
      const totalPerMaterial: TeamSummary["totalPerMaterial"] = {};
      teamSubs.forEach(sub => {
        sub.entries.forEach(e => {
          if (!totalPerMaterial[e.materialId]) {
            totalPerMaterial[e.materialId] = { jumlah: 0, total: 0, nama: e.namaKomponen, satuan: e.satuan };
          }
          totalPerMaterial[e.materialId].jumlah += e.jumlah;
          totalPerMaterial[e.materialId].total += e.totalHarga;
        });
      });
      return { team, submissions: teamSubs, totalPengeluaran, totalPerMaterial };
    });
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
    });
    await load();
    setSavingSettings(false);
    alert("Pengaturan berhasil disimpan!");
  }

  function updateMaterial(idx: number, field: string, val: string) {
    setSettingsForm(prev => ({
      ...prev,
      materials: prev.materials?.map((m, i) =>
        i === idx ? { ...m, [field]: field === "hargaPerPcs" ? Number(val) : val } : m
      ),
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
                { label: "Nilai Project", value: formatRupiah(settings?.jumlahPendapatan ?? 0), sub: "pendapatan", color: "text-green-700" },
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
                const { team, submissions, totalPengeluaran, totalPerMaterial } = summary;
                const status = getSpendingStatus(totalPengeluaran, settings?.maxPengeluaran ?? 1);
                const isExpanded = expandedTeam === team.id;
                const pct = (totalPengeluaran / (settings?.maxPengeluaran ?? 1)) * 100;
                const keuntungan = (settings?.jumlahPendapatan ?? 0) - totalPengeluaran;

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
                          <p className="text-xs text-slate-500">{submissions.length}/{settings?.jumlahHari} hari diisi</p>
                        </div>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2.5">
                        <div className={`${status.barColor} h-2.5 rounded-full`} style={{ width: `${Math.min(pct, 100)}%` }} />
                      </div>
                      <div className="flex justify-between text-xs text-slate-400 mt-1">
                        <span>Terpakai: <span className="font-semibold text-slate-600">{formatRupiah(totalPengeluaran)}</span> ({pct.toFixed(0)}%)</span>
                        <span>Sisa: <span className="font-semibold text-slate-600">{formatRupiah(Math.max(0, (settings?.maxPengeluaran ?? 0) - totalPengeluaran))}</span></span>
                      </div>
                    </button>

                    {/* Day dots */}
                    <div className="flex items-center gap-1.5 mt-3">
                      {Array.from({ length: settings?.jumlahHari ?? 0 }, (_, i) => {
                        const sub = submissions.find(s => s.hari === i + 1);
                        return (
                          <div key={i} title={sub ? `Hari ${i+1}: ${formatRupiah(sub.totalHari)}` : `Hari ${i+1}: Belum`}
                            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${sub ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-400"}`}>
                            {i + 1}
                          </div>
                        );
                      })}
                    </div>

                    {isExpanded && (
                      <div className="mt-5 pt-5 border-t border-slate-100 space-y-5">
                        <div className="grid grid-cols-3 gap-3">
                          <div className="bg-blue-50 rounded-xl p-3 text-center">
                            <p className="text-xs text-slate-500 mb-1">Pendapatan</p>
                            <p className="font-bold text-sm text-blue-700">{formatRupiah(settings?.jumlahPendapatan ?? 0)}</p>
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
                            <Lock className="w-4 h-4 text-slate-400" /> Riwayat per Hari
                          </p>
                          {submissions.length === 0 ? (
                            <p className="text-sm text-slate-400 italic">Belum ada submission</p>
                          ) : (
                            <div className="space-y-2">
                              {submissions.map(sub => (
                                <div key={sub.id} className="bg-slate-50 rounded-xl p-3">
                                  <div className="flex justify-between items-center mb-2">
                                    <span className="font-semibold text-sm text-slate-700 flex items-center gap-1.5">
                                      <Lock className="w-3.5 h-3.5 text-slate-400" /> Hari ke-{sub.hari}
                                    </span>
                                    <span className="font-bold text-blue-700 text-sm">{formatRupiah(sub.totalHari)}</span>
                                  </div>
                                  <div className="space-y-1">
                                    {sub.entries.map((e, i) => (
                                      <div key={i} className="flex justify-between text-xs">
                                        <span className="text-slate-600">{e.namaKomponen} <span className="text-slate-400">× {e.jumlah} {e.satuan}</span></span>
                                        <span className="text-slate-700 font-medium">{formatRupiah(e.totalHarga)}</span>
                                      </div>
                                    ))}
                                  </div>
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
                  onChange={e => setNewTeamName(e.target.value)}
                  className="input-field"
                  placeholder="Nama tim (contoh: Tim Alpha)"
                />
                <button type="submit" disabled={addingTeam || !newTeamName.trim()} className="btn-primary whitespace-nowrap flex items-center gap-1.5">
                  {addingTeam ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Tambah
                </button>
              </form>
              <p className="text-xs text-slate-400 mt-2">Disarankan 3–4 tim per workshop</p>
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
                    const summary = summaries.find(s => s.team.id === team.id);
                    return (
                      <div key={team.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                        <div className="flex items-center gap-3">
                          <span className="w-8 h-8 bg-blue-100 text-blue-700 text-sm font-bold rounded-lg flex items-center justify-center">{idx + 1}</span>
                          <div>
                            <p className="font-medium text-slate-700">{team.namaTeam}</p>
                            {summary && <p className="text-xs text-slate-400">{summary.submissions.length} hari diisi · {formatRupiah(summary.totalPengeluaran)}</p>}
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
                  <input className="input-field" value={settingsForm.namaWorkshop ?? ""} onChange={e => setSettingsForm(p => ({ ...p, namaWorkshop: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Jumlah Hari</label>
                  <input type="number" min="1" max="30" className="input-field" value={settingsForm.jumlahHari ?? ""} onChange={e => setSettingsForm(p => ({ ...p, jumlahHari: Number(e.target.value) }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Password Admin</label>
                  <input type="text" className="input-field" value={settingsForm.adminPassword ?? ""} onChange={e => setSettingsForm(p => ({ ...p, adminPassword: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Maks Pengeluaran (Rp)</label>
                  <input type="number" className="input-field" value={settingsForm.maxPengeluaran ?? ""} onChange={e => setSettingsForm(p => ({ ...p, maxPengeluaran: Number(e.target.value) }))} />
                  <p className="text-xs text-slate-400 mt-1">{formatRupiah(settingsForm.maxPengeluaran ?? 0)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Total Nilai Project (Rp)</label>
                  <input type="number" className="input-field" value={settingsForm.jumlahPendapatan ?? ""} onChange={e => setSettingsForm(p => ({ ...p, jumlahPendapatan: Number(e.target.value) }))} />
                  <p className="text-xs text-slate-400 mt-1">{formatRupiah(settingsForm.jumlahPendapatan ?? 0)}</p>
                </div>
              </div>
            </div>

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
                        <td className="px-3 py-1.5"><input className="input-field text-xs" value={m.namaKomponen} onChange={e => updateMaterial(i, "namaKomponen", e.target.value)} /></td>
                        <td className="px-3 py-1.5"><input className="input-field text-xs" value={m.satuan} onChange={e => updateMaterial(i, "satuan", e.target.value)} /></td>
                        <td className="px-3 py-1.5"><input type="number" className="input-field text-xs" value={m.hargaPerPcs} onChange={e => updateMaterial(i, "hargaPerPcs", e.target.value)} /></td>
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
