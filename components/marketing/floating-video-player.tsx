"use client";
import { Play } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface FloatingVideoPlayerProps {
  avatarSrc?: string;
  className?: string;
  duration?: string;
  name: string;
  role: string;
  videoUrl?: string;
}

export default function FloatingVideoPlayer({
  name,
  role,
  avatarSrc = "/placeholder-avatar.png",
  videoUrl,
  duration = "1:01",
  className,
}: FloatingVideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);

  return (
    <div
      className={cn("fixed bottom-6 left-6 z-30 hidden lg:block", className)}
    >
      <div className="relative">
        <button
          aria-label={`Play video with ${name}`}
          className="group relative flex size-24 items-center justify-center overflow-hidden rounded-full border-4 border-background bg-background shadow-black/20 shadow-lg ring-1 ring-black/10 transition-transform hover:scale-105"
          onClick={() => setIsPlaying(!isPlaying)}
          type="button"
        >
          {!!avatarSrc && (
            <Image
              alt={`${name} ${role}`}
              className="object-cover"
              fill
              src={avatarSrc}
            />
          )}
          {!isPlaying && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm">
              <div className="flex flex-col items-center gap-1">
                <div className="flex size-10 items-center justify-center rounded-full bg-white/90 shadow-md">
                  <Play className="ml-0.5 size-5 fill-foreground stroke-foreground" />
                </div>
                <span className="font-medium text-white text-xs drop-shadow">
                  {duration}
                </span>
              </div>
            </div>
          )}
        </button>
        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-center">
          <div className="rounded-md bg-background px-2 py-1 font-medium text-xs shadow-md ring-1 ring-black/10">
            {name}
          </div>
          <div className="mt-1 text-muted-foreground text-xs">{role}</div>
        </div>
      </div>
    </div>
  );
}
