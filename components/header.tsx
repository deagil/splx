"use client";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import React from "react";
import { LogoIcon } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const menuItems = [
  { href: "#features", name: "Features" },
  { href: "/whats-new", name: "What's New" },
  { href: "#pricing", name: "Pricing" },
  { href: "#faq", name: "FAQs" },
];

export const HeroHeader = () => {
  const [menuState, setMenuState] = React.useState(false);
  const [isScrolled, setIsScrolled] = React.useState(false);

  React.useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);
  return (
    <header>
      <nav
        className={cn(
          "fixed z-20 w-full transition-all duration-300",
          isScrolled &&
            "border-black/5 border-b bg-background/75 backdrop-blur-lg"
        )}
        data-state={menuState && "active"}
      >
        <div className="mx-auto max-w-5xl px-6">
          <div
            className={cn(
              "relative flex flex-wrap items-center justify-between gap-6 py-6 transition-all duration-200 lg:gap-0",
              isScrolled && "py-3"
            )}
          >
            <div className="flex w-full justify-between gap-6 lg:w-auto">
              <Link
                aria-label="home"
                className="flex items-center space-x-2"
                href="/"
              >
                <LogoIcon />
              </Link>

              <button
                aria-label={menuState === true ? "Close Menu" : "Open Menu"}
                className="relative z-20 -m-2.5 -mr-4 block cursor-pointer p-2.5 lg:hidden"
                onClick={() => setMenuState(!menuState)}
              >
                <Menu className="m-auto size-6 in-data-[state=active]:rotate-180 in-data-[state=active]:scale-0 in-data-[state=active]:opacity-0 duration-200" />
                <X className="absolute inset-0 m-auto size-6 -rotate-180 in-data-[state=active]:rotate-0 in-data-[state=active]:scale-100 scale-0 in-data-[state=active]:opacity-100 opacity-0 duration-200" />
              </button>

              <div className="m-auto hidden size-fit lg:block">
                <ul className="flex gap-1">
                  {menuItems.map((item, index) => (
                    <li key={index}>
                      <Button asChild size="sm" variant="ghost">
                        <Link className="text-base" href={item.href}>
                          <span>{item.name}</span>
                        </Link>
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="mb-6 in-data-[state=active]:block hidden w-full flex-wrap items-center justify-end space-y-8 rounded-3xl border bg-background p-6 shadow-2xl shadow-zinc-300/20 md:flex-nowrap lg:m-0 lg:flex lg:in-data-[state=active]:flex lg:w-fit lg:gap-6 lg:space-y-0 lg:border-transparent lg:bg-transparent lg:p-0 lg:shadow-none dark:shadow-none dark:lg:bg-transparent">
              <div className="lg:hidden">
                <ul className="space-y-6 text-base">
                  {menuItems.map((item, index) => (
                    <li key={index}>
                      <Link
                        className="block text-muted-foreground duration-150 hover:text-accent-foreground"
                        href={item.href}
                      >
                        <span>{item.name}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex w-full flex-col space-y-3 sm:flex-row sm:gap-3 sm:space-y-0 md:w-fit">
                <Button
                  asChild
                  className={cn(isScrolled && "lg:hidden")}
                  size="sm"
                  variant="ghost"
                >
                  <Link href="/signin">
                    <span>Log in</span>
                  </Link>
                </Button>
                <Button
                  asChild
                  className={cn(isScrolled && "lg:hidden")}
                  size="sm"
                >
                  <Link href="/signin">
                    <span>Sign up</span>
                  </Link>
                </Button>
                <Button
                  asChild
                  className={cn(isScrolled ? "lg:inline-flex" : "hidden")}
                  size="sm"
                >
                  <Link href="/signin">
                    <span>Get started</span>
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
};
