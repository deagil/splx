import React from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import Image from 'next/image'
import { HeroHeader } from './header'
import { Sparkle } from 'lucide-react'

export default function HeroSection() {
    return (
        <>
            <HeroHeader />
            <main>
                <section className="before:bg-muted border-e-foreground relative overflow-hidden before:absolute before:inset-1 before:h-[calc(100%-8rem)] before:rounded-2xl sm:before:inset-2 md:before:rounded-[2rem] lg:before:h-[calc(100%-14rem)]">
                    <div className="py-20 md:py-36">
                        <div className="relative z-10 mx-auto max-w-5xl px-6 text-center">
                            <div>
                                <Link
                                    href="#pricing"
                                    className="hover:bg-foreground/5 mx-auto flex w-fit items-center justify-center gap-2 rounded-md py-0.5 pl-1 pr-3 transition-colors duration-150">
                                    <div
                                        aria-hidden
                                        className="border-background bg-linear-to-b dark:inset-shadow-2xs to-foreground from-primary relative flex size-5 items-center justify-center rounded border shadow-md shadow-black/20 ring-1 ring-black/10">
                                        <div className="absolute inset-x-0 inset-y-1.5 border-y border-dotted border-white/25"></div>
                                        <div className="absolute inset-x-1.5 inset-y-0 border-x border-dotted border-white/25"></div>
                                        <Sparkle className="size-3 fill-white stroke-white drop-shadow" />
                                    </div>
                                    <span className="font-medium">Suplex just launched</span>
                                </Link>
                                <h1 className="mx-auto mt-8 max-w-3xl text-balance text-4xl font-bold tracking-tight sm:text-5xl">Ship data-connected pages without a heavy buildout</h1>
                                <p className="text-muted-foreground mx-auto my-6 max-w-xl text-balance text-xl">Suplex is the AI-native builder for founders and small teams - wire up your data, publish polished pages, and stay in control of what ships.</p>

                                <div className="flex items-center justify-center gap-3">
                                    <Button
                                        asChild
                                        size="lg">
                                        <Link href="/signin">
                                            <span className="text-nowrap">Start free</span>
                                        </Link>
                                    </Button>
                                    <Button
                                        asChild
                                        size="lg"
                                        variant="outline">
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
                                    <div className="bg-background rounded-(--radius) relative mx-auto w-full overflow-hidden border border-transparent shadow-lg shadow-black/10 ring-1 ring-black/10">
                                        <div className="relative aspect-video w-full overflow-hidden">
                                            <video
                                                src="/videos/chat-sidebar.mp4"
                                                autoPlay
                                                muted
                                                loop
                                                playsInline
                                                className="size-full object-contain"
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
    )
}
