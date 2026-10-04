'use client';

import React from 'react';
import { ExerciseProgressData, WeeklyProgressPoint } from '@/lib/services/workoutService';
import {
  TrendingUp,
  BarChart3,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Dumbbell,
  Calendar,
} from 'lucide-react';
import { motion } from 'framer-motion';

interface ExerciseProgressChartsProps {
  data: ExerciseProgressData;
  weightUnit: string;
}

export function ExerciseProgressCharts({ data, weightUnit }: ExerciseProgressChartsProps) {
  const { weeklyPoints, allTimeMaxWeight, allTimeTotalVolume, totalWorkouts, exerciseName } = data;

  if (weeklyPoints.length === 0) {
    return (
      <div className="p-8 text-center bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800">
        <p className="text-sm text-zinc-500">
          Nessun dato registrato per &quot;{exerciseName}&quot;. Completa una sessione per vedere i grafici.
        </p>
      </div>
    );
  }

  // Calculate highest volume in points for chart scaling
  const maxWeeklyVolume = Math.max(...weeklyPoints.map((p) => p.totalVolume), 1);
  const maxWeeklyWeight = Math.max(...weeklyPoints.map((p) => p.maxWeight), 1);

  // Latest week stats vs previous
  const latestPoint = weeklyPoints[weeklyPoints.length - 1];

  return (
    <div className="flex flex-col gap-6">
      {/* 1. TOP OVERVIEW KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        {/* All-time Max Weight */}
        <div className="bg-white dark:bg-zinc-900/90 border border-slate-200/80 dark:border-zinc-800 rounded-3xl p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
              Carico Massimo
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-slate-900 dark:text-zinc-100">
                {allTimeMaxWeight}
              </span>
              <span className="text-xs font-bold text-zinc-400">{weightUnit}</span>
            </div>
          </div>
        </div>

        {/* All-time Total Volume */}
        <div className="bg-white dark:bg-zinc-900/90 border border-slate-200/80 dark:border-zinc-800 rounded-3xl p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-teal-500/15 text-teal-600 dark:text-teal-400 flex items-center justify-center">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
              Volume Cumulativo
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-slate-900 dark:text-zinc-100">
                {allTimeTotalVolume.toLocaleString('it-IT')}
              </span>
              <span className="text-xs font-bold text-zinc-400">{weightUnit}</span>
            </div>
          </div>
        </div>

        {/* Total Sessions */}
        <div className="bg-white dark:bg-zinc-900/90 border border-slate-200/80 dark:border-zinc-800 rounded-3xl p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <Dumbbell className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
              Sessioni Registrate
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-slate-900 dark:text-zinc-100">
                {totalWorkouts}
              </span>
              <span className="text-xs font-bold text-zinc-400">workout</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. MAX WEIGHT WEEK-BY-WEEK CHART */}
      <div className="bg-white dark:bg-zinc-900/90 border border-slate-200/80 dark:border-zinc-800 rounded-3xl p-5 sm:p-7 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
              <h3 className="font-bold text-base sm:text-lg text-slate-900 dark:text-zinc-100">
                Progressione Carico Massimo
              </h3>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Picco di carico ({weightUnit}) registrato settimana per settimana.
            </p>
          </div>

          {latestPoint.weightChangePct !== null && latestPoint.weightChangePct !== undefined && (
            <div
              className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl font-bold text-xs ${
                latestPoint.weightChangePct > 0
                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30'
                  : latestPoint.weightChangePct < 0
                  ? 'bg-red-500/15 text-red-700 dark:text-red-400 border border-red-500/30'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300'
              }`}
            >
              {latestPoint.weightChangePct > 0 ? (
                <ArrowUpRight className="w-3.5 h-3.5" />
              ) : latestPoint.weightChangePct < 0 ? (
                <ArrowDownRight className="w-3.5 h-3.5" />
              ) : (
                <Minus className="w-3.5 h-3.5" />
              )}
              <span>
                {latestPoint.weightChangePct > 0 ? '+' : ''}
                {latestPoint.weightChangePct}% rispetto alla settimana prec.
              </span>
            </div>
          )}
        </div>

        {/* Visual Bar Chart for Max Weight */}
        <div className="flex items-end gap-3 sm:gap-6 h-56 pt-8 pb-4 overflow-x-auto border-b border-slate-100 dark:border-zinc-800">
          {weeklyPoints.map((pt, idx) => {
            const heightPct = Math.max(15, Math.round((pt.maxWeight / maxWeeklyWeight) * 100));

            return (
              <div
                key={pt.weekKey}
                className="flex-1 min-w-[56px] sm:min-w-[72px] flex flex-col items-center justify-end h-full group"
              >
                {/* Tooltip on top of bar */}
                <div className="mb-2 text-center">
                  <span className="block text-xs font-black text-zinc-900 dark:text-zinc-100">
                    {pt.maxWeight} {weightUnit}
                  </span>
                  {pt.weightChangePct !== null && pt.weightChangePct !== undefined && (
                    <span
                      className={`text-[10px] font-bold ${
                        pt.weightChangePct > 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : pt.weightChangePct < 0
                          ? 'text-red-500'
                          : 'text-zinc-400'
                      }`}
                    >
                      {pt.weightChangePct > 0 ? `+${pt.weightChangePct}%` : `${pt.weightChangePct}%`}
                    </span>
                  )}
                </div>

                {/* Animated Bar */}
                <div className="w-full max-w-[48px] bg-slate-100 dark:bg-zinc-800 rounded-2xl p-1 h-full flex items-end">
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${heightPct}%` }}
                    transition={{ duration: 0.5, delay: idx * 0.05 }}
                    className="w-full bg-linear-to-t from-emerald-600 to-teal-400 rounded-xl shadow-md shadow-emerald-500/20 group-hover:brightness-110 transition-all"
                  />
                </div>

                {/* Week Label */}
                <span className="text-[10px] font-bold text-zinc-400 truncate max-w-[70px] mt-2 text-center">
                  {pt.weekLabel.split('-')[0]}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. TOTAL VOLUME WEEK-BY-WEEK CHART */}
      <div className="bg-white dark:bg-zinc-900/90 border border-slate-200/80 dark:border-zinc-800 rounded-3xl p-5 sm:p-7 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 className="w-4 h-4 text-teal-500" />
              <h3 className="font-bold text-base sm:text-lg text-slate-900 dark:text-zinc-100">
                Progressione Volume Totale (Tonnellaggio)
              </h3>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Volume settimanale calcolato come (serie × reps × carico).
            </p>
          </div>

          {latestPoint.volumeChangePct !== null && latestPoint.volumeChangePct !== undefined && (
            <div
              className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl font-bold text-xs ${
                latestPoint.volumeChangePct > 0
                  ? 'bg-teal-500/15 text-teal-700 dark:text-teal-400 border border-teal-500/30'
                  : latestPoint.volumeChangePct < 0
                  ? 'bg-red-500/15 text-red-700 dark:text-red-400 border border-red-500/30'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300'
              }`}
            >
              {latestPoint.volumeChangePct > 0 ? (
                <ArrowUpRight className="w-3.5 h-3.5" />
              ) : latestPoint.volumeChangePct < 0 ? (
                <ArrowDownRight className="w-3.5 h-3.5" />
              ) : (
                <Minus className="w-3.5 h-3.5" />
              )}
              <span>
                {latestPoint.volumeChangePct > 0 ? '+' : ''}
                {latestPoint.volumeChangePct}% volume
              </span>
            </div>
          )}
        </div>

        {/* Visual Bar Chart for Volume */}
        <div className="flex items-end gap-3 sm:gap-6 h-56 pt-8 pb-4 overflow-x-auto border-b border-slate-100 dark:border-zinc-800">
          {weeklyPoints.map((pt, idx) => {
            const heightPct = Math.max(15, Math.round((pt.totalVolume / maxWeeklyVolume) * 100));

            return (
              <div
                key={pt.weekKey}
                className="flex-1 min-w-[56px] sm:min-w-[72px] flex flex-col items-center justify-end h-full group"
              >
                {/* Tooltip */}
                <div className="mb-2 text-center">
                  <span className="block text-xs font-black text-zinc-900 dark:text-zinc-100">
                    {pt.totalVolume.toLocaleString('it-IT')}
                  </span>
                  {pt.volumeChangePct !== null && pt.volumeChangePct !== undefined && (
                    <span
                      className={`text-[10px] font-bold ${
                        pt.volumeChangePct > 0
                          ? 'text-teal-600 dark:text-teal-400'
                          : pt.volumeChangePct < 0
                          ? 'text-red-500'
                          : 'text-zinc-400'
                      }`}
                    >
                      {pt.volumeChangePct > 0 ? `+${pt.volumeChangePct}%` : `${pt.volumeChangePct}%`}
                    </span>
                  )}
                </div>

                {/* Animated Volume Bar */}
                <div className="w-full max-w-[48px] bg-slate-100 dark:bg-zinc-800 rounded-2xl p-1 h-full flex items-end">
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${heightPct}%` }}
                    transition={{ duration: 0.5, delay: idx * 0.05 }}
                    className="w-full bg-linear-to-t from-teal-600 to-cyan-400 rounded-xl shadow-md shadow-teal-500/20 group-hover:brightness-110 transition-all"
                  />
                </div>

                {/* Week Label */}
                <span className="text-[10px] font-bold text-zinc-400 truncate max-w-[70px] mt-2 text-center">
                  {pt.weekLabel.split('-')[0]}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. DETAILED WEEK-BY-WEEK BREAKDOWN TABLE */}
      <div className="bg-white dark:bg-zinc-900/90 border border-slate-200/80 dark:border-zinc-800 rounded-3xl p-5 sm:p-7 shadow-xs">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-4 h-4 text-emerald-500" />
          <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">
            Dettaglio Storico Settimanale
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200/80 dark:border-zinc-800 text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                <th className="py-2.5 px-3">Settimana</th>
                <th className="py-2.5 px-3">Carico Max</th>
                <th className="py-2.5 px-3">Var. Carico</th>
                <th className="py-2.5 px-3">Volume Totale</th>
                <th className="py-2.5 px-3">Var. Volume</th>
                <th className="py-2.5 px-3 text-right">Serie</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/80 font-medium">
              {[...weeklyPoints].reverse().map((pt) => (
                <tr
                  key={pt.weekKey}
                  className="hover:bg-slate-50 dark:hover:bg-zinc-800/40 transition-colors"
                >
                  <td className="py-3 px-3 font-semibold text-zinc-900 dark:text-zinc-100">
                    {pt.weekLabel}
                  </td>
                  <td className="py-3 px-3 font-bold text-emerald-600 dark:text-emerald-400">
                    {pt.maxWeight} {weightUnit}
                  </td>
                  <td className="py-3 px-3">
                    {pt.weightChangePct !== null && pt.weightChangePct !== undefined ? (
                      <span
                        className={`font-bold ${
                          pt.weightChangePct > 0
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : pt.weightChangePct < 0
                            ? 'text-red-500'
                            : 'text-zinc-400'
                        }`}
                      >
                        {pt.weightChangePct > 0 ? `+${pt.weightChangePct}%` : `${pt.weightChangePct}%`}
                      </span>
                    ) : (
                      <span className="text-zinc-400">—</span>
                    )}
                  </td>
                  <td className="py-3 px-3 font-bold text-zinc-900 dark:text-zinc-100">
                    {pt.totalVolume.toLocaleString('it-IT')} {weightUnit}
                  </td>
                  <td className="py-3 px-3">
                    {pt.volumeChangePct !== null && pt.volumeChangePct !== undefined ? (
                      <span
                        className={`font-bold ${
                          pt.volumeChangePct > 0
                            ? 'text-teal-600 dark:text-teal-400'
                            : pt.volumeChangePct < 0
                            ? 'text-red-500'
                            : 'text-zinc-400'
                        }`}
                      >
                        {pt.volumeChangePct > 0 ? `+${pt.volumeChangePct}%` : `${pt.volumeChangePct}%`}
                      </span>
                    ) : (
                      <span className="text-zinc-400">—</span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-right text-zinc-500 dark:text-zinc-400">
                    {pt.totalSets}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
