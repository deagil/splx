import {
  ArrowUp,
  CalendarCheck,
  Globe,
  Play,
  Plus,
  Signature,
  Sparkles,
  Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const MESCHAC_AVATAR = "https://avatars.githubusercontent.com/u/47919550?v=4";
const BERNARD_AVATAR = "https://avatars.githubusercontent.com/u/31113941?v=4";
const THEO_AVATAR = "https://avatars.githubusercontent.com/u/68236786?v=4";
const GLODIE_AVATAR = "https://avatars.githubusercontent.com/u/99137927?v=4";

export default function FeaturesSection() {
  return (
    <section>
      <div className="py-24">
        <div className="mx-auto w-full max-w-5xl px-6">
          <div>
            <h2 className="max-w-2xl text-balance font-semibold text-4xl text-foreground">
              Built for founders and lean teams who need to move
            </h2>
          </div>
          <div className="mt-16 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card className="overflow-hidden p-6">
              <Target className="size-5 text-primary" />
              <h3 className="mt-5 font-semibold text-foreground text-lg">
                Publish pages without backend thrash
              </h3>
              <p className="mt-3 text-balance text-muted-foreground">
                Model your data once, drag blocks into place, and ship pages
                that stay connected to live values.
              </p>

              <MeetingIllustration />
            </Card>

            <Card className="group overflow-hidden px-6 pt-6">
              <CalendarCheck className="size-5 text-primary" />
              <h3 className="mt-5 font-semibold text-foreground text-lg">
                AI-guided edits with guardrails
              </h3>
              <p className="mt-3 text-balance text-muted-foreground">
                Ask Suplex to draft copy, tweak layouts, or wire data sources -
                review before anything goes live.
              </p>

              <CodeReviewIllustration />
            </Card>
            <Card className="group overflow-hidden px-6 pt-6">
              <Sparkles className="size-5 text-primary" />
              <h3 className="mt-5 font-semibold text-foreground text-lg">
                Collaboration that keeps everyone aligned
              </h3>
              <p className="mt-3 text-balance text-muted-foreground">
                Roles, approvals, and audit trails keep stakeholders synced
                without slowing down launches.
              </p>

              <div className="mask-b-from-50 -mx-2 -mt-2 px-2 pt-2">
                <AIAssistantIllustration />
              </div>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}

const MeetingIllustration = () => (
  <Card aria-hidden className="mt-9 aspect-video p-4">
    <div className="relative hidden h-fit">
      <div className="absolute bottom-1.5 -left-1.5 rounded-md border-red-700 border-t bg-red-500 px-1 py-px font-medium text-[10px] text-white shadow-md shadow-red-500/35">
        PDF
      </div>
      <div className="h-10 w-8 rounded-md border bg-gradient-to-b from-zinc-100 to-zinc-200" />
    </div>
    <div className="mb-0.5 font-semibold text-sm">Launch checklist review</div>
    <div className="mb-4 flex gap-2 text-sm">
      <span className="text-muted-foreground">Today - 25 mins</span>
    </div>
    <div className="mb-2 flex -space-x-1.5">
      <div className="flex -space-x-1.5">
        {[
          { alt: "Méschac Irung", src: MESCHAC_AVATAR },
          { alt: "Bernard Ngandu", src: BERNARD_AVATAR },
          { alt: "Théo Balick", src: THEO_AVATAR },
          { alt: "Glodie Lukose", src: GLODIE_AVATAR },
        ].map((avatar, index) => (
          <div
            className="size-7 rounded-full border bg-background p-0.5 shadow shadow-zinc-950/5"
            key={index}
          >
            <img
              alt={avatar.alt}
              className="aspect-square rounded-full object-cover"
              height="460"
              src={avatar.src}
              width="460"
            />
          </div>
        ))}
      </div>
    </div>
    <div className="font-medium text-muted-foreground text-sm">
      Content refresh requests
    </div>
  </Card>
);

const CodeReviewIllustration = () => (
  <div aria-hidden className="relative mt-6">
    <Card className="aspect-video w-4/5 translate-y-4 p-3 transition-transform duration-200 ease-in-out group-hover:-rotate-3">
      <div className="mb-3 flex items-center gap-2">
        <div className="size-6 rounded-full border bg-background p-0.5 shadow shadow-zinc-950/5">
          <img
            alt="M Irung"
            className="aspect-square rounded-full object-cover"
            height="460"
            src={MESCHAC_AVATAR}
            width="460"
          />
        </div>
        <span className="font-medium text-muted-foreground text-sm">
          Méschac Irung
        </span>

        <span className="text-muted-foreground/75 text-xs">2m</span>
      </div>

      <div className="ml-8 space-y-2">
        <div className="h-2 rounded-full bg-foreground/10" />
        <div className="h-2 w-3/5 rounded-full bg-foreground/10" />
        <div className="h-2 w-1/2 rounded-full bg-foreground/10" />
      </div>

      <Signature className="mt-3 ml-8 size-5" />
    </Card>
    <Card className="absolute -top-4 right-0 flex aspect-3/5 w-2/5 translate-y-4 p-2 transition-transform duration-200 ease-in-out group-hover:rotate-3">
      <div className="m-auto flex size-10 rounded-full bg-foreground/5">
        <Play className="m-auto size-4 fill-foreground/50 stroke-foreground/50" />
      </div>
    </Card>
  </div>
);

const AIAssistantIllustration = () => (
  <Card
    aria-hidden
    className="mt-6 aspect-video translate-y-4 p-4 pb-6 transition-transform duration-200 group-hover:translate-y-0"
  >
    <div className="w-fit">
      <Sparkles className="size-3.5 fill-purple-300 stroke-purple-300" />
      <p className="mt-2 line-clamp-2 text-sm">
        Draft a hero that references our "Pro" plan and auto-inserts current
        pricing.
      </p>
    </div>
    <div className="-mx-3 mt-3 -mb-3 space-y-3 rounded-lg bg-foreground/5 p-3">
      <div className="text-muted-foreground text-sm">Ask AI Assistant</div>

      <div className="flex justify-between">
        <div className="flex gap-2">
          <Button
            className="size-7 rounded-2xl bg-transparent shadow-none"
            size="icon"
            variant="outline"
          >
            <Plus />
          </Button>
          <Button
            className="size-7 rounded-2xl bg-transparent shadow-none"
            size="icon"
            variant="outline"
          >
            <Globe />
          </Button>
        </div>

        <Button className="size-7 rounded-2xl bg-black" size="icon">
          <ArrowUp strokeWidth={3} />
        </Button>
      </div>
    </div>
  </Card>
);
