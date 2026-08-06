import { execSync } from "node:child_process";
import { withEve } from "eve/next";
import type { NextConfig } from "next";

let gitBranch = "unknown";
try {
  gitBranch = execSync("git rev-parse --abbrev-ref HEAD", {
    encoding: "utf-8",
  }).trim();
} catch {
  // Fallback if git command fails
  gitBranch = process.env.VERCEL_GIT_COMMIT_REF || "unknown";
}

const nextConfig: NextConfig = {
  cacheComponents: true,
  env: {
    NEXT_PUBLIC_GIT_BRANCH: gitBranch,
  },
  images: {
    remotePatterns: [
      {
        hostname: "avatar.vercel.sh",
      },
      {
        //https://nextjs.org/docs/messages/next-image-unconfigured-host
        hostname: "*.public.blob.vercel-storage.com",
        protocol: "https",
      },
      {
        hostname: "images.unsplash.com",
        protocol: "https",
      },
    ],
  },
};

// withEve mounts the eve agent under /eve/v1 as a separate service: in dev it
// starts `eve dev` and rewrites to it, on Vercel it writes Build Output service
// routes. It merges into the existing vercel.json rather than replacing it, so
// the /api/internal/workflows/tick cron survives.
export default withEve(nextConfig);
