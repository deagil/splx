import { Button } from '@/components/ui/button'
import { CalendarCheck, ChevronRight, Target } from 'lucide-react'
import Link from 'next/link'

export default function FeaturesSection() {
    return (
        <section id="features">
            <div className="bg-muted/50 py-24">
                <div className="mx-auto w-full max-w-5xl px-6">
                    <div className="grid gap-12 md:grid-cols-5">
                        <div className="md:col-span-2">
                            <h2 className="text-foreground text-balance text-4xl font-semibold">An AI-native builder that keeps your launch moving</h2>
                            <Button
                                className="mt-8 pr-2"
                                variant="outline"
                                asChild>
                                <Link href="#pricing">
                                    View pricing
                                    <ChevronRight className="size-4 opacity-50" />
                                </Link>
                            </Button>
                        </div>

                        <div className="space-y-6 md:col-span-3 md:space-y-10">
                            <div>
                                <div className="flex items-center gap-2">
                                    <Target className="size-5" />
                                    <h3 className="text-foreground text-lg font-semibold">AI that drafts the page, you keep control</h3>
                                </div>
                                <p className="text-muted-foreground mt-3 text-balance">Describe the outcome and Suplex sketches the layout with the right data hooks. You decide what ships, with no template lock-in.</p>
                            </div>

                            <div>
                                <div className="flex items-center gap-2">
                                    <CalendarCheck className="size-5" />
                                    <h3 className="text-foreground text-lg font-semibold">Data-aware content that stays accurate</h3>
                                </div>
                                <p className="text-muted-foreground mt-3 text-balance">Use data mentions to pull live values, roll out updates once, and keep every page in sync without manual edits.</p>
                            </div>
                        </div>
                    </div>

                    <div className="relative -mx-12 mt-16 px-12">
                        <div className="bg-background rounded-(--radius) relative mx-auto w-full overflow-hidden border border-transparent shadow-lg shadow-black/10 ring-1 ring-black/10">
                            <div className="relative aspect-video w-full overflow-hidden">
                                <video
                                    src="/videos/report-generator.mp4"
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
        </section>
    )
}
