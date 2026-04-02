// src/components/Leaderboard.tsx
"use client";
import { TeamSummary, WorkshopSettings } from "@/types";
import { formatRupiah, getSpendingStatus } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface Props {
  summaries: TeamSummary[];
  settings: WorkshopSettings;
}

export default function Leaderboard({ summaries, settings }: Props) {
  const ranked = [...summaries].sort((a, b) => {
    const kA = a.totalPendapatan - a.totalPengeluaran;
    const kB = b.totalPendapatan - b.totalPengeluaran;
    return kB - kA;
  });

  const medals = ["🥇", "🥈", "🥉"];

  return (
    <div className="space-y-3">
      {ranked.map((summary, idx) => {
        const keuntungan = summary.totalPendapatan - summary.totalPengeluaran;
        // Budget = payments received (totalPendapatan)
        const status = getSpendingStatus(summary.totalPengeluaran, summary.totalPendapatan);
        const pct = summary.totalPendapatan > 0
          ? Math.min((summary.totalPengeluaran / summary.totalPendapatan) * 100, 100)
          : 0;
        const stagesCompleted = summary.paymentStatuses.filter((p) => p.completed).length;

        return (
          <div
            key={summary.team.id}
            className={`card border-l-4 ${
              idx === 0 ? "border-l-yellow-400"
              : idx === 1 ? "border-l-slate-400"
              : idx === 2 ? "border-l-amber-600"
              : "border-l-slate-200"
            }`}
          >
            <div className="flex items-center gap-4">
              <div className="text-2xl w-10 text-center flex-shrink-0">
                {idx < 3 ? medals[idx] : (
                  <span className="text-slate-400 font-bold text-lg">{idx + 1}</span>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-bold text-slate-800">{summary.team.namaTeam}</p>
                  <div className="flex items-center gap-2">
                    {keuntungan > 0 ? (
                      <TrendingUp className="w-4 h-4 text-green-500" />
                    ) : keuntungan < 0 ? (
                      <TrendingDown className="w-4 h-4 text-red-500" />
                    ) : (
                      <Minus className="w-4 h-4 text-slate-400" />
                    )}
                    <span className={`font-bold text-sm ${keuntungan >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {keuntungan >= 0 ? "+" : ""}{formatRupiah(keuntungan)}
                    </span>
                  </div>
                </div>

                <div className="w-full bg-slate-200 rounded-full h-2 mb-1.5">
                  <div
                    className={`${status.barColor} h-2 rounded-full transition-all`}
                    style={{ width: `${pct}%` }}
                  />
                </div>

                <div className="flex justify-between text-xs text-slate-500">
                  <span>
                    Pengeluaran:{" "}
                    <span className="font-semibold text-slate-700">{formatRupiah(summary.totalPengeluaran)}</span>
                  </span>
                  <span>
                    Anggaran:{" "}
                    <span className="font-semibold text-green-700">{formatRupiah(summary.totalPendapatan)}</span>
                  </span>
                </div>

                <div className="mt-1 text-xs text-slate-400">
                  {stagesCompleted}/{settings.paymentStages?.length ?? 0} tahap pembayaran lunas
                  {" · "}
                  <span className={`font-semibold ${status.color}`}>{status.label}</span>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
