'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  WeightChartPoint,
  TimeRangeFilter,
} from '@/lib/services/weightService';
import { TrendingUp, Activity } from 'lucide-react';

interface WeightProgressChartsProps {
  points: WeightChartPoint[];
  weightUnit: string;
  selectedRange: TimeRangeFilter;
  onSelectRange: (range: TimeRangeFilter) => void;
}

export function WeightProgressCharts({
  points,
  weightUnit,
  selectedRange,
  onSelectRange,
}: WeightProgressChartsProps) {
  const [showMovingAvg, setShowMovingAvg] = useState(true);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Responsive measured width of container
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(600);

  useEffect(() => {
    if (!containerRef.current) return;
    const updateWidth = () => {
      if (containerRef.current) {
        const w = containerRef.current.clientWidth;
        if (w > 0) setContainerWidth(Math.round(w));
      }
    };
    updateWidth();

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect.width;
        if (w > 0) {
          setContainerWidth((prev) => (Math.abs(prev - w) > 2 ? Math.round(w) : prev));
        }
      }
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const rangeButtons: { id: TimeRangeFilter; label: string }[] = [
    { id: '1M', label: '1 Mese' },
    { id: '3M', label: '3 Mesi' },
    { id: '6M', label: '6 Mesi' },
    { id: '1Y', label: '1 Anno' },
    { id: 'ALL', label: 'Tutto' },
  ];

  // Calculate min and max bounds with padding
  const { minWeight, maxWeight, coords, avgCoords, svgWidth, svgHeight, padLeft, padRight, padTop, plotHeight } = useMemo(() => {
    const width = Math.max(280, containerWidth);
    const height = 220;
    const pLeft = 14;
    const pRight = 44;
    const pTop = 22;
    const pBottom = 26;
    const pWidth = Math.max(10, width - pLeft - pRight);
    const pHeight = Math.max(10, height - pTop - pBottom);

    if (points.length === 0) {
      return {
        minWeight: 0,
        maxWeight: 0,
        coords: [],
        avgCoords: [],
        svgWidth: width,
        svgHeight: height,
        padLeft: pLeft,
        padRight: pRight,
        padTop: pTop,
        plotHeight: pHeight,
      };
    }

    const weights = points.map((p) => p.weight);
    const avgs = points.map((p) => p.movingAvg7d);
    const allVals = showMovingAvg ? [...weights, ...avgs] : weights;

    let min = Math.min(...allVals);
    let max = Math.max(...allVals);

    if (min === max) {
      min = Math.max(0, min - 2);
      max = max + 2;
    } else {
      const padding = (max - min) * 0.15;
      min = Math.max(0, Math.floor((min - padding) * 10) / 10);
      max = Math.ceil((max + padding) * 10) / 10;
    }

    const n = points.length;
    const getX = (idx: number) =>
      n <= 1 ? pLeft + pWidth / 2 : pLeft + (idx / (n - 1)) * pWidth;
    const getY = (val: number) =>
      pTop + (1 - (val - min) / (max - min)) * pHeight;

    const c = points.map((p, idx) => ({
      x: getX(idx),
      y: getY(p.weight),
      point: p,
    }));

    const ac = points.map((p, idx) => ({
      x: getX(idx),
      y: getY(p.movingAvg7d),
      point: p,
    }));

    return {
      minWeight: min,
      maxWeight: max,
      coords: c,
      avgCoords: ac,
      svgWidth: width,
      svgHeight: height,
      padLeft: pLeft,
      padRight: pRight,
      padTop: pTop,
      plotHeight: pHeight,
    };
  }, [points, showMovingAvg, containerWidth]);

  // Generate SVG path strings
  const { linePath, areaPath, avgPath } = useMemo(() => {
    if (coords.length === 0) return { linePath: '', areaPath: '', avgPath: '' };

    if (coords.length === 1) {
      const p = coords[0];
      return {
        linePath: `M ${p.x - 10} ${p.y} L ${p.x + 10} ${p.y}`,
        areaPath: '',
        avgPath: '',
      };
    }

    // Build curved path using cubic beziers
    let lp = `M ${coords[0].x} ${coords[0].y}`;
    for (let i = 0; i < coords.length - 1; i++) {
      const current = coords[i];
      const next = coords[i + 1];
      const cpX1 = current.x + (next.x - current.x) * 0.45;
      const cpY1 = current.y;
      const cpX2 = current.x + (next.x - current.x) * 0.55;
      const cpY2 = next.y;
      lp += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${next.x} ${next.y}`;
    }

    const baselineY = padTop + plotHeight;
    const lastCoord = coords[coords.length - 1];
    const firstCoord = coords[0];
    const ap = `${lp} L ${lastCoord.x} ${baselineY} L ${firstCoord.x} ${baselineY} Z`;

    let avp = '';
    if (avgCoords.length > 1) {
      avp = `M ${avgCoords[0].x} ${avgCoords[0].y}`;
      for (let i = 0; i < avgCoords.length - 1; i++) {
        const cur = avgCoords[i];
        const nxt = avgCoords[i + 1];
        const cpX1 = cur.x + (nxt.x - cur.x) * 0.45;
        const cpY1 = cur.y;
        const cpX2 = cur.x + (nxt.x - cur.x) * 0.55;
        const cpY2 = nxt.y;
        avp += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${nxt.x} ${nxt.y}`;
      }
    }

    return { linePath: lp, areaPath: ap, avgPath: avp };
  }, [coords, avgCoords, padTop, plotHeight]);

  // Selected or active point for tooltip
  const activeIndex = hoveredIndex !== null ? hoveredIndex : points.length - 1;
  const activePoint = points[activeIndex];
  const activeCoord = coords[activeIndex];

  const midY = padTop + plotHeight / 2;
  const bottomY = padTop + plotHeight;
  const axisRightX = svgWidth - padRight;
  const labelX = axisRightX + 6;

  return (
    <div className="bg-white dark:bg-zinc-900/90 border border-slate-200/80 dark:border-zinc-800 rounded-3xl p-5 sm:p-7 shadow-xs flex flex-col gap-5">
      {/* Chart Top Bar: Range filters & settings */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-emerald-500" />
            <h3 className="font-bold text-base sm:text-lg text-slate-900 dark:text-zinc-100">
              Andamento nel Tempo
            </h3>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Tracciamento del peso corporeo con media mobile per filtrare le fluttuazioni idriche.
          </p>
        </div>

        {/* Range Buttons & Smooth Trend Toggle */}
        <div className="flex flex-wrap items-center gap-2">
          {/* 7d Moving Avg Toggle */}
          <button
            type="button"
            onClick={() => setShowMovingAvg((v) => !v)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              showMovingAvg
                ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30'
                : 'bg-slate-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 border border-transparent'
            }`}
            title="Attiva/Disattiva linea media mobile 7 giorni"
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Media 7gg</span>
          </button>

          {/* Range Pills */}
          <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-zinc-800/80 border border-slate-200/80 dark:border-zinc-700/60">
            {rangeButtons.map((btn) => (
              <button
                key={btn.id}
                type="button"
                onClick={() => onSelectRange(btn.id)}
                className={`relative px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  selectedRange === btn.id
                    ? 'text-slate-900 dark:text-zinc-100'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
                }`}
              >
                {selectedRange === btn.id && (
                  <motion.div
                    layoutId="activeWeightRange"
                    className="absolute inset-0 bg-white dark:bg-zinc-700 rounded-lg shadow-xs"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <span className="relative z-10">{btn.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* SVG Chart Surface Container */}
      <div ref={containerRef} className="relative w-full overflow-hidden select-none">
        {/* Active Point Floating Inspector */}
        <div className="flex items-center justify-between pb-2 text-xs min-h-[28px]">
          {activePoint && (
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-black text-slate-900 dark:text-zinc-100">
                  {activePoint.weight.toFixed(1)}
                </span>
                <span className="text-xs font-bold text-zinc-400">{weightUnit}</span>
              </div>
              <span className="text-zinc-400">•</span>
              <span className="font-semibold text-zinc-600 dark:text-zinc-300">
                {activePoint.displayDate}
              </span>
              {showMovingAvg && activePoint.movingAvg7d && (
                <>
                  <span className="text-zinc-400">•</span>
                  <span className="font-semibold text-amber-600 dark:text-amber-400">
                    Trend 7gg: {activePoint.movingAvg7d.toFixed(1)} {weightUnit}
                  </span>
                </>
              )}
              {activePoint.notes && (
                <span className="hidden md:inline-block px-2 py-0.5 rounded-md bg-slate-100 dark:bg-zinc-800 text-[11px] text-zinc-500 truncate max-w-xs">
                  &ldquo;{activePoint.notes}&rdquo;
                </span>
              )}
            </div>
          )}
        </div>

        {/* 1:1 Pixel Aspect Ratio SVG (No distortion/oval circles) */}
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full block overflow-visible touch-none"
          style={{ height: `${svgHeight}px`, width: '100%' }}
          onMouseLeave={() => setHoveredIndex(null)}
        >
          <defs>
            {/* Emerald gradient for weight area */}
            <linearGradient id="weightAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.32" />
              <stop offset="95%" stopColor="#10b981" stopOpacity="0.0" />
            </linearGradient>

            {/* Glowing filter */}
            <filter id="emeraldGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#10b981" floodOpacity="0.4" />
            </filter>
          </defs>

          {/* Grid lines (3 horizontal guideline levels) */}
          <line
            x1={padLeft}
            y1={padTop}
            x2={axisRightX}
            y2={padTop}
            stroke="currentColor"
            className="text-slate-100 dark:text-zinc-800/80"
            strokeDasharray="4 4"
            strokeWidth="1"
          />
          <text
            x={labelX}
            y={padTop + 3.5}
            textAnchor="start"
            className="text-[10px] font-bold fill-zinc-400 select-none"
          >
            {maxWeight}
          </text>

          <line
            x1={padLeft}
            y1={midY}
            x2={axisRightX}
            y2={midY}
            stroke="currentColor"
            className="text-slate-100 dark:text-zinc-800/80"
            strokeDasharray="4 4"
            strokeWidth="1"
          />
          <text
            x={labelX}
            y={midY + 3.5}
            textAnchor="start"
            className="text-[10px] font-bold fill-zinc-400 select-none"
          >
            {((maxWeight + minWeight) / 2).toFixed(1)}
          </text>

          <line
            x1={padLeft}
            y1={bottomY}
            x2={axisRightX}
            y2={bottomY}
            stroke="currentColor"
            className="text-slate-100 dark:text-zinc-800/80"
            strokeDasharray="4 4"
            strokeWidth="1"
          />
          <text
            x={labelX}
            y={bottomY + 3.5}
            textAnchor="start"
            className="text-[10px] font-bold fill-zinc-400 select-none"
          >
            {minWeight}
          </text>

          {/* Area Fill */}
          {areaPath && (
            <motion.path
              d={areaPath}
              fill="url(#weightAreaGrad)"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6 }}
            />
          )}

          {/* 7-Day Moving Average Line (Amber dashed) */}
          {showMovingAvg && avgPath && (
            <motion.path
              d={avgPath}
              fill="none"
              stroke="#f59e0b"
              strokeWidth="2.5"
              strokeDasharray="6 4"
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          )}

          {/* Main Weight Trend Line (Emerald solid) */}
          {linePath && (
            <motion.path
              d={linePath}
              fill="none"
              stroke="#10b981"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="url(#emeraldGlow)"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          )}

          {/* Hover guideline */}
          {activeCoord && (
            <line
              x1={activeCoord.x}
              y1={padTop}
              x2={activeCoord.x}
              y2={bottomY}
              stroke="#10b981"
              strokeWidth="1.5"
              strokeDasharray="3 3"
              opacity="0.6"
            />
          )}

          {/* Clickable / Touch-friendly nodes along the path */}
          {coords.map((c, idx) => {
            const isHovered = activeIndex === idx;

            return (
              <g
                key={c.point.id || idx}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredIndex(idx)}
                onClick={() => setHoveredIndex(idx)}
              >
                {/* Invisible large touch target */}
                <circle cx={c.x} cy={c.y} r="16" fill="transparent" />

                {/* Visible Data Dot - Perfect Circle */}
                <circle
                  cx={c.x}
                  cy={c.y}
                  r={isHovered ? 5.5 : 3.5}
                  className={
                    isHovered
                      ? 'fill-emerald-500 stroke-white dark:stroke-zinc-950 stroke-2 transition-all'
                      : 'fill-emerald-600 dark:fill-emerald-400 stroke-white dark:stroke-zinc-900 stroke-1 transition-all'
                  }
                />
              </g>
            );
          })}
        </svg>

        {/* X-Axis Dates Labels */}
        <div
          className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-zinc-800 text-[10px] font-bold text-zinc-400"
          style={{ paddingLeft: `${padLeft}px`, paddingRight: `${padRight}px` }}
        >
          <span>{points[0]?.displayDate}</span>
          {points.length > 2 && (
            <span>{points[Math.floor(points.length / 2)]?.displayDate}</span>
          )}
          <span>{points[points.length - 1]?.displayDate}</span>
        </div>
      </div>
    </div>
  );
}
