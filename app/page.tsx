"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FocusEvent } from "react";

const PLAYER_COUNT = 4;
const STORAGE_KEY = "ceki-scorekeeper-v1";
const DEFAULT_ROW_COUNT = 10;
const DEFAULT_PLAYER_NAMES = ["Player 1", "Player 2", "Player 3", "Player 4"];
const SCORE_INPUT_PATTERN = /^-?(?:\d+)?(?:\.\d*)?$/;

function createRows(totalRows: number) {
  return Array.from({ length: totalRows }, () => Array.from({ length: PLAYER_COUNT }, () => "0"));
}

function sanitizeCommittedScore(value: string) {
  const trimmed = value.trim();

  if (trimmed === "" || trimmed === "-" || trimmed === "." || trimmed === "-.") {
    return "0";
  }

  const parsed = Number.parseFloat(trimmed);
  if (!Number.isFinite(parsed)) return "0";
  if (Object.is(parsed, -0)) return "0";

  return String(parsed);
}

// Defined outside component to avoid recreation on every render
const PLAYERS = [
  {
    gradient: "from-violet-500 to-indigo-600",
    glow: "shadow-[0_0_28px_rgba(139,92,246,0.35)]",
    border: "border-violet-500/30",
    bg: "bg-violet-500/10",
    text: "text-violet-300",
    focus: "focus:ring-violet-500/40 focus:border-violet-400/60",
    dot: "bg-violet-400",
  },
  {
    gradient: "from-cyan-400 to-sky-600",
    glow: "shadow-[0_0_28px_rgba(34,211,238,0.3)]",
    border: "border-cyan-500/30",
    bg: "bg-cyan-500/10",
    text: "text-cyan-300",
    focus: "focus:ring-cyan-500/40 focus:border-cyan-400/60",
    dot: "bg-cyan-400",
  },
  {
    gradient: "from-amber-400 to-orange-500",
    glow: "shadow-[0_0_28px_rgba(251,191,36,0.3)]",
    border: "border-amber-500/30",
    bg: "bg-amber-500/10",
    text: "text-amber-300",
    focus: "focus:ring-amber-500/40 focus:border-amber-400/60",
    dot: "bg-amber-400",
  },
  {
    gradient: "from-rose-500 to-pink-600",
    glow: "shadow-[0_0_28px_rgba(244,63,94,0.3)]",
    border: "border-rose-500/30",
    bg: "bg-rose-500/10",
    text: "text-rose-300",
    focus: "focus:ring-rose-500/40 focus:border-rose-400/60",
    dot: "bg-rose-400",
  },
] as const;

export default function Home() {
  const [rowCount, setRowCount] = useState(DEFAULT_ROW_COUNT);
  const [playerNames, setPlayerNames] = useState(DEFAULT_PLAYER_NAMES);
  const [rows, setRows] = useState<string[][]>(() => createRows(DEFAULT_ROW_COUNT));
  const [enableIntroMotion, setEnableIntroMotion] = useState(false);
  const hasLoadedFromStorage = useRef(false);

  useEffect(() => {
    setEnableIntroMotion(true);
  }, []);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        hasLoadedFromStorage.current = true;
        return;
      }

      const parsed = JSON.parse(raw) as {
        rowCount?: number;
        playerNames?: unknown;
        rows?: unknown;
      };

      const safeRowCount = Number.isFinite(parsed.rowCount)
        ? Math.min(99, Math.max(1, Number(parsed.rowCount)))
        : DEFAULT_ROW_COUNT;

      const safePlayerNames = Array.isArray(parsed.playerNames)
        ? Array.from({ length: PLAYER_COUNT }, (_, index) => {
            const nextName = (parsed.playerNames as unknown[])[index];
            return typeof nextName === "string" ? nextName : DEFAULT_PLAYER_NAMES[index];
          })
        : DEFAULT_PLAYER_NAMES;

      const safeRows = createRows(safeRowCount);
      if (Array.isArray(parsed.rows)) {
        for (let rowIndex = 0; rowIndex < safeRowCount; rowIndex += 1) {
          const currentRow = parsed.rows[rowIndex];
          if (!Array.isArray(currentRow)) continue;

          for (let playerIndex = 0; playerIndex < PLAYER_COUNT; playerIndex += 1) {
            const nextValue = currentRow[playerIndex];
            safeRows[rowIndex][playerIndex] =
              typeof nextValue === "string" && SCORE_INPUT_PATTERN.test(nextValue)
                ? sanitizeCommittedScore(nextValue)
                : "0";
          }
        }
      }

      setRowCount(safeRowCount);
      setPlayerNames(safePlayerNames);
      setRows(safeRows);
    } catch {
      // Fallback to defaults if localStorage content is invalid.
    } finally {
      hasLoadedFromStorage.current = true;
    }
  }, []);

  useEffect(() => {
    if (!hasLoadedFromStorage.current) return;

    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        rowCount,
        playerNames,
        rows,
      })
    );
  }, [playerNames, rowCount, rows]);

  const totals = useMemo(() => {
    return Array.from({ length: PLAYER_COUNT }, (_, playerIndex) => {
      return rows.reduce((sum, currentRow) => {
        const val = Number.parseFloat(currentRow[playerIndex]);
        return sum + (Number.isFinite(val) ? val : 0);
      }, 0);
    });
  }, [rows]);

  // Derived totals stats — single memo pass
  const { highestTotal, lowestTotal } = useMemo(() => {
    const high = Math.max(...totals);
    const low = Math.min(...totals);
    return {
      highestTotal: high,
      lowestTotal: low,
    };
  }, [totals]);

  // Per-row min/max for cell highlighting
  const rowExtremes = useMemo(() => {
    return rows.map((row) => {
      const nums = row.map((v) => {
        const n = Number.parseFloat(v);
        return Number.isFinite(n) ? n : 0;
      });
      const maxVal = Math.max(...nums);
      const minVal = Math.min(...nums);
      return { maxVal, minVal, hasVariance: maxVal !== minVal };
    });
  }, [rows]);

  const applyRowCount = useCallback(
    (nextValue: number) => {
      const safeValue = Number.isFinite(nextValue) ? Math.min(99, Math.max(1, nextValue)) : rowCount;
      setRowCount(safeValue);
      setRows((prev) => {
        if (safeValue === prev.length) return prev;
        if (safeValue > prev.length) return [...prev, ...createRows(safeValue - prev.length)];
        return prev.slice(0, safeValue);
      });
    },
    [rowCount],
  );

  const normalizeScoreInput = useCallback((value: string) => {
    if (value === "" || value === "-" || value === "." || value === "-.") return value;

    const isNegative = value.startsWith("-");
    const raw = isNegative ? value.slice(1) : value;

    if (raw.startsWith("0.") || raw.length <= 1) return value;

    if (/^0+\d/.test(raw)) {
      if (raw.includes(".")) {
        const [intPart, decimalPart] = raw.split(".");
        const intNormalized = String(Number.parseInt(intPart || "0", 10));
        return `${isNegative ? "-" : ""}${intNormalized}.${decimalPart ?? ""}`;
      }

      const intNormalized = String(Number.parseInt(raw, 10));
      return `${isNegative ? "-" : ""}${intNormalized}`;
    }

    return value;
  }, []);

  const onScoreChange = useCallback((rowIndex: number, playerIndex: number, value: string) => {
    if (!SCORE_INPUT_PATTERN.test(value)) return;

    const normalizedValue = normalizeScoreInput(value);
    setRows((prev) => {
      const next = prev.map((row) => [...row]);
      next[rowIndex][playerIndex] = normalizedValue;
      return next;
    });
  }, [normalizeScoreInput]);

  const onScoreBlur = useCallback((rowIndex: number, playerIndex: number) => {
    setRows((prev) => {
      const next = prev.map((row) => [...row]);
      const current = next[rowIndex][playerIndex];
      const committed = sanitizeCommittedScore(current);

      if (committed === current) return prev;

      next[rowIndex][playerIndex] = committed;
      return next;
    });
  }, []);

  const toggleScoreSign = useCallback((rowIndex: number, playerIndex: number) => {
    setRows((prev) => {
      const next = prev.map((row) => [...row]);
      const current = next[rowIndex][playerIndex];

      if (current === "") {
        next[rowIndex][playerIndex] = "-";
        return next;
      }

      if (current.startsWith("-")) {
        next[rowIndex][playerIndex] = current.slice(1);
        return next;
      }

      next[rowIndex][playerIndex] = `-${current}`;
      return next;
    });
  }, []);

  const handleSelectAllOnFocus = useCallback((event: FocusEvent<HTMLInputElement>) => {
    event.currentTarget.select();
  }, []);

  const onPlayerNameChange = useCallback((index: number, value: string) => {
    setPlayerNames((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }, []);

  const resetAll = useCallback(() => {
    if (!window.confirm("Reset semua skor dan nama player ke default?")) return;
    setRowCount(DEFAULT_ROW_COUNT);
    setPlayerNames(DEFAULT_PLAYER_NAMES);
    setRows(createRows(DEFAULT_ROW_COUNT));
  }, []);

  return (
    <div
      className="relative h-dvh overflow-hidden overflow-x-hidden"
      style={{
        background:
          "radial-gradient(ellipse 100% 50% at 50% 0%, rgba(99,102,241,0.12) 0%, transparent 60%), #070c18",
      }}
    >
      {/* ambient blobs */}
      <div className="animate-float-ambient pointer-events-none fixed -top-32 -left-20 h-125 w-125 rounded-full bg-violet-900/20 blur-[120px]" />
      <div className="animate-float-ambient pointer-events-none fixed bottom-0 -right-20 h-100 w-100 rounded-full bg-indigo-900/20 blur-[120px]" style={{ animationDelay: "1.6s" }} />

      {/* page shell: fills viewport, scrolls inside */}
      <div className="relative mx-auto flex h-full w-full max-w-2xl flex-col gap-3 px-3 py-4 box-border sm:px-5 sm:py-5">
        {/* ── HEADER ── */}
        <header className={`${enableIntroMotion ? "animate-enter" : ""} flex shrink-0 items-center justify-between gap-3`}>
          {/* brand */}
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-2xl text-sm font-black text-white shadow-[0_0_20px_rgba(124,111,247,0.5)]"
              style={{ background: "linear-gradient(135deg,#7c6ff7,#a855f7)" }}
            >
              C
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight text-white sm:text-2xl">
                CEKI{" "}
                <span
                  style={{
                    background: "linear-gradient(90deg,#a5b4fc,#c084fc)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  COY
                </span>
              </h1>
              <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-white/30">Scorekeeper</p>
            </div>
          </div>

          {/* controls */}
          <div className="flex items-center gap-1 rounded-2xl border border-white/8 bg-white/4 px-2 py-1.5 backdrop-blur">
            <button
              onClick={() => applyRowCount(Math.max(1, rowCount - 1))}
              className="flex h-8 w-8 items-center justify-center rounded-xl text-lg font-bold text-white/40 transition-colors hover:bg-white/10 hover:text-white"
              aria-label="Kurangi baris"
            >−</button>
            <input
              type="number"
              min={1}
              max={99}
              step={1}
              inputMode="numeric"
              value={rowCount}
              onFocus={handleSelectAllOnFocus}
              onChange={(e) => {
                const parsed = Number.parseInt(e.target.value, 10);
                if (!Number.isNaN(parsed)) applyRowCount(parsed);
              }}
              className="h-8 w-10 bg-transparent text-center text-base font-bold text-white outline-none sm:text-sm"
              aria-label="Jumlah baris"
            />
            <button
              onClick={() => applyRowCount(rowCount + 1)}
              className="flex h-8 w-8 items-center justify-center rounded-xl text-lg font-bold text-white/40 transition-colors hover:bg-white/10 hover:text-white"
              aria-label="Tambah baris"
            >+</button>
            <div className="mx-1 h-5 w-px bg-white/10" />
            <button
              onClick={resetAll}
              className="h-8 rounded-xl px-2.5 text-xs font-semibold text-rose-400 transition-colors hover:bg-rose-500/15 hover:text-rose-300"
              aria-label="Reset"
            >Reset</button>
          </div>
        </header>

        {/* ── SCORE TABLE ── */}
        <div className={`${enableIntroMotion ? "animate-enter" : ""} flex-1 overflow-hidden rounded-2xl border border-white/7 bg-[#0d1425]`} style={{ animationDelay: "80ms" }}>
          <div className="flex h-full flex-col">
            {/* sticky column headers */}
            <div className="grid shrink-0 grid-cols-4 border-b border-white/7">
              {playerNames.map((name, i) => (
                <div key={`ph-${i}`} className="relative px-1.5 py-2.5 sm:px-2">
                  {/* color accent bar */}
                  <div className={`absolute inset-x-0 top-0 h-0.5 bg-linear-to-r ${PLAYERS[i].gradient}`} />
                  <div className="flex items-center gap-1.5">
                    <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${PLAYERS[i].dot}`} />
                    <input
                      value={name}
                      onChange={(e) => onPlayerNameChange(i, e.target.value)}
                      className="w-full min-w-0 bg-transparent text-center text-[13px] font-bold text-white/70 outline-none transition-colors placeholder:text-white/20 focus:text-base focus:text-white sm:text-xs sm:font-bold sm:uppercase sm:tracking-wider sm:focus:text-xs"
                      placeholder={`P${i + 1}`}
                      aria-label={`Nama player ${i + 1}`}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* scrollable rows */}
            <div className="flex-1 overflow-y-auto">
              <table className="w-full table-fixed border-separate border-spacing-0">
                <tbody>
                  {rows.map((row, ri) => {
                    const { maxVal, minVal, hasVariance } = rowExtremes[ri];
                    return (
                      <tr
                        key={`row-${ri}`}
                        className={ri % 2 === 0 ? "bg-transparent" : "bg-white/2"}
                      >
                        {row.map((score, pi) => {
                          const cellVal = Number.parseFloat(score);
                          const num = Number.isFinite(cellVal) ? cellVal : 0;
                          const isCellHigh = hasVariance && num === maxVal;
                          const isCellLow = hasVariance && num === minVal;
                          return (
                            <td key={`c-${ri}-${pi}`} className="px-1.5 py-1 sm:px-2">
                              <div className="group relative">
                                <button
                                  type="button"
                                  onClick={() => toggleScoreSign(ri, pi)}
                                  className="absolute left-1 top-1/2 z-10 h-8 w-8 -translate-y-1/2 rounded-lg text-[11px] font-black text-white/25 opacity-70 transition-all hover:bg-white/10 hover:text-white/80 hover:opacity-100 focus-visible:bg-white/12 focus-visible:text-white/90 focus-visible:opacity-100 focus-visible:outline-none group-focus-within:opacity-100"
                                  aria-label={`Toggle plus minus skor baris ${ri + 1} player ${pi + 1}`}
                                >
                                  ±
                                </button>
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  value={score}
                                  onFocus={handleSelectAllOnFocus}
                                  onChange={(e) => onScoreChange(ri, pi, e.target.value)}
                                  onBlur={() => onScoreBlur(ri, pi)}
                                  className={`h-10 w-full rounded-xl border pl-9 pr-2 text-center text-base font-semibold outline-none transition-all placeholder:text-white/15 focus:ring-2 sm:text-sm ${
                                    isCellHigh
                                      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/15 focus:border-emerald-400/50 focus:bg-emerald-500/15 focus:ring-emerald-500/25"
                                      : isCellLow
                                        ? "border-rose-500/40 bg-rose-500/10 text-rose-300 hover:bg-rose-500/15 focus:border-rose-400/50 focus:bg-rose-500/15 focus:ring-rose-500/25"
                                        : `border-transparent bg-white/4 text-white/85 hover:bg-white/7 focus:border-white/20 focus:bg-white/7 ${PLAYERS[pi].focus}`
                                  }`}
                                  placeholder="0"
                                  aria-label={`Skor baris ${ri + 1} player ${pi + 1}`}
                                />
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ── TOTAL CARDS ── */}
        <div className={`${enableIntroMotion ? "animate-enter" : ""} grid shrink-0 grid-cols-4 gap-2`} style={{ animationDelay: "160ms" }}>
          {totals.map((total, i) => {
            const isHigh = highestTotal !== lowestTotal && total === highestTotal;
            const isLow  = highestTotal !== lowestTotal && total === lowestTotal;
            return (
              <div
                key={`tot-${i}`}
                className={`${enableIntroMotion ? "animate-enter" : ""} relative flex flex-col items-center justify-center gap-0.5 overflow-hidden rounded-2xl border py-3 transition-all ${
                  isHigh
                    ? `${PLAYERS[i].border} ${PLAYERS[i].bg} ${PLAYERS[i].glow}`
                    : isLow
                      ? "border-rose-500/30 bg-rose-500/10 shadow-[0_0_24px_rgba(244,63,94,0.2)]"
                      : "border-white/6 bg-white/3"
                }`}
                style={{ animationDelay: `${220 + i * 70}ms` }}
              >
                {(isHigh || isLow) && (
                  <div
                    className="animate-score-shimmer pointer-events-none absolute inset-y-0 left-0 w-1/2 bg-linear-to-r from-transparent via-white/15 to-transparent"
                    aria-hidden="true"
                  />
                )}

                {/* accent bar at bottom */}
                {(isHigh || isLow) && (
                  <div
                    className={`absolute inset-x-0 bottom-0 h-0.5 opacity-70 ${
                      isHigh ? `bg-linear-to-r ${PLAYERS[i].gradient}` : "bg-rose-500"
                    }`}
                  />
                )}

                <span
                  className={`w-full wrap-break-word px-1 text-center text-[10px] font-semibold uppercase tracking-wide ${
                    isHigh ? PLAYERS[i].text : isLow ? "text-rose-300" : "text-white/30"
                  }`}
                >
                  {playerNames[i] || `P${i + 1}`}
                </span>
                <span
                  className={`text-xl font-black tabular-nums sm:text-2xl ${
                    isHigh ? "text-white" : isLow ? "text-rose-200" : "text-white/70"
                  }`}
                >
                  {total}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
