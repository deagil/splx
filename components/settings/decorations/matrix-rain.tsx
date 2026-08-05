"use client";

import { DecorationContainer } from "./decoration-container";

/** Characters used in the matrix rain effect */
const chars = "01アイウエオカキクケコサシスセソタチツテト∞§†‡※◊◦•".split("");

/** Column configurations with position and timing */
const columns: Array<{
  x: number;
  speed: number;
  delay: number;
  opacity: number;
}> = [
  { delay: 0, opacity: 0.4, speed: 4, x: 3 },
  { delay: 1.2, opacity: 0.6, speed: 5, x: 8 },
  { delay: 0.5, opacity: 0.3, speed: 3.5, x: 14 },
  { delay: 2, opacity: 0.5, speed: 4.5, x: 20 },
  { delay: 0.8, opacity: 0.4, speed: 3, x: 26 },
  { delay: 1.5, opacity: 0.7, speed: 5.5, x: 32 },
  { delay: 0.3, opacity: 0.5, speed: 4, x: 38 },
  { delay: 2.5, opacity: 0.4, speed: 3.8, x: 44 },
  { delay: 0.7, opacity: 0.6, speed: 4.2, x: 50 },
  { delay: 1.8, opacity: 0.3, speed: 3.2, x: 56 },
  { delay: 0.4, opacity: 0.5, speed: 5, x: 62 },
  { delay: 2.2, opacity: 0.4, speed: 4.8, x: 68 },
  { delay: 1, opacity: 0.6, speed: 3.5, x: 74 },
  { delay: 0.6, opacity: 0.5, speed: 4.5, x: 80 },
  { delay: 1.4, opacity: 0.4, speed: 3.8, x: 86 },
  { delay: 0.9, opacity: 0.3, speed: 5.2, x: 92 },
  { delay: 2.1, opacity: 0.5, speed: 4, x: 97 },
];

/** Generate a string of random characters for a column */
function getColumnChars(seed: number): string {
  const result: string[] = [];
  for (let i = 0; i < 8; i += 1) {
    const charIndex = (seed + i * 7) % chars.length;
    result.push(chars[charIndex]);
  }
  return result.join("\n");
}

/**
 * Matrix rain decoration for the Governance & Security tab.
 * Features falling characters in columns with staggered animations.
 */
export function MatrixRain() {
  return (
    <DecorationContainer>
      {/* Bottom gradient fade for characters */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-8 bg-gradient-to-t from-background to-transparent" />

      <div className="absolute inset-0 overflow-hidden">
        {columns.map((col, index) => (
          <div
            className="absolute whitespace-pre font-mono text-[10px] text-emerald-500/70 leading-tight dark:text-emerald-400/70"
            key={index}
            style={{
              animation: `matrixFall ${col.speed}s linear ${col.delay}s infinite`,
              left: `${col.x}%`,
              opacity: col.opacity,
              top: "-100%",
            }}
          >
            {getColumnChars(index)}
          </div>
        ))}
      </div>

      <style global jsx>{`
        @keyframes matrixFall {
          0% {
            transform: translateY(0);
          }
          100% {
            transform: translateY(200%);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          @keyframes matrixFall {
            0%,
            100% {
              transform: translateY(50%);
            }
          }
        }
      `}</style>
    </DecorationContainer>
  );
}
