"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getWorkshopSettings, initializeWorkshop, getTeams } from "@/lib/db";
import { WorkshopSettings, Team } from "@/types";
import { formatRupiah } from "@/lib/utils";
import { Building2, Users, Shield, ChevronRight, Loader2 } from "lucide-react";

export default function HomePage() {
  const router = useRouter();
  const [settings, setSettings] = useState<WorkshopSettings | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [adminPw, setAdminPw] = useState("");
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminError, setAdminError] = useState("");
  const [initializing, setInitializing] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      let ws = await getWorkshopSettings();
      if (!ws) {
        setInitializing(true);
        ws = await initializeWorkshop();
        setInitializing(false);
      }
      setSettings(ws);
      const t = await getTeams();
      setTeams(t);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  function handleTeamSelect(teamId: string) {
    sessionStorage.setItem("selectedTeamId", teamId);
    router.push(`/team`);
  }

  function handleAdminLogin(e: React.FormEvent) {
    e.preventDefault();
    if (adminPw === settings?.adminPassword) {
      sessionStorage.setItem("isAdmin", "true");
      router.push("/admin");
    } else {
      setAdminError("Password salah!");
      setAdminPw("");
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600 mx-auto mb-3" />
          <p className="text-slate-500">
            {initializing ? "Menginisialisasi workshop..." : "Memuat data..."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-700">
      <div className="pt-12 pb-8 px-4 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-2xl mb-4">
          <Building2 className="w-9 h-9 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">
          {settings?.namaWorkshop ?? "Workshop BRICS"}
        </h1>
        <p className="text-blue-200 text-sm">Simulasi Pembangunan</p>
        <div className="flex items-center justify-center gap-6 mt-4 text-sm text-blue-200">
          <span>📅 {settings?.jumlahHari} Hari</span>
          <span>
            🏆 Nilai Project: {formatRupiah(settings?.maxPengeluaran ?? 0)}
          </span>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pb-12">
        {!showAdminLogin ? (
          <>
            <div className="bg-white rounded-2xl shadow-xl p-6 mb-4">
              <div className="flex items-center gap-2 mb-5">
                <Users className="w-5 h-5 text-blue-600" />
                <h2 className="text-lg font-semibold text-slate-800">
                  Pilih Tim Anda
                </h2>
              </div>
              {teams.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <Users className="w-10 h-10 mx-auto mb-2 opacity-40" />
                  <p>Belum ada tim. Hubungi penyelenggara.</p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {teams.map((team, idx) => (
                    <button
                      key={team.id}
                      onClick={() => handleTeamSelect(team.id)}
                      className="flex items-center justify-between w-full p-4 rounded-xl border-2 border-slate-200 hover:border-blue-500 hover:bg-blue-50 transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-lg">
                          {idx + 1}
                        </div>
                        <span className="font-semibold text-slate-700 group-hover:text-blue-700">
                          {team.namaTeam}
                        </span>
                      </div>
                      <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-blue-500" />
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={() => setShowAdminLogin(true)}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors text-sm"
            >
              <Shield className="w-4 h-4" /> Masuk sebagai Penyelenggara
            </button>
          </>
        ) : (
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <div className="flex items-center gap-2 mb-5">
              <Shield className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-slate-800">
                Login Penyelenggara
              </h2>
            </div>
            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  value={adminPw}
                  onChange={(e) => {
                    setAdminPw(e.target.value);
                    setAdminError("");
                  }}
                  className="input-field"
                  placeholder="Masukkan password penyelenggara"
                  autoFocus
                />
                {adminError && (
                  <p className="text-red-600 text-xs mt-1">{adminError}</p>
                )}
              </div>
              <div className="flex gap-3">
                <button type="submit" className="btn-primary flex-1">
                  Masuk
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAdminLogin(false);
                    setAdminError("");
                    setAdminPw("");
                  }}
                  className="btn-secondary flex-1"
                >
                  Batal
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
