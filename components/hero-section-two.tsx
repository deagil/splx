import { Sparkle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { HeroHeader } from "./header";

export default function HeroSection() {
  return (
    <>
      <HeroHeader />
      <main>
        <section className="relative overflow-hidden border-e-foreground before:absolute before:inset-1 before:h-[calc(100%-8rem)] before:rounded-2xl before:bg-muted sm:before:inset-2 md:before:rounded-[2rem] lg:before:h-[calc(100%-14rem)]">
          <div className="py-20 md:py-36">
            <div className="relative z-10 mx-auto max-w-5xl px-6 text-center">
              <div>
                <Link
                  className="mx-auto flex w-fit items-center justify-center gap-2 rounded-md py-0.5 pr-3 pl-1 transition-colors duration-150 hover:bg-foreground/5"
                  href="#pricing"
                >
                  <div
                    aria-hidden
                    className="relative flex size-5 items-center justify-center rounded border border-background bg-linear-to-b from-primary to-foreground shadow-black/20 shadow-md ring-1 ring-black/10 dark:inset-shadow-2xs"
                  >
                    <div className="absolute inset-x-0 inset-y-1.5 border-white/25 border-y border-dotted" />
                    <div className="absolute inset-x-1.5 inset-y-0 border-white/25 border-x border-dotted" />
                    <Sparkle className="size-3 fill-white stroke-white drop-shadow" />
                  </div>
                  <span className="font-medium">Suplex just launched</span>
                </Link>
                <h1 className="mx-auto mt-8 max-w-3xl text-balance font-bold text-4xl tracking-tight sm:text-5xl">
                  Ship data-connected pages without a heavy buildout
                </h1>
                <p className="mx-auto my-6 max-w-xl text-balance text-muted-foreground text-xl">
                  Suplex is the AI-native builder for founders and small teams -
                  wire up your data, publish polished pages, and stay in control
                  of what ships.
                </p>

                <div className="flex items-center justify-center gap-3">
                  <Button asChild size="lg">
                    <Link href="/signin">
                      <span className="text-nowrap">Start free</span>
                    </Link>
                  </Button>
                  <Button asChild size="lg" variant="outline">
                    <Link href="#features">
                      <span className="text-nowrap">See how it works</span>
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="relative z-10 mx-auto max-w-5xl px-6">
                <div className="mt-12 md:mt-16">
                  <div className="relative mx-auto w-full overflow-hidden rounded-(--radius) border border-transparent bg-background shadow-black/10 shadow-lg ring-1 ring-black/10">
                    <div className="relative aspect-video w-full overflow-hidden">
                      <video
                        autoPlay
                        className="size-full object-contain"
                        loop
                        muted
                        playsInline
                        src="/videos/chat-sidebar.mp4"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
