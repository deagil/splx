"use client";

import { DecorationContainer } from "./decoration-container";

/**
 * Animated gradient mesh decoration for the Workspace Profile tab.
 * Features softly morphing gradient blobs that shift and scale.
 */
export function GradientMesh() {
  return (
    <DecorationContainer showEdgeFades={false}>
      <div className="absolute inset-0 overflow-hidden rounded-lg bg-gradient-to-br from-muted/30 to-muted/10">
        {/* Blob 1 - Brand color, top-left origin */}
        <div
          className="absolute -top-8 -left-8 h-24 w-24 rounded-full opacity-60 blur-2xl"
          style={{
            animation: "meshBlob1 18s ease-in-out infinite",
            background: "var(--brand)",
          }}
        />

        {/* Blob 2 - Highlight color, center-right origin */}
        <div
          className="absolute top-1/2 -right-4 h-20 w-20 -translate-y-1/2 rounded-full opacity-50 blur-2xl"
          style={{
            animation: "meshBlob2 15s ease-in-out infinite",
            background: "var(--highlight)",
          }}
        />

        {/* Blob 3 - Muted accent, bottom-center origin */}
        <div
          className="absolute bottom-0 left-1/3 h-16 w-32 rounded-full opacity-40 blur-xl"
          style={{
            animation: "meshBlob3 20s ease-in-out infinite",
            background:
              "linear-gradient(135deg, var(--brand), var(--highlight))",
          }}
        />

        {/* Blob 4 - Subtle accent, top-right */}
        <div
          className="absolute -top-4 -right-6 h-14 w-14 rounded-full opacity-30 blur-xl"
          style={{
            animation: "meshBlob4 12s ease-in-out infinite reverse",
            background: "var(--brand)",
          }}
        />
      </div>

      <style global jsx>{`
        @keyframes meshBlob1 {
          0%,
          100% {
            transform: translate(0, 0) scale(1);
          }
          33% {
            transform: translate(30px, 20px) scale(1.2);
          }
          66% {
            transform: translate(15px, 35px) scale(0.9);
          }
        }

        @keyframes meshBlob2 {
          0%,
          100% {
            transform: translateY(-50%) scale(1);
          }
          50% {
            transform: translate(-40px, -30%) scale(1.3);
          }
        }

        @keyframes meshBlob3 {
          0%,
          100% {
            transform: translateX(0) scaleX(1);
          }
          50% {
            transform: translateX(50px) scaleX(1.4);
          }
        }

        @keyframes meshBlob4 {
          0%,
          100% {
            transform: translate(0, 0) scale(1);
          }
          50% {
            transform: translate(-20px, 15px) scale(1.5);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          @keyframes meshBlob1 {
            0%,
            100% {
              transform: none;
            }
          }
          @keyframes meshBlob2 {
            0%,
            100% {
              transform: translateY(-50%);
            }
          }
          @keyframes meshBlob3 {
            0%,
            100% {
              transform: none;
            }
          }
          @keyframes meshBlob4 {
            0%,
            100% {
              transform: none;
            }
          }
        }
      `}</style>
    </DecorationContainer>
  );
}
