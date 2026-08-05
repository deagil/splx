import { Check } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Pricing() {
  return (
    <section className="py-16 md:py-32">
      <div className="mx-auto max-w-5xl px-6">
        <div className="mx-auto max-w-2xl space-y-6 text-center">
          <h1 className="text-center font-semibold text-4xl lg:text-5xl">
            Pricing that Scales with You
          </h1>
          <p>
            Gemini is evolving to be more than just the models. It supports an
            entire to the APIs and platforms helping developers and businesses
            innovate.
          </p>
        </div>

        <div className="mt-8 grid gap-6 md:mt-20 md:grid-cols-5 md:gap-0">
          <div className="flex flex-col justify-between space-y-8 rounded-(--radius) border p-6 md:col-span-2 md:my-2 md:rounded-r-none md:border-r-0 lg:p-10">
            <div className="space-y-4">
              <div>
                <h2 className="font-medium">Free</h2>
                <span className="my-3 block font-semibold text-2xl">
                  $0 / mo
                </span>
                <p className="text-muted-foreground text-sm">Per editor</p>
              </div>

              <Button asChild className="w-full" variant="outline">
                <Link href="">Get Started</Link>
              </Button>

              <hr className="border-dashed" />

              <ul className="list-outside space-y-3 text-sm">
                {[
                  "Basic Analytics Dashboard",
                  "5GB Cloud Storage",
                  "Email and Chat Support",
                ].map((item, index) => (
                  <li className="flex items-center gap-2" key={index}>
                    <Check className="size-3" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="rounded-(--radius) border p-6 shadow-gray-950/5 shadow-lg md:col-span-3 lg:p-10 dark:bg-muted dark:[--color-muted:var(--color-zinc-900)]">
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-4">
                <div>
                  <h2 className="font-medium">Pro</h2>
                  <span className="my-3 block font-semibold text-2xl">
                    $19 / mo
                  </span>
                  <p className="text-muted-foreground text-sm">Per editor</p>
                </div>

                <Button asChild className="w-full">
                  <Link href="">Get Started</Link>
                </Button>
              </div>

              <div>
                <div className="font-medium text-sm">
                  Everything in free plus :
                </div>

                <ul className="mt-4 list-outside space-y-3 text-sm">
                  {[
                    "Everything in Free Plan",
                    "5GB Cloud Storage",
                    "Email and Chat Support",
                    "Access to Community Forum",
                    "Single User Access",
                    "Access to Basic Templates",
                    "Mobile App Access",
                    "1 Custom Report Per Month",
                    "Monthly Product Updates",
                    "Standard Security Features",
                  ].map((item, index) => (
                    <li className="flex items-center gap-2" key={index}>
                      <Check className="size-3" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
