"use client";

import { DecorationContainer } from "./decoration-container";

/** Node positions as percentages [x%, y%] with optional pulse */
const nodes: Array<{ x: number; y: number; pulse?: boolean; delay?: number }> =
  [
    { x: 5, y: 30, delay: 0 },
    { x: 12, y: 60, pulse: true, delay: 2 },
    { x: 20, y: 20, delay: 1 },
    { x: 28, y: 50, delay: 3 },
    { x: 35, y: 75, pulse: true, delay: 0 },
    { x: 42, y: 25, delay: 2 },
    { x: 48, y: 55, delay: 4 },
    { x: 55, y: 15, pulse: true, delay: 1 },
    { x: 62, y: 45, delay: 3 },
    { x: 68, y: 70, delay: 0 },
    { x: 75, y: 35, pulse: true, delay: 2 },
    { x: 82, y: 60, delay: 1 },
    { x: 88, y: 20, delay: 4 },
    { x: 94, y: 50, pulse: true, delay: 3 },
  ];

/** Static connections between node indices */
const connections: Array<[number, number]> = [
  [0, 1],
  [1, 3],
  [2, 3],
  [2, 5],
  [3, 4],
  [4, 6],
  [5, 6],
  [5, 7],
  [6, 8],
  [7, 8],
  [8, 9],
  [8, 10],
  [9, 11],
  [10, 11],
  [10, 12],
  [11, 13],
  [12, 13],
];

/**
 * Connected nodes network decoration for the Collaboration tab.
 * Features dots with connecting lines and subtle drift/pulse animations.
 */
export function ConnectedNodes() {
  return (
    <DecorationContainer>
      <div className="absolute inset-0">
        {/* SVG for connection lines */}
        <svg
          className="absolute inset-0 h-full w-full"
          preserveAspectRatio="none"
        >
          {connections.map(([from, to], index) => {
            const fromNode = nodes[from];
            const toNode = nodes[to];
            return (
              <line
                key={index}
                x1={`${fromNode.x}%`}
                y1={`${fromNode.y}%`}
                x2={`${toNode.x}%`}
                y2={`${toNode.y}%`}
                className="stroke-border"
                strokeWidth="1"
                strokeOpacity="0.4"
              />
            );
          })}
        </svg>

        {/* Node dots */}
        {nodes.map((node, index) => (
          <div
            key={index}
            className="absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-muted-foreground/60"
            style={{
              left: `${node.x}%`,
              top: `${node.y}%`,
              animation: node.pulse
                ? `nodePulse 3s ease-in-out ${node.delay ?? 0}s infinite`
                : `nodeDrift 8s ease-in-out ${node.delay ?? 0}s infinite`,
            }}
          />
        ))}
      </div>

      <style jsx global>{`
        @keyframes nodePulse {
          0%,
          100% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 0.6;
          }
          50% {
            transform: translate(-50%, -50%) scale(1.8);
            opacity: 1;
          }
        }

        @keyframes nodeDrift {
          0%,
          100% {
            transform: translate(-50%, -50%) translateY(0);
          }
          50% {
            transform: translate(-50%, -50%) translateY(-4px);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          @keyframes nodePulse {
            0%,
            100% {
              transform: translate(-50%, -50%);
              opacity: 0.8;
            }
          }
          @keyframes nodeDrift {
            0%,
            100% {
              transform: translate(-50%, -50%);
            }
          }
        }
      `}</style>
    </DecorationContainer>
  );
}

