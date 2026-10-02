import { useState, useCallback, useRef, useEffect, useMemo, useId } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Link } from "wouter";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Crown,
  Flame,
  Hand,
  Heart,
  Lightbulb,
  PenTool,
  Play,
  RotateCcw,
  Sparkles,
  Sprout,
  Star,
  Timer,
  Trophy,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { BRAND, BRAND_EASE } from "@/lib/brand";

// ── Word bank: UX/UI/Product Design terminology ──
const WORD_BANK = [
  "HUE", "ART", "INK", "DOT", "GAP", "APP",
  "USER", "FLOW", "TASK", "TEST", "DATA",
  "WIRE", "SITE", "MAPS", "NOTE", "VIEW",
  "GRID", "GAPS", "FILL", "LINE", "EDGE",
  "PALE", "TONE", "SHIP", "SCAN", "IDEA",
  "TEAM", "PLAN", "GOAL", "ROLE", "MAZE",
  "BLEND", "SHARP", "FIGMA", "PIXEL", "FRAME", "LAYER", "SCALE", "CHART",
  "SKETCH", "LAYOUT", "SPRINT", "MOCKUP", "CURSOR", "BUTTON", "VECTOR", "CANVAS",
  "PERSONA", "JOURNEY", "KERNING", "INSIGHT", "SPACING",
];

// ── Target kerning ──
function getTargetKerning(word: string): number[] {
  const pairs: number[] = [];
  for (let i = 0; i < word.length - 1; i++) {
    const pair = word[i] + word[i + 1];
    if (/[OQCGD0]/.test(pair[0]) && /[OQCGD0]/.test(pair[1])) pairs.push(-3);
    else if (/[HNMW]/.test(pair[0]) && /[HNMW]/.test(pair[1])) pairs.push(1);
    else if (/[ILT1]/.test(pair[0]) || /[ILT1]/.test(pair[1])) pairs.push(2);
    else if (/[VAWY]/.test(pair[0]) && /[VAWY]/.test(pair[1])) pairs.push(-2);
    else pairs.push(0);
  }
  return pairs;
}

// ── Scoring ──
function calculateScore(userKerning: number[], targetKerning: number[]): number {
  if (userKerning.length === 0) return 0;
  let totalError = 0;
  for (let i = 0; i < userKerning.length; i++) {
    totalError += Math.abs(userKerning[i] - targetKerning[i]);
  }
  return Math.max(0, Math.round(100 - (totalError / userKerning.length) * 10));
}

function getScoreVibe(score: number): { label: string; color: string } {
  if (score >= 95) return { label: "Perfect", color: "#10B981" };
  if (score >= 85) return { label: "Sharp", color: BRAND.blue };
  if (score >= 70) return { label: "Good", color: "#8B5CF6" };
  if (score >= 50) return { label: "Okay", color: "#F59E0B" };
  return { label: "Off", color: "#F43F5E" };
}

function getFunMessage(score: number): string {
  if (score >= 95) return "You have the eye. Typographers are jealous.";
  if (score >= 85) return "Sharp kerning — nicely done!";
  if (score >= 70) return "Getting there. Your eye is warming up.";
  if (score >= 50) return "Not bad — keep nudging.";
  return "Those letters need a little love.";
}

function starCount(score: number): number {
  if (score >= 90) return 3;
  if (score >= 75) return 2;
  if (score >= 50) return 1;
  return 0;
}

// ── Difficulty ──
type Difficulty = "easy" | "medium" | "hard";

const DIFFICULTY_CONFIG: Record<
  Difficulty,
  { min: number; max: number; label: string; sublabel: string; icon: LucideIcon; color: string }
> = {
  easy: { min: 3, max: 4, label: "Beginner", sublabel: "3–4 letters", icon: Sprout, color: BRAND.teal },
  medium: { min: 4, max: 5, label: "Designer", sublabel: "4–5 letters", icon: PenTool, color: BRAND.blue },
  hard: { min: 5, max: 7, label: "Lead", sublabel: "5–7 letters", icon: Crown, color: BRAND.pink },
};

const TIMER_DURATION = 30;
const TOTAL_ROUNDS = 5;

/** Top → bottom gradient stops for each letter. */
const LETTER_COLORS: [string, string][] = [
  ["#7DB4FF", BRAND.blue],
  ["#F9A8D4", BRAND.pink],
  ["#FDBA8C", BRAND.coral],
  ["#8EE3CC", BRAND.teal],
  ["#C4B5FD", "#8B5CF6"],
  ["#FDE68A", "#F59E0B"],
  ["#A5B4FC", "#6366F1"],
];

/** Shrinks long words so they fit on phones. */
function letterFontSize(len: number): string {
  return `clamp(2.75rem, ${Math.round(120 / Math.max(3, len))}vw, 9rem)`;
}

// ── localStorage ──
const STORAGE_KEY = "kern-game-best-scores";

function loadBestScores(): Record<Difficulty, number> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return { easy: 0, medium: 0, hard: 0 };
}

function saveBestScore(difficulty: Difficulty, score: number) {
  try {
    const best = loadBestScores();
    if (score > best[difficulty]) {
      best[difficulty] = score;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(best));
      return true;
    }
  } catch {}
  return false;
}

// ── Mascot ──
type Mood = "idle" | "focus" | "happy" | "sad";

const MOUTHS: Record<Mood, string> = {
  idle: "M24 41 Q32 47 40 41",
  focus: "M29 43 Q32 39.5 35 43 Q32 46.5 29 43 Z",
  happy: "M22 39 Q32 53 42 39 Z",
  sad: "M24 45 Q32 39 40 45",
};

function KernBuddy({ mood = "idle", size = 64 }: { mood?: Mood; size?: number }) {
  const reduce = useReducedMotion();
  const gradId = `kb-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const filled = mood === "happy" || mood === "focus";

  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      aria-hidden
      className="shrink-0 drop-shadow-[0_8px_16px_rgba(31,103,241,0.35)]"
      animate={
        reduce
          ? undefined
          : mood === "happy"
            ? { y: [0, -8, 0], rotate: [0, -8, 8, 0] }
            : { y: [0, -3, 0] }
      }
      transition={{ duration: mood === "happy" ? 0.8 : 2.6, repeat: Infinity, ease: "easeInOut" }}
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={BRAND.blue} />
          <stop offset="1" stopColor={BRAND.pink} />
        </linearGradient>
      </defs>
      <line x1="32" y1="9" x2="32" y2="3.5" stroke={BRAND.blue} strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="32" cy="3.5" r="3" fill={BRAND.coral} />
      <rect x="6" y="9" width="52" height="50" rx="19" fill={`url(#${gradId})`} />
      <rect x="13" y="13" width="18" height="6" rx="3" fill="#fff" opacity="0.28" />
      <motion.g
        style={{ transformBox: "fill-box", transformOrigin: "center" }}
        animate={reduce ? undefined : { scaleY: [1, 1, 0.1, 1] }}
        transition={{ duration: 3.4, times: [0, 0.9, 0.95, 1], repeat: Infinity }}
      >
        <ellipse cx="23" cy="30" rx="5.2" ry="6.2" fill="#fff" />
        <ellipse cx="41" cy="30" rx="5.2" ry="6.2" fill="#fff" />
        <circle cx={mood === "focus" ? 25 : 24} cy="31" r="2.8" fill="#1A2744" />
        <circle cx={mood === "focus" ? 43 : 42} cy="31" r="2.8" fill="#1A2744" />
        <circle cx="25" cy="29.5" r="0.9" fill="#fff" />
        <circle cx="43" cy="29.5" r="0.9" fill="#fff" />
      </motion.g>
      <circle cx="15.5" cy="40" r="3.6" fill="#FFB3C7" opacity="0.85" />
      <circle cx="48.5" cy="40" r="3.6" fill="#FFB3C7" opacity="0.85" />
      <path
        d={MOUTHS[mood]}
        fill={filled ? "#1A2744" : "none"}
        stroke="#1A2744"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </motion.svg>
  );
}

// ── Floating stickers behind the game card ──
const STICKERS: { Icon: LucideIcon; x: string; y: string; size: number; color: string; delay: number }[] = [
  { Icon: Star, x: "5%", y: "8%", size: 18, color: BRAND.coral, delay: 0 },
  { Icon: Heart, x: "93%", y: "10%", size: 16, color: BRAND.pink, delay: 0.6 },
  { Icon: Sparkles, x: "90%", y: "82%", size: 20, color: BRAND.teal, delay: 1.1 },
  { Icon: Star, x: "3%", y: "88%", size: 14, color: BRAND.blue, delay: 0.3 },
];

function Stickers() {
  const reduce = useReducedMotion();
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 hidden sm:block">
      {STICKERS.map(({ Icon, x, y, size, color, delay }, i) => (
        <motion.span
          key={i}
          className="absolute"
          style={{ left: x, top: y, color }}
          animate={reduce ? undefined : { y: [0, -8, 0], rotate: [0, 12, 0] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut", delay }}
        >
          <Icon size={size} fill="currentColor" strokeWidth={1.5} />
        </motion.span>
      ))}
    </div>
  );
}

// ── Confetti ──
function Confetti({ active }: { active: boolean }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: 36 }, (_, i) => ({
        left: Math.random() * 100,
        size: 4 + Math.random() * 7,
        color: ["#1F67F1", "#EC4899", "#E8715A", "#6DB8A2", "#F59E0B", "#8B5CF6"][i % 6],
        round: i % 3 === 0,
        duration: 1 + Math.random(),
        delay: Math.random() * 0.3,
      })),
    // Re-roll each time confetti fires.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [active],
  );
  if (!active) return null;
  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {pieces.map((p, i) => (
        <motion.div
          key={i}
          className={p.round ? "absolute rounded-full" : "absolute rounded-sm"}
          style={{ left: `${p.left}%`, top: "-5%", width: p.size, height: p.size, backgroundColor: p.color }}
          initial={{ y: 0, opacity: 1, rotate: 0 }}
          animate={{ y: "110vh", opacity: [1, 1, 0], rotate: 720 }}
          transition={{ duration: p.duration, delay: p.delay, ease: "easeIn" }}
        />
      ))}
    </div>
  );
}

// ── Shared bits ──
function Chip({ icon: Icon, color, children }: { icon: LucideIcon; color: string; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-sans font-medium px-3 py-1.5 rounded-full bg-background/70 border border-border/70 text-foreground/80">
      <Icon size={13} strokeWidth={2.4} style={{ color }} />
      {children}
    </span>
  );
}

function ChunkyButton({
  onClick,
  children,
  from = BRAND.blue,
  to = BRAND.pink,
  shade = "#0f3fa8",
  wiggle = false,
}: {
  onClick: () => void;
  children: React.ReactNode;
  from?: string;
  to?: string;
  shade?: string;
  wiggle?: boolean;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.button
      type="button"
      onClick={onClick}
      className="inline-flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-full text-white font-sans font-bold uppercase tracking-[0.15em] text-sm cursor-pointer"
      style={{
        background: `linear-gradient(135deg, ${from}, ${to})`,
        boxShadow: `0 6px 0 ${shade}, 0 18px 36px -12px ${to}aa`,
      }}
      whileHover={{ scale: 1.04, y: -2 }}
      whileTap={{ scale: 0.97, y: 4, boxShadow: `0 2px 0 ${shade}, 0 8px 18px -10px ${to}aa` }}
      animate={wiggle && !reduce ? { rotate: [0, -2.5, 2.5, -1.5, 0] } : undefined}
      transition={wiggle ? { rotate: { duration: 0.7, repeat: Infinity, repeatDelay: 2.6 } } : undefined}
    >
      {children}
    </motion.button>
  );
}

// ── Main Game ──
export function KernGame() {
  const [gameState, setGameState] = useState<"intro" | "playing" | "result">("intro");
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [currentWord, setCurrentWord] = useState("");
  const [letterOffsets, setLetterOffsets] = useState<number[]>([]);
  const [targetKerning, setTargetKerning] = useState<number[]>([]);
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(0);
  const [scores, setScores] = useState<number[]>([]);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(TIMER_DURATION);
  const [streak, setStreak] = useState(0);
  const [bestScores, setBestScores] = useState(loadBestScores);
  const [isNewBest, setIsNewBest] = useState(false);
  const usedWordsRef = useRef<string[]>([]);

  const loadWord = useCallback(() => {
    const { min, max } = DIFFICULTY_CONFIG[difficulty];
    const pool = WORD_BANK.filter((w) => w.length >= min && w.length <= max);
    const fresh = pool.filter((w) => !usedWordsRef.current.includes(w));
    const list = fresh.length > 0 ? fresh : pool;
    const word = list[Math.floor(Math.random() * list.length)] ?? "USER";
    usedWordsRef.current = [...usedWordsRef.current, word];
    setCurrentWord(word);
    setTargetKerning(getTargetKerning(word));
    setLetterOffsets(new Array(word.length).fill(0));
    setShowHint(false);
    setTimeLeft(TIMER_DURATION);
  }, [difficulty]);

  const startGame = useCallback(() => {
    usedWordsRef.current = [];
    setRound(0);
    setScores([]);
    setScore(0);
    setStreak(0);
    setIsNewBest(false);
    loadWord();
    setGameState("playing");
  }, [loadWord]);

  const submitRound = useCallback(() => {
    const kerning: number[] = [];
    for (let i = 0; i < letterOffsets.length - 1; i++) {
      kerning.push(letterOffsets[i + 1] - letterOffsets[i]);
    }
    const roundScore = calculateScore(kerning, targetKerning);
    const timeBonus = Math.round((timeLeft / TIMER_DURATION) * 10);
    const streakBonus = streak >= 2 ? streak * 5 : 0;
    const finalScore = Math.min(100, roundScore + timeBonus + streakBonus);

    setScore(finalScore);
    setScores((prev) => [...prev, finalScore]);
    setStreak((prev) => (roundScore >= 70 ? prev + 1 : 0));
    setDraggingIndex(null);
    if (finalScore >= 85) setShowConfetti(true);
    setGameState("result");
  }, [letterOffsets, targetKerning, timeLeft, streak]);

  // The interval only ticks; a separate effect submits so it always sees the latest offsets.
  const submitRef = useRef(submitRound);
  useEffect(() => {
    submitRef.current = submitRound;
  });

  useEffect(() => {
    if (gameState !== "playing") return;
    const id = window.setInterval(() => setTimeLeft((t) => Math.max(0, t - 1)), 1000);
    return () => window.clearInterval(id);
  }, [gameState, round]);

  useEffect(() => {
    if (gameState === "playing" && timeLeft === 0) submitRef.current();
  }, [gameState, timeLeft]);

  useEffect(() => {
    if (!showConfetti) return;
    const id = window.setTimeout(() => setShowConfetti(false), 2000);
    return () => window.clearTimeout(id);
  }, [showConfetti]);

  const nextRound = useCallback(() => {
    if (round + 1 >= TOTAL_ROUNDS) {
      setRound((prev) => prev + 1);
      return;
    }
    setRound((prev) => prev + 1);
    loadWord();
    setGameState("playing");
  }, [round, loadWord]);

  const resetGame = useCallback(() => {
    setGameState("intro");
    setRound(0);
    setScores([]);
    setScore(0);
    setStreak(0);
    setIsNewBest(false);
  }, []);

  useEffect(() => {
    if (round >= TOTAL_ROUNDS && scores.length > 0) {
      const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
      setIsNewBest(saveBestScore(difficulty, avg));
      setBestScores(loadBestScores());
    }
  }, [round, scores, difficulty]);

  const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  const isGameOver = round >= TOTAL_ROUNDS;

  const mood: Mood =
    gameState === "playing"
      ? draggingIndex !== null
        ? "focus"
        : "idle"
      : gameState === "result"
        ? (isGameOver ? avgScore : score) >= 70
          ? "happy"
          : "sad"
        : "idle";

  return (
    <div
      className="relative overflow-hidden rounded-[2rem] border border-primary/20 bg-card/80 p-5 sm:p-8 md:p-10"
      style={{ boxShadow: "0 30px 80px -40px rgba(31,103,241,0.55)" }}
    >
      <Confetti active={showConfetti} />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(40% 50% at 0% 0%, ${BRAND.pink}26, transparent 70%),
            radial-gradient(40% 50% at 100% 0%, ${BRAND.blue}2e, transparent 70%),
            radial-gradient(45% 55% at 100% 100%, ${BRAND.teal}26, transparent 70%),
            radial-gradient(40% 50% at 0% 100%, ${BRAND.coral}22, transparent 70%)`,
        }}
      />
      <Stickers />

      <div className="relative z-10 flex flex-col gap-8">
        <div className="flex items-center gap-4">
          <KernBuddy mood={mood} size={64} />
          <div className="flex flex-col gap-1 min-w-0">
            <h3
              className="font-display font-black leading-[0.95] tracking-tight bg-clip-text text-transparent"
              style={{
                fontSize: "clamp(2.2rem, 6vw, 4.25rem)",
                backgroundImage: `linear-gradient(90deg, ${BRAND.blue}, #8B5CF6, ${BRAND.pink})`,
              }}
            >
              Kern this.
            </h3>
            <p className="text-foreground/70 text-sm md:text-base font-sans leading-snug">
              Nudge the letters until the spacing feels just right. Quick + accurate = big score.
            </p>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {gameState === "intro" && (
            <IntroScreen
              key="intro"
              difficulty={difficulty}
              setDifficulty={setDifficulty}
              bestScores={bestScores}
              onStart={startGame}
            />
          )}
          {gameState === "playing" && (
            <PlayingScreen
              key={`playing-${round}`}
              word={currentWord}
              letterOffsets={letterOffsets}
              setLetterOffsets={setLetterOffsets}
              targetKerning={targetKerning}
              showHint={showHint}
              setShowHint={setShowHint}
              onSubmit={submitRound}
              onExit={resetGame}
              round={round}
              draggingIndex={draggingIndex}
              setDraggingIndex={setDraggingIndex}
              timeLeft={timeLeft}
              streak={streak}
            />
          )}
          {gameState === "result" && (
            <ResultScreen
              key={isGameOver ? "final" : `result-${round}`}
              score={score}
              word={currentWord}
              letterOffsets={letterOffsets}
              targetKerning={targetKerning}
              round={round}
              scores={scores}
              avgScore={avgScore}
              isGameOver={isGameOver}
              isNewBest={isNewBest}
              bestScore={bestScores[difficulty]}
              streak={streak}
              difficulty={difficulty}
              onNext={nextRound}
              onRestart={resetGame}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ── Intro Screen ──
function IntroScreen({
  difficulty,
  setDifficulty,
  bestScores,
  onStart,
}: {
  difficulty: Difficulty;
  setDifficulty: (d: Difficulty) => void;
  bestScores: Record<Difficulty, number>;
  onStart: () => void;
}) {
  const reduce = useReducedMotion();

  return (
    <motion.div
      className="flex flex-col gap-7"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.5, ease: BRAND_EASE }}
    >
      <div className="flex flex-col gap-3">
        <span className="text-xs uppercase tracking-[0.25em] font-sans font-bold text-muted-foreground">
          Pick your level
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3" role="radiogroup" aria-label="Difficulty">
          {(Object.keys(DIFFICULTY_CONFIG) as Difficulty[]).map((d) => {
            const c = DIFFICULTY_CONFIG[d];
            const Icon = c.icon;
            const selected = difficulty === d;
            const best = bestScores[d];
            return (
              <motion.button
                key={d}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setDifficulty(d)}
                whileHover={{ y: -3 }}
                whileTap={{ scale: 0.97, y: 2 }}
                className="relative flex items-center gap-3 rounded-2xl px-4 py-3.5 text-left border-2 cursor-pointer transition-colors"
                style={{
                  borderColor: selected ? c.color : "hsl(var(--border))",
                  background: selected ? `${c.color}1f` : "hsl(var(--background) / 0.6)",
                  boxShadow: selected ? `0 5px 0 ${c.color}66` : "0 4px 0 hsl(var(--border))",
                }}
              >
                <span
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: `${c.color}26`, color: c.color }}
                >
                  <Icon size={20} strokeWidth={2.2} />
                </span>
                <span className="flex flex-col min-w-0">
                  <span className="font-sans font-bold text-sm" style={{ color: selected ? c.color : undefined }}>
                    {c.label}
                  </span>
                  <span className="text-[11px] text-muted-foreground font-sans">{c.sublabel}</span>
                </span>
                {best > 0 && (
                  <span
                    className="ml-auto inline-flex items-center gap-1 text-xs font-mono font-bold"
                    style={{ color: c.color }}
                    title="Your best average"
                  >
                    <Trophy size={12} />
                    {best}
                  </span>
                )}
              </motion.button>
            );
          })}
        </div>
      </div>

      <div className="relative rounded-2xl border border-border/70 bg-background/60 px-5 py-5 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 overflow-hidden">
        <div className="relative flex items-end select-none shrink-0 pr-8" aria-hidden>
          {["K", "E", "R", "N"].map((l, i) => (
            <motion.span
              key={l}
              className="font-display font-black text-5xl md:text-6xl leading-none bg-clip-text text-transparent"
              style={{ backgroundImage: `linear-gradient(180deg, ${LETTER_COLORS[i][0]}, ${LETTER_COLORS[i][1]})` }}
              animate={reduce ? undefined : { x: [0, (i - 1.5) * 9, (i - 1.5) * 9, 0] }}
              transition={{ duration: 2.8, times: [0, 0.3, 0.6, 1], repeat: Infinity, ease: "easeInOut" }}
            >
              {l}
            </motion.span>
          ))}
          <motion.span
            className="absolute right-0 bottom-0 text-foreground/70"
            animate={reduce ? undefined : { x: [0, 8, 8, 0], y: [0, -2, -2, 0] }}
            transition={{ duration: 2.8, times: [0, 0.3, 0.6, 1], repeat: Infinity, ease: "easeInOut" }}
          >
            <Hand size={22} />
          </motion.span>
        </div>
        <p className="text-foreground/75 text-sm font-sans leading-relaxed">
          <strong className="text-foreground">Drag each letter</strong> left or right until the gaps look even to your eye.
          On a keyboard, focus a letter and use the ← → keys.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Chip icon={Timer} color={BRAND.blue}>30s rounds</Chip>
        <Chip icon={Zap} color="#F59E0B">Speed bonus</Chip>
        <Chip icon={Flame} color={BRAND.coral}>Streak combos</Chip>
        <Chip icon={Trophy} color={BRAND.teal}>Best score saved</Chip>
      </div>

      <div>
        <ChunkyButton onClick={onStart} wiggle>
          <Play size={16} fill="currentColor" />
          Let&apos;s play
        </ChunkyButton>
      </div>
    </motion.div>
  );
}

// ── Timer pill ──
function TimerPill({ seconds }: { seconds: number }) {
  const pct = (seconds / TIMER_DURATION) * 100;
  const color = seconds <= 3 ? "#F43F5E" : seconds <= 8 ? "#F59E0B" : BRAND.blue;
  return (
    <motion.span
      className="inline-flex items-center gap-2 pl-2.5 pr-3 py-1.5 rounded-full bg-background/70 border border-border/70"
      animate={seconds <= 3 ? { scale: [1, 1.06, 1] } : { scale: 1 }}
      transition={seconds <= 3 ? { duration: 0.5, repeat: Infinity } : undefined}
      aria-label={`${seconds} seconds left`}
    >
      <Timer size={14} style={{ color }} />
      <span className="w-14 sm:w-20 h-1.5 rounded-full bg-border/70 overflow-hidden">
        <span
          className="block h-full rounded-full transition-[width,background-color] duration-700 ease-linear"
          style={{ width: `${pct}%`, background: color }}
        />
      </span>
      <span className="font-mono text-xs font-bold tabular-nums" style={{ color }}>
        {seconds}s
      </span>
    </motion.span>
  );
}

type Hint = "ok" | "tighter" | "looser" | null;

// ── Playing Screen ──
function PlayingScreen({
  word,
  letterOffsets,
  setLetterOffsets,
  targetKerning,
  showHint,
  setShowHint,
  onSubmit,
  onExit,
  round,
  draggingIndex,
  setDraggingIndex,
  timeLeft,
  streak,
}: {
  word: string;
  letterOffsets: number[];
  setLetterOffsets: React.Dispatch<React.SetStateAction<number[]>>;
  targetKerning: number[];
  showHint: boolean;
  setShowHint: (v: boolean) => void;
  onSubmit: () => void;
  onExit: () => void;
  round: number;
  draggingIndex: number | null;
  setDraggingIndex: (i: number | null) => void;
  timeLeft: number;
  streak: number;
}) {
  const handleDrag = useCallback(
    (index: number, deltaX: number) => {
      setLetterOffsets((prev) => {
        const next = [...prev];
        for (let i = index; i < next.length; i++) {
          next[i] = Math.round(Math.max(-30, Math.min(30, next[i] + deltaX * 0.2)));
        }
        return next;
      });
    },
    [setLetterOffsets],
  );

  const hintFor = (i: number): Hint => {
    if (!showHint || i === 0) return null;
    const diff = letterOffsets[i] - letterOffsets[i - 1] - targetKerning[i - 1];
    if (Math.abs(diff) <= 1) return "ok";
    return diff > 0 ? "tighter" : "looser";
  };

  return (
    <motion.div
      className="flex flex-col gap-5"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.5, ease: BRAND_EASE }}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onExit}
            aria-label="Exit game"
            className="w-9 h-9 rounded-full border border-border bg-background/70 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
          <div className="flex items-center gap-1" aria-label={`Round ${round + 1} of ${TOTAL_ROUNDS}`}>
            {Array.from({ length: TOTAL_ROUNDS }).map((_, i) => (
              <Star
                key={i}
                size={16}
                strokeWidth={2.2}
                fill={i < round ? BRAND.coral : "none"}
                style={{
                  color: i < round ? BRAND.coral : i === round ? BRAND.blue : "hsl(var(--muted-foreground) / 0.35)",
                }}
              />
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {streak >= 2 && (
            <motion.span
              className="inline-flex items-center gap-1 text-xs font-sans font-bold px-2.5 py-1.5 rounded-full"
              style={{ background: `${BRAND.coral}22`, color: BRAND.coral }}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
            >
              <Flame size={13} fill="currentColor" />
              {streak}x
            </motion.span>
          )}
          <TimerPill seconds={timeLeft} />
        </div>
      </div>

      <div
        className="relative rounded-3xl border border-border/70 overflow-hidden px-3 sm:px-8 pt-6 pb-5 flex flex-col items-center gap-4"
        style={{
          backgroundColor: "hsl(var(--background) / 0.7)",
          backgroundImage: "radial-gradient(hsl(var(--foreground) / 0.09) 1px, transparent 1px)",
          backgroundSize: "18px 18px",
        }}
      >
        <span className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.25em] font-sans font-bold text-muted-foreground">
          <Hand size={13} /> Drag letters to kern
        </span>

        <div className="w-full flex justify-center py-2 overflow-hidden">
          <div className="flex items-start justify-center select-none" style={{ fontSize: letterFontSize(word.length) }}>
            {word.split("").map((letter, i) => (
              <DraggableLetter
                key={`${word}-${i}`}
                letter={letter}
                offset={letterOffsets[i] || 0}
                isDragging={draggingIndex === i}
                hint={hintFor(i)}
                colors={LETTER_COLORS[i % LETTER_COLORS.length]}
                onDrag={(delta) => handleDrag(i, delta)}
                onDragStart={() => setDraggingIndex(i)}
                onDragEnd={() => setDraggingIndex(null)}
              />
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowHint(!showHint)}
          aria-pressed={showHint}
          className="inline-flex items-center gap-1.5 text-xs font-sans font-bold px-3.5 py-1.5 rounded-full border transition-colors cursor-pointer"
          style={
            showHint
              ? { background: "#FDE68A33", borderColor: "#F59E0B88", color: "#D97706" }
              : { borderColor: "hsl(var(--border))", color: "hsl(var(--muted-foreground))" }
          }
        >
          <Lightbulb size={13} fill={showHint ? "currentColor" : "none"} />
          {showHint ? "Hints on" : "Need a hint?"}
        </button>
      </div>

      <div className="flex justify-end">
        <ChunkyButton onClick={onSubmit} from="#10B981" to={BRAND.teal} shade="#047857">
          <Check size={16} strokeWidth={3} />
          Check
        </ChunkyButton>
      </div>
    </motion.div>
  );
}

// ── Draggable Letter ──
function DraggableLetter({
  letter,
  offset,
  isDragging,
  hint,
  colors,
  onDrag,
  onDragStart,
  onDragEnd,
}: {
  letter: string;
  offset: number;
  isDragging: boolean;
  hint: Hint;
  colors: [string, string];
  onDrag: (delta: number) => void;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      let lastX = e.clientX;
      onDragStart();
      const move = (ev: PointerEvent) => {
        const d = ev.clientX - lastX;
        lastX = ev.clientX;
        onDrag(d);
      };
      const up = () => {
        onDragEnd();
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
        window.removeEventListener("pointercancel", up);
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
      window.addEventListener("pointercancel", up);
    },
    [onDrag, onDragStart, onDragEnd],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        onDrag(-5);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        onDrag(5);
      }
    },
    [onDrag],
  );

  const [top, bottom] = colors;
  const near = Math.abs(offset) < 2;

  return (
    <div className="flex flex-col items-center">
      <motion.div
        className="relative cursor-grab active:cursor-grabbing touch-none rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        style={{ x: offset }}
        onPointerDown={handlePointerDown}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="slider"
        aria-label={`Letter ${letter}`}
        aria-valuenow={offset}
        aria-valuemin={-30}
        aria-valuemax={30}
        animate={{ scale: isDragging ? 1.1 : 1, y: isDragging ? -8 : 0, rotate: isDragging ? -3 : 0 }}
        whileHover={{ y: -3 }}
        transition={{ type: "spring", stiffness: 420, damping: 22 }}
      >
        <span
          className="block font-display font-black leading-none select-none bg-clip-text text-transparent px-[0.02em]"
          style={{
            backgroundImage: `linear-gradient(180deg, ${top}, ${bottom})`,
            filter: isDragging ? `drop-shadow(0 12px 14px ${bottom}66)` : `drop-shadow(0 4px 0 ${bottom}33)`,
          }}
        >
          {letter}
        </span>
      </motion.div>

      <motion.span
        aria-hidden
        className="mt-2 h-1.5 rounded-full"
        style={{ x: offset, width: isDragging ? 30 : 22, background: bottom, opacity: isDragging ? 0.9 : 0.35 }}
      />
      <span
        className={`mt-1.5 font-mono text-[11px] font-bold tabular-nums px-1.5 rounded-md ${
          near ? "text-emerald-500" : "text-foreground/50"
        }`}
      >
        {offset > 0 ? "+" : ""}
        {offset}
      </span>
      <AnimatePresence>
        {hint && (
          <motion.span
            key={hint}
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.6 }}
            className="mt-1 w-6 h-6 rounded-full flex items-center justify-center"
            style={
              hint === "ok"
                ? { background: "#10B98126", color: "#10B981" }
                : { background: "#F59E0B26", color: "#D97706" }
            }
            title={hint === "ok" ? "Looks good" : hint === "tighter" ? "Move closer" : "Give it more room"}
          >
            {hint === "ok" ? (
              <Check size={13} strokeWidth={3} />
            ) : hint === "tighter" ? (
              <ArrowLeft size={13} strokeWidth={3} />
            ) : (
              <ArrowRight size={13} strokeWidth={3} />
            )}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Result Screen ──
function ResultScreen({
  score,
  word,
  letterOffsets,
  targetKerning,
  round,
  scores,
  avgScore,
  isGameOver,
  isNewBest,
  bestScore,
  streak,
  difficulty,
  onNext,
  onRestart,
}: {
  score: number;
  word: string;
  letterOffsets: number[];
  targetKerning: number[];
  round: number;
  scores: number[];
  avgScore: number;
  isGameOver: boolean;
  isNewBest: boolean;
  bestScore: number;
  streak: number;
  difficulty: Difficulty;
  onNext: () => void;
  onRestart: () => void;
}) {
  const shown = isGameOver ? avgScore : score;
  const vibe = getScoreVibe(shown);
  const stars = starCount(shown);
  const targetOffsets = useMemo(() => {
    const out = [0];
    for (const k of targetKerning) out.push(out[out.length - 1] + k);
    return out;
  }, [targetKerning]);
  const compareSize = `clamp(2.25rem, ${Math.round(80 / Math.max(3, word.length))}vw, 4.5rem)`;
  const isLastRound = round + 1 >= TOTAL_ROUNDS;

  return (
    <motion.div
      className="flex flex-col gap-5"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.5, ease: BRAND_EASE }}
    >
      <div className="rounded-3xl border border-border/70 bg-background/70 overflow-hidden">
        <div className="relative flex flex-col items-center gap-3 px-6 pt-7 pb-6 text-center">
          {isGameOver && (
            <motion.span
              className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.25em] font-sans font-bold px-3 py-1 rounded-full"
              style={{ background: `${BRAND.coral}22`, color: BRAND.coral }}
              initial={{ y: -10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
            >
              <Trophy size={12} />
              {isNewBest ? "New personal best!" : "Final score"}
            </motion.span>
          )}

          <div className="flex gap-1.5" aria-label={`${stars} of 3 stars`}>
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                initial={{ scale: 0, rotate: -40 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.15 + i * 0.12, type: "spring", stiffness: 380, damping: 14 }}
              >
                <Star
                  size={i === 1 ? 36 : 28}
                  strokeWidth={2}
                  fill={i < stars ? "#FBBF24" : "none"}
                  style={{ color: i < stars ? "#F59E0B" : "hsl(var(--muted-foreground) / 0.35)" }}
                />
              </motion.span>
            ))}
          </div>

          <motion.div
            className="relative w-32 h-32 rounded-full p-2"
            style={{ background: `conic-gradient(${vibe.color} ${shown * 3.6}deg, hsl(var(--muted)) 0)` }}
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 220, damping: 16 }}
          >
            <div className="w-full h-full rounded-full bg-background flex flex-col items-center justify-center">
              <span className="font-display font-black text-5xl leading-none" style={{ color: vibe.color }}>
                {shown}
              </span>
              <span className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground font-sans mt-1">
                {isGameOver ? "average" : "points"}
              </span>
            </div>
          </motion.div>

          <span
            className="inline-flex px-3 py-1 rounded-full text-xs font-sans font-bold uppercase tracking-widest"
            style={{ background: `${vibe.color}22`, color: vibe.color }}
          >
            {vibe.label}
          </span>
          <p className="text-foreground/75 text-sm md:text-base font-sans">
            {isGameOver
              ? `${DIFFICULTY_CONFIG[difficulty].label} · ${TOTAL_ROUNDS} rounds${bestScore > 0 ? ` · best ${bestScore}` : ""}`
              : getFunMessage(score)}
          </p>
          {!isGameOver && streak >= 2 && (
            <span
              className="inline-flex items-center gap-1 text-xs font-sans font-bold px-3 py-1 rounded-full"
              style={{ background: `${BRAND.coral}22`, color: BRAND.coral }}
            >
              <Flame size={12} fill="currentColor" />
              {streak}x streak
            </span>
          )}
        </div>

        {!isGameOver && (
          <div className="border-t border-border/70 px-4 sm:px-6 py-6 flex flex-col items-center gap-4">
            <div className="relative w-full flex items-center justify-center overflow-hidden" style={{ height: `calc(${compareSize} * 1.2)` }}>
              <div className="absolute flex items-center" style={{ fontSize: compareSize }}>
                {word.split("").map((letter, i) => (
                  <span
                    key={i}
                    className="font-display font-black leading-none"
                    style={{ color: `${BRAND.blue}33`, transform: `translateX(${targetOffsets[i] ?? 0}px)` }}
                  >
                    {letter}
                  </span>
                ))}
              </div>
              <div className="absolute flex items-center" style={{ fontSize: compareSize }}>
                {word.split("").map((letter, i) => (
                  <span
                    key={i}
                    className="font-display font-black leading-none text-foreground"
                    style={{ transform: `translateX(${letterOffsets[i] ?? 0}px)` }}
                  >
                    {letter}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-4 text-[11px] font-sans font-medium">
              <span className="inline-flex items-center gap-1.5 text-foreground/70">
                <span className="w-2 h-2 rounded-full bg-foreground" /> Yours
              </span>
              <span className="inline-flex items-center gap-1.5" style={{ color: BRAND.blue }}>
                <span className="w-2 h-2 rounded-full" style={{ background: `${BRAND.blue}55` }} /> Optimal
              </span>
            </div>
          </div>
        )}
      </div>

      {!isGameOver && scores.length > 1 && (
        <div className="flex items-center gap-3">
          <span className="text-muted-foreground text-[10px] uppercase tracking-[0.2em] font-sans">Avg so far</span>
          <div className="flex-1 h-px bg-border" />
          <span className="text-foreground font-sans text-sm font-bold">{avgScore}</span>
        </div>
      )}

      <div className="flex flex-wrap gap-3 justify-end">
        {!isGameOver ? (
          <ChunkyButton onClick={onNext}>
            {isLastRound ? "See results" : "Next word"}
            <ArrowRight size={16} strokeWidth={2.6} />
          </ChunkyButton>
        ) : (
          <>
            <Link
              href="/work"
              className="inline-flex items-center px-6 py-3.5 rounded-full border border-border text-muted-foreground hover:text-foreground hover:border-primary/40 font-sans text-xs font-bold uppercase tracking-[0.15em] transition-colors"
            >
              View Work
            </Link>
            <ChunkyButton onClick={onRestart} wiggle>
              <RotateCcw size={16} strokeWidth={2.6} />
              Play again
            </ChunkyButton>
          </>
        )}
      </div>
    </motion.div>
  );
}
