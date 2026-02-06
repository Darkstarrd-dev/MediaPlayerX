import { useState, useEffect, useCallback, useMemo, useRef } from "react";

// ─── Constants ───────────────────────────────────────────────────────────────
const TARGET_RATIO = 3 / 4; // width / height = 0.75
const RATIO_TOLERANCE = 0.1;
const MIN_RATIO = TARGET_RATIO * (1 - RATIO_TOLERANCE); // 0.675
const MAX_RATIO = TARGET_RATIO * (1 + RATIO_TOLERANCE); // 0.825
const MIN_DIM = 36;
const DEDUP_THRESHOLD = 1.18;

const CANVAS_MIN_W = 200;
const CANVAS_MAX_W = 1400;
const CANVAS_MIN_H = 150;
const CANVAS_MAX_H = 900;

// ─── Types ───────────────────────────────────────────────────────────────────
interface TileConfig {
  cols: number;
  rows: number;
  tileW: number;
  tileH: number;
  gap: number;
  marginX: number;
  marginY: number;
  gridW: number;
  gridH: number;
  totalTiles: number;
  utilization: number;
  ratio: number;
  ratioDeviation: number;
}

// ─── Algorithm ───────────────────────────────────────────────────────────────
function calcConfig(
  canvasW: number,
  canvasH: number,
  cols: number,
  rows: number,
  gap: number,
): TileConfig | null {
  if (cols <= 0 || rows <= 0 || canvasW <= 0 || canvasH <= 0) return null;

  // Maximum possible tile dimensions that fill the space
  const maxW = (canvasW - (cols - 1) * gap) / cols;
  const maxH = (canvasH - (rows - 1) * gap) / rows;

  if (maxW < MIN_DIM || maxH < MIN_DIM) return null;

  let tileW: number;
  let tileH: number;
  const cellRatio = maxW / maxH;

  if (cellRatio >= MIN_RATIO && cellRatio <= MAX_RATIO) {
    // Cell naturally falls within the acceptable ratio range
    tileW = maxW;
    tileH = maxH;
  } else if (cellRatio < MIN_RATIO) {
    // Cell is too tall/narrow: keep full width, reduce height
    tileW = maxW;
    tileH = maxW / MIN_RATIO;
  } else {
    // Cell is too wide: keep full height, reduce width
    tileH = maxH;
    tileW = maxH * MAX_RATIO;
  }

  if (tileW < MIN_DIM || tileH < MIN_DIM) return null;

  const gridW = cols * tileW + (cols - 1) * gap;
  const gridH = rows * tileH + (rows - 1) * gap;
  const marginX = (canvasW - gridW) / 2;
  const marginY = (canvasH - gridH) / 2;

  if (marginX < -0.5 || marginY < -0.5) return null;

  const totalTiles = cols * rows;
  const utilization = (totalTiles * tileW * tileH) / (canvasW * canvasH);
  const ratio = tileW / tileH;
  const ratioDeviation = Math.abs(ratio - TARGET_RATIO) / TARGET_RATIO;

  return {
    cols,
    rows,
    tileW,
    tileH,
    gap,
    marginX: Math.max(0, marginX),
    marginY: Math.max(0, marginY),
    gridW,
    gridH,
    totalTiles,
    utilization,
    ratio,
    ratioDeviation,
  };
}

function computeLevels(
  canvasW: number,
  canvasH: number,
  gap: number,
): TileConfig[] {
  if (canvasW < MIN_DIM || canvasH < MIN_DIM) return [];

  const maxCols = Math.floor((canvasW + gap) / (MIN_DIM + gap));
  const maxRows = Math.floor((canvasH + gap) / (MIN_DIM + gap));

  const configs: TileConfig[] = [];
  for (let c = 1; c <= maxCols; c++) {
    for (let r = 1; r <= maxRows; r++) {
      const cfg = calcConfig(canvasW, canvasH, c, r, gap);
      if (cfg) configs.push(cfg);
    }
  }

  // Sort by tile area descending (biggest tiles first = most zoomed in)
  configs.sort((a, b) => b.tileW * b.tileH - a.tileW * a.tileH);

  if (configs.length === 0) return [];

  // Dedup: keep only levels with meaningful area change
  const result: TileConfig[] = [configs[0]];
  for (let i = 1; i < configs.length; i++) {
    const last = result[result.length - 1];
    const cur = configs[i];
    const lastArea = last.tileW * last.tileH;
    const curArea = cur.tileW * cur.tileH;
    const areaRatio = lastArea / curArea;

    if (areaRatio >= DEDUP_THRESHOLD) {
      result.push(cur);
    } else if (cur.utilization > last.utilization + 0.06) {
      // Replace last with higher utilization at similar area
      result[result.length - 1] = cur;
    }
  }

  return result;
}

function findBestIndex(levels: TileConfig[]): number {
  if (levels.length === 0) return 0;
  let best = 0;
  for (let i = 1; i < levels.length; i++) {
    if (levels[i].utilization > levels[best].utilization) {
      best = i;
    }
  }
  return best;
}

// ─── Components ──────────────────────────────────────────────────────────────

function InfoRow({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub?: string;
  color?: string;
}) {
  return (
    <div className="flex items-baseline justify-between py-1">
      <span className="text-xs text-slate-400">{label}</span>
      <span className="text-right">
        <span
          className="text-sm font-mono"
          style={{ color: color || "#e2e8f0" }}
        >
          {value}
        </span>
        {sub && <span className="text-xs text-slate-500 ml-1">{sub}</span>}
      </span>
    </div>
  );
}

function SliderControl({
  label,
  value,
  min,
  max,
  step,
  onChange,
  unit,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  unit?: string;
}) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <span className="text-xs text-slate-400">{label}</span>
        <span className="text-xs font-mono text-slate-300">
          {value}
          {unit || "px"}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step || 1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-blue-500"
        style={{
          background: `linear-gradient(to right, #3b82f6 ${((value - min) / (max - min)) * 100}%, #334155 ${((value - min) / (max - min)) * 100}%)`,
        }}
      />
    </div>
  );
}

// ─── Main App ────────────────────────────────────────────────────────────────
export function App() {
  const [canvasW, setCanvasW] = useState(800);
  const [canvasH, setCanvasH] = useState(550);
  const [gap, setGap] = useState(8);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [showGuides, setShowGuides] = useState(true);

  const dragRef = useRef<{
    startX: number;
    startY: number;
    startW: number;
    startH: number;
  } | null>(null);

  // Compute zoom levels
  const levels = useMemo(
    () => computeLevels(canvasW, canvasH, gap),
    [canvasW, canvasH, gap],
  );

  const bestIdx = useMemo(() => findBestIndex(levels), [levels]);

  // Auto-select best when levels change
  useEffect(() => {
    const bi = findBestIndex(levels);
    setCurrentIdx(bi);
  }, [levels]);

  const safeIdx = Math.max(0, Math.min(currentIdx, levels.length - 1));
  const config = levels.length > 0 ? levels[safeIdx] : null;

  const zoomIn = useCallback(() => {
    setCurrentIdx((prev) => Math.max(0, prev - 1));
  }, []);

  const zoomOut = useCallback(() => {
    setCurrentIdx((prev) => Math.min(levels.length - 1, prev + 1));
  }, [levels.length]);

  const resetZoom = useCallback(() => {
    setCurrentIdx(bestIdx);
  }, [bestIdx]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;
      if (e.key === "=" || e.key === "+") {
        e.preventDefault();
        zoomIn();
      } else if (e.key === "-" || e.key === "_") {
        e.preventDefault();
        zoomOut();
      } else if (e.key === "0") {
        e.preventDefault();
        resetZoom();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [zoomIn, zoomOut, resetZoom]);

  // Drag resize
  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      dragRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        startW: canvasW,
        startH: canvasH,
      };

      const onMove = (ev: MouseEvent) => {
        if (!dragRef.current) return;
        const dx = ev.clientX - dragRef.current.startX;
        const dy = ev.clientY - dragRef.current.startY;
        setCanvasW(
          Math.max(
            CANVAS_MIN_W,
            Math.min(CANVAS_MAX_W, dragRef.current.startW + dx),
          ),
        );
        setCanvasH(
          Math.max(
            CANVAS_MIN_H,
            Math.min(CANVAS_MAX_H, dragRef.current.startH + dy),
          ),
        );
      };

      const onUp = () => {
        dragRef.current = null;
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };

      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [canvasW, canvasH],
  );

  // Generate tile elements
  const tiles = useMemo(() => {
    if (!config) return [];
    const result: {
      x: number;
      y: number;
      w: number;
      h: number;
      idx: number;
    }[] = [];
    for (let r = 0; r < config.rows; r++) {
      for (let c = 0; c < config.cols; c++) {
        const x = config.marginX + c * (config.tileW + config.gap);
        const y = config.marginY + r * (config.tileH + config.gap);
        result.push({
          x,
          y,
          w: config.tileW,
          h: config.tileH,
          idx: r * config.cols + c,
        });
      }
    }
    return result;
  }, [config]);

  const utilizationColor =
    config && config.utilization > 0.85
      ? "#22c55e"
      : config && config.utilization > 0.65
        ? "#eab308"
        : "#ef4444";

  const ratioColor =
    config && config.ratioDeviation < 0.02
      ? "#22c55e"
      : config && config.ratioDeviation < 0.06
        ? "#eab308"
        : "#f97316";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-200 flex flex-col">
      {/* Header */}
      <header className="px-6 py-4 border-b border-slate-800/60 flex-shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-900/30">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <rect
                x="1"
                y="1"
                width="6"
                height="7"
                rx="1"
                fill="white"
                opacity="0.9"
              />
              <rect
                x="9"
                y="1"
                width="6"
                height="7"
                rx="1"
                fill="white"
                opacity="0.7"
              />
              <rect
                x="1"
                y="10"
                width="6"
                height="7"
                rx="1"
                fill="white"
                opacity="0.7"
              />
              <rect
                x="9"
                y="10"
                width="6"
                height="7"
                rx="1"
                fill="white"
                opacity="0.5"
              />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-semibold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
              Tile Layout Algorithm
            </h1>
            <p className="text-xs text-slate-500">
              Optimal 3:4 tile packing with ±10% ratio flexibility ·{" "}
              <span className="text-slate-400">
                Press +/- to zoom · Drag corner to resize
              </span>
            </p>
          </div>
        </div>
      </header>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-72 flex-shrink-0 border-r border-slate-800/60 overflow-y-auto p-4 space-y-5">
          {/* Container Controls */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
              Container
            </h3>
            <div className="space-y-3">
              <SliderControl
                label="Width"
                value={canvasW}
                min={CANVAS_MIN_W}
                max={CANVAS_MAX_W}
                onChange={setCanvasW}
              />
              <SliderControl
                label="Height"
                value={canvasH}
                min={CANVAS_MIN_H}
                max={CANVAS_MAX_H}
                onChange={setCanvasH}
              />
              <SliderControl
                label="Gap"
                value={gap}
                min={0}
                max={24}
                onChange={setGap}
              />
            </div>
          </section>

          {/* Zoom Controls */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
              Zoom Level
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={zoomIn}
                disabled={safeIdx <= 0}
                className="flex-1 h-9 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-lg font-bold flex items-center justify-center"
              >
                +
              </button>
              <div className="flex-1 text-center">
                <div className="text-sm font-mono text-slate-200">
                  {levels.length > 0 ? safeIdx + 1 : "–"}{" "}
                  <span className="text-slate-500">/ {levels.length}</span>
                </div>
                {safeIdx === bestIdx && levels.length > 0 && (
                  <div className="text-[10px] text-emerald-400 font-medium">
                    ★ OPTIMAL
                  </div>
                )}
              </div>
              <button
                onClick={zoomOut}
                disabled={safeIdx >= levels.length - 1}
                className="flex-1 h-9 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-lg font-bold flex items-center justify-center"
              >
                −
              </button>
            </div>
            <button
              onClick={resetZoom}
              className="mt-2 w-full h-7 rounded-md bg-slate-800/60 hover:bg-slate-700 text-xs text-slate-400 hover:text-slate-200 transition-colors"
            >
              Reset to Optimal (0)
            </button>
          </section>

          {/* Utilization Sparkline */}
          {levels.length > 1 && (
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                Utilization Map
              </h3>
              <div className="bg-slate-800/40 rounded-lg p-3">
                <div className="flex items-end gap-px h-12">
                  {levels.map((lvl, i) => {
                    const h = Math.max(4, lvl.utilization * 100);
                    const isActive = i === safeIdx;
                    const isBest = i === bestIdx;
                    let bg = "bg-slate-600";
                    if (isActive) bg = "bg-blue-400";
                    else if (isBest) bg = "bg-emerald-400";
                    else if (lvl.utilization > 0.8) bg = "bg-slate-400";
                    return (
                      <button
                        key={i}
                        onClick={() => setCurrentIdx(i)}
                        className={`flex-1 min-w-[3px] rounded-t-sm transition-all hover:opacity-80 ${bg}`}
                        style={{ height: `${h}%` }}
                        title={`Level ${i + 1}: ${lvl.cols}×${lvl.rows} · ${(lvl.utilization * 100).toFixed(1)}%`}
                      />
                    );
                  })}
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-[9px] text-slate-600">
                    ← Bigger tiles
                  </span>
                  <span className="text-[9px] text-slate-600">Smaller →</span>
                </div>
              </div>
            </section>
          )}

          {/* Current Config Info */}
          {config && (
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
                Layout Info
              </h3>
              <div className="bg-slate-800/40 rounded-lg p-3 space-y-0.5">
                <InfoRow
                  label="Grid"
                  value={`${config.cols}C × ${config.rows}R`}
                  sub={`= ${config.totalTiles} tiles`}
                />
                <InfoRow
                  label="Tile size"
                  value={`${config.tileW.toFixed(1)} × ${config.tileH.toFixed(1)}`}
                  sub="px"
                />
                <InfoRow
                  label="Ratio (W:H)"
                  value={config.ratio.toFixed(3)}
                  sub={`(${config.ratioDeviation < 0.001 ? "ideal" : (config.ratioDeviation * 100).toFixed(1) + "% off"})`}
                  color={ratioColor}
                />
                <InfoRow
                  label="Margins"
                  value={`${config.marginX.toFixed(1)} × ${config.marginY.toFixed(1)}`}
                  sub="px"
                />
                <InfoRow label="Gap" value={`${config.gap}`} sub="px" />

                {/* Utilization bar */}
                <div className="pt-2 mt-1 border-t border-slate-700/50">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-slate-400">Utilization</span>
                    <span
                      className="text-sm font-mono font-semibold"
                      style={{ color: utilizationColor }}
                    >
                      {(config.utilization * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${config.utilization * 100}%`,
                        background: `linear-gradient(90deg, ${utilizationColor}cc, ${utilizationColor})`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Show guides toggle */}
          <section>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showGuides}
                onChange={(e) => setShowGuides(e.target.checked)}
                className="accent-blue-500"
              />
              <span className="text-xs text-slate-400">Show margin guides</span>
            </label>
          </section>

          {/* All Levels List */}
          {levels.length > 0 && (
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                All Levels ({levels.length})
              </h3>
              <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
                {levels.map((lvl, i) => {
                  const isActive = i === safeIdx;
                  const isBest = i === bestIdx;
                  return (
                    <button
                      key={i}
                      onClick={() => setCurrentIdx(i)}
                      className={`w-full text-left px-3 py-1.5 rounded-md text-xs transition-all ${
                        isActive
                          ? "bg-blue-600/30 border border-blue-500/50 text-blue-200"
                          : "bg-slate-800/40 border border-transparent hover:bg-slate-700/60 text-slate-400"
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-mono">
                          {isBest && "★ "}
                          {lvl.cols}×{lvl.rows}
                        </span>
                        <span className="tabular-nums">
                          {(lvl.utilization * 100).toFixed(0)}%
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        {lvl.tileW.toFixed(0)}×{lvl.tileH.toFixed(0)}px · ratio{" "}
                        {lvl.ratio.toFixed(3)}
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {/* Algorithm description */}
          <section className="pb-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
              Algorithm
            </h3>
            <div className="text-[11px] text-slate-500 leading-relaxed space-y-2">
              <p>
                For each (cols, rows) grid, compute max tile dimensions.
                Constrain W:H ratio to [0.675, 0.825] (3:4 ± 10%).
              </p>
              <p>
                Sort configurations by tile area. Deduplicate levels within 18%
                area change, keeping higher utilization.
              </p>
              <p>
                Each zoom step guarantees a visible layout change (different
                row/column count).
              </p>
            </div>
          </section>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex items-center justify-center p-6 overflow-auto">
          <div className="relative">
            {/* Canvas container */}
            <div
              className="relative bg-slate-900/80 border border-slate-700/50 rounded-xl overflow-hidden shadow-2xl shadow-black/30"
              style={{
                width: canvasW,
                height: canvasH,
              }}
            >
              {/* Margin guides */}
              {showGuides && config && config.marginX > 1 && (
                <>
                  <div
                    className="absolute top-0 bottom-0 border-l border-dashed border-blue-500/25"
                    style={{ left: config.marginX }}
                  />
                  <div
                    className="absolute top-0 bottom-0 border-r border-dashed border-blue-500/25"
                    style={{ right: config.marginX }}
                  />
                </>
              )}
              {showGuides && config && config.marginY > 1 && (
                <>
                  <div
                    className="absolute left-0 right-0 border-t border-dashed border-blue-500/25"
                    style={{ top: config.marginY }}
                  />
                  <div
                    className="absolute left-0 right-0 border-b border-dashed border-blue-500/25"
                    style={{ bottom: config.marginY }}
                  />
                </>
              )}

              {/* Tiles */}
              {tiles.map((tile) => {
                const hue =
                  220 + (tile.idx * 140) / Math.max(1, tiles.length - 1);
                return (
                  <div
                    key={tile.idx}
                    className="absolute rounded-md shadow-md transition-all duration-500 ease-out"
                    style={{
                      left: tile.x,
                      top: tile.y,
                      width: tile.w,
                      height: tile.h,
                      background: `linear-gradient(135deg, hsl(${hue}, 60%, 45%), hsl(${hue + 30}, 50%, 35%))`,
                      boxShadow: `0 2px 8px hsla(${hue}, 60%, 20%, 0.4)`,
                    }}
                  >
                    {tile.w > 45 && tile.h > 55 && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
                        <span
                          className="font-mono font-bold text-white/80"
                          style={{
                            fontSize: Math.max(9, Math.min(14, tile.w / 5)),
                          }}
                        >
                          {tile.idx + 1}
                        </span>
                        <span
                          className="font-mono text-white/40"
                          style={{
                            fontSize: Math.max(7, Math.min(10, tile.w / 8)),
                          }}
                        >
                          {tile.w.toFixed(0)}×{tile.h.toFixed(0)}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Size label */}
              <div className="absolute top-2 left-2 bg-black/50 backdrop-blur-sm rounded px-2 py-0.5 text-[10px] text-slate-400 font-mono pointer-events-none">
                {canvasW} × {canvasH}
              </div>

              {/* No tiles message */}
              {!config && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-slate-600 text-sm">
                    Container too small for tiles
                  </span>
                </div>
              )}
            </div>

            {/* Resize handle */}
            <div
              onMouseDown={onMouseDown}
              className="absolute -bottom-2 -right-2 w-6 h-6 cursor-nwse-resize group z-10"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                className="absolute bottom-0 right-0 text-slate-600 group-hover:text-blue-400 transition-colors"
              >
                <line
                  x1="14"
                  y1="4"
                  x2="4"
                  y2="14"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
                <line
                  x1="14"
                  y1="8"
                  x2="8"
                  y2="14"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
                <line
                  x1="14"
                  y1="12"
                  x2="12"
                  y2="14"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
              </svg>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
