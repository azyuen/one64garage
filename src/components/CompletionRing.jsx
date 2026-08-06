// A small instrument-cluster style ring. Each car's "completeness" is made of three
// segments — diecast logged, GT journal started, driver development notes recorded —
// echoing a GT loading-screen rev gauge rather than a generic progress bar.

const SEGMENTS = ['diecast', 'gt', 'dev'];

export default function CompletionRing({ record, size = 40 }) {
  const filled = {
    diecast: Boolean(record?.diecast?.brand),
    gt: Boolean(record?.gt?.inGameModel || record?.gt?.rating || record?.gt?.drivingTips),
    dev: Boolean(record?.driverDev?.length),
  };
  const count = SEGMENTS.filter((s) => filled[s]).length;

  const radius = size / 2 - 3;
  const circumference = 2 * Math.PI * radius;
  const segLen = circumference / 3;
  const gap = 3;

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }} title={`${count}/3 sections documented`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth="2"
          className="stroke-canvas-line dark:stroke-garage-line"
        />
        {SEGMENTS.map((seg, i) => (
          <circle
            key={seg}
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth="2"
            strokeDasharray={`${segLen - gap} ${circumference}`}
            strokeDashoffset={-(i * segLen)}
            strokeLinecap="round"
            className={filled[seg] ? 'stroke-vermilion' : 'stroke-transparent'}
          />
        ))}
      </svg>
      <span className="absolute inset-0 flex items-center justify-center font-mono text-[9px] text-ink-soft dark:text-paper-soft">
        {count}/3
      </span>
    </div>
  );
}
