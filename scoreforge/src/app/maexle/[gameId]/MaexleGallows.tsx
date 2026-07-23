// Baut sich Stück für Stück auf, je mehr Leben verloren gehen: Hügel, Stamm,
// Querbalken, Strebe, Sockel, Strick, Kopf, Körper, Arm 1, Arm 2, Bein 1,
// Bein 2 - exakt 12 Teile, weil es maximal 12 Leben gibt (siehe maexle/setup).
// Bei weniger Startleben werden mehrere Teile pro verlorenem Leben auf einmal
// enthüllt, sodass bei 0 Leben immer die komplette Figur zu sehen ist. Beim
// letzten Leben fällt die Figur vom Strick, löst sich auf und ein Grabstein
// bleibt zurück - übrig bleiben nur Galgen und Grabstein.
const TOTAL_PARTS = 12;

type MaexleGallowsProps = {
  livesTotal: number;
  livesRemaining: number;
  className?: string;
};

export function MaexleGallows({
  livesTotal,
  livesRemaining,
  className,
}: MaexleGallowsProps) {
  const lost = Math.max(0, livesTotal - livesRemaining);
  const isDead = livesTotal > 0 && livesRemaining <= 0;
  const stage =
    livesTotal > 0
      ? Math.min(TOTAL_PARTS, Math.round((lost / livesTotal) * TOTAL_PARTS))
      : 0;

  const show = (n: number) => stage >= n;

  return (
    <svg
      viewBox="0 0 120 150"
      className={className}
      aria-hidden="true"
      role="presentation"
    >
      {/* Boden */}
      <line
        x1="8"
        y1="140"
        x2="112"
        y2="140"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        opacity="0.35"
      />

      {/* 1: Hügel */}
      {show(1) ? (
        <path d="M 18 140 Q 40 116 62 140 Z" fill="#4ade80" className="sf-reveal-pop" />
      ) : null}

      {/* 2: Stamm (Balken nach oben) */}
      {show(2) ? (
        <line
          x1="40"
          y1="130"
          x2="40"
          y2="18"
          stroke="#a1662f"
          strokeWidth="6"
          strokeLinecap="round"
          className="sf-reveal-pop"
        />
      ) : null}

      {/* 3: Querbalken (Balken rüber) */}
      {show(3) ? (
        <line
          x1="40"
          y1="18"
          x2="86"
          y2="18"
          stroke="#a1662f"
          strokeWidth="6"
          strokeLinecap="round"
          className="sf-reveal-pop"
        />
      ) : null}

      {/* 4: Strebe (Balken zur Stabilität) */}
      {show(4) ? (
        <line
          x1="40"
          y1="34"
          x2="58"
          y2="18"
          stroke="#a1662f"
          strokeWidth="4"
          strokeLinecap="round"
          className="sf-reveal-pop"
        />
      ) : null}

      {/* 5: Sockel (Fundament am Fuß des Stamms) */}
      {show(5) ? (
        <rect
          x="27"
          y="126"
          width="26"
          height="7"
          rx="2"
          fill="#a1662f"
          className="sf-reveal-pop"
        />
      ) : null}

      {/* 6: Strick */}
      {show(6) ? (
        <line
          x1="86"
          y1="18"
          x2="86"
          y2="34"
          stroke="#ef5b2a"
          strokeWidth="3"
          className="sf-reveal-pop"
        />
      ) : null}

      {/* 7-12: die Figur (Kopf, Körper, Arme, Beine) - fällt als Ganzes vom
          Strick, sobald alle Leben aufgebraucht sind, und blendet dabei aus. */}
      <g className={isDead ? "sf-maexle-fallen" : undefined}>
        {show(7) ? (
          <circle
            cx="86"
            cy="45"
            r="11"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            className={isDead ? undefined : "sf-reveal-pop"}
          />
        ) : null}
        {show(8) ? (
          <line
            x1="86"
            y1="56"
            x2="86"
            y2="92"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            className={isDead ? undefined : "sf-reveal-pop"}
          />
        ) : null}
        {show(9) ? (
          <line
            x1="86"
            y1="66"
            x2="70"
            y2="80"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            className={isDead ? undefined : "sf-reveal-pop"}
          />
        ) : null}
        {show(10) ? (
          <line
            x1="86"
            y1="66"
            x2="102"
            y2="80"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            className={isDead ? undefined : "sf-reveal-pop"}
          />
        ) : null}
        {show(11) ? (
          <line
            x1="86"
            y1="92"
            x2="72"
            y2="115"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            className={isDead ? undefined : "sf-reveal-pop"}
          />
        ) : null}
        {show(12) ? (
          <line
            x1="86"
            y1="92"
            x2="100"
            y2="115"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            className={isDead ? undefined : "sf-reveal-pop"}
          />
        ) : null}
      </g>

      {/* Grabstein - erscheint mit kurzer Verzögerung, wenn die Figur fällt */}
      {isDead ? (
        <g className="sf-reveal-pop" style={{ animationDelay: "0.5s" }}>
          <rect x="78" y="118" width="17" height="22" rx="6" fill="#94a3b8" />
          <line
            x1="82.5"
            y1="127"
            x2="90.5"
            y2="127"
            stroke="#101820"
            strokeWidth="1.5"
            opacity="0.5"
          />
          <line
            x1="86.5"
            y1="123"
            x2="86.5"
            y2="131"
            stroke="#101820"
            strokeWidth="1.5"
            opacity="0.5"
          />
        </g>
      ) : null}
    </svg>
  );
}
