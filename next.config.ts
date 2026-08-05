import { execSync } from "node:child_process";
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

export default nextConfig;
