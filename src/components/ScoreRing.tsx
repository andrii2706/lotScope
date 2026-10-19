type Tone = "good" | "warn" | "bad";

export function ScoreRing({ score, tone, size = 84 }: { score: number; tone: Tone; size?: number }) {
  const radius = 27;
  const circumference = 2 * Math.PI * radius;
  const color = { good: "var(--good)", warn: "var(--warn)", bad: "var(--bad)" }[tone];
  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`Оцінка стану ${score} зі 100`}
    >
      <svg viewBox="0 0 64 64" className="size-full -rotate-90">
        <circle cx="32" cy="32" r={radius} fill="none" stroke="var(--line)" strokeWidth="6" />
        <circle
          cx="32"
          cy="32"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - score / 100)}
        />
      </svg>
      <span className="absolute inset-0 grid place-items-center">
        <span className="text-center leading-none">
          <span className="block text-2xl font-extrabold">{score}</span>
          <span className="mt-0.5 block text-[10px] font-bold text-muted">зі 100</span>
        </span>
      </span>
    </div>
  );
}
