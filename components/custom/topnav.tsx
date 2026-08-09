"use client";

import type { User } from "@supabase/supabase-js";
import Link from "next/link";
import type * as React from "react";
import { useEffect, useState } from "react";
import { signOut } from "@/app/(app)/actions";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";

import { useIsMobile } from "@/hooks/use-mobile";
import { createClient } from "@/lib/supabase/client";

interface MenuOption {
  description: string;
  disabled?: boolean;
  href: string;
  title: string;
}

const devOptions: MenuOption[] = [
  {
    description: "View and manage workspace configuration tables",
    href: "/build/config",
    title: "Config",
  },
  {
    description: "Manage roles, permissions, and RLS",
    href: "/build/roles",
    title: "Roles & Permissions",
  },
  {
    description: "Database changes",
    href: "/build/audit-log",
    title: "Audit Log",
  },
];

const buildOptions: MenuOption[] = [
  {
    description: "Create and manage views for your system",
    href: "/pages",
    title: "Pages",
  },
  {
    description: "Coming soon - manage navigation",
    disabled: true,
    href: "/build/page-links",
    title: "Page Links",
  },
];

const automationOptions: MenuOption[] = [
  {
    description: "Event in the system",
    href: "/automation/events",
    title: "Events",
  },
  {
    description: "Listen for events and trigger workflows",
    href: "/automation/listeners",
    title: "Listeners",
  },
  {
    description: "Multi-step processes",
    href: "/automation/workflows",
    title: "Workflows",
  },
];

const commsOptions: MenuOption[] = [
  {
    description: "Transactional email templates",
    href: "/comms/templates",
    title: "Templates",
  },
];

const dataOptions: MenuOption[] = [
  {
    description: "Browse and manage your raw data",
    href: "/build/data",
    title: "Tables",
  },
  {
    description: "Create reports and charts with AI",
    href: "/data/reports",
    title: "Reports",
  },
];

export function NavigationMenuDemo() {
  const isMobile = useIsMobile();
  const [_user, setUser] = useState<User | null>(null);

  // Check if we're in local mode to show Dev menu
  const isLocalMode = process.env.NEXT_PUBLIC_APP_MODE === "local";

  useEffect(() => {
    const supabase = createClient();

    // Get initial user
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    await signOut();
  };

  return (
    <NavigationMenu viewport={isMobile}>
      <NavigationMenuList className="flex-wrap">
        <NavigationMenuItem>
          <NavigationMenuTrigger>Home</NavigationMenuTrigger>
          <NavigationMenuContent>
            <ul className="grid gap-2 md:w-[400px] lg:w-[500px] lg:grid-cols-[.75fr_1fr]">
              <li className="row-span-3">
                <NavigationMenuLink asChild>
                  <a
                    className="flex h-full w-full select-none flex-col justify-end rounded-md bg-linear-to-b from-muted/50 to-muted p-4 no-underline outline-hidden transition-all duration-200 focus:shadow-md md:p-6"
                    href="/whats-new"
                  >
                    <div className="mb-2 font-medium text-lg sm:mt-4">
                      What's New
                    </div>
                    <p className="text-muted-foreground text-sm leading-tight">
                      See the latest updates in version 0.4
                    </p>
                  </a>
                </NavigationMenuLink>
              </li>
              <ListItem href="/workspace-settings" title="Workspace Settings">
                Manage your workspace settings and preferences
              </ListItem>
              <ListItem href="/preferences" title="Preferences">
                Manage your preferences and settings
              </ListItem>
              <li>
                <button
                  className="block w-full select-none rounded-sm px-3 py-2 text-left transition-colors hover:bg-accent hover:text-accent-foreground"
                  onClick={handleLogout}
                  type="button"
                >
                  <div className="font-medium text-sm leading-none">
                    Sign Out
                  </div>
                  <p className="line-clamp-2 text-muted-foreground text-sm leading-snug">
                    Sign out of your account
                  </p>
                </button>
              </li>
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>
        {isLocalMode && (
          <NavigationMenuItem>
            <NavigationMenuTrigger>Dev</NavigationMenuTrigger>
            <NavigationMenuContent>
              <ul className="grid w-[300px] gap-2">
                {devOptions.map((option) => (
                  <ListItem
                    disabled={option.disabled}
                    href={option.href}
                    key={option.title}
                    title={option.title}
                  >
                    {option.description}
                  </ListItem>
                ))}
              </ul>
            </NavigationMenuContent>
          </NavigationMenuItem>
        )}

        {/* data menu */}
        <NavigationMenuItem>
          <NavigationMenuTrigger>Data</NavigationMenuTrigger>
          <NavigationMenuContent>
            <ul className="grid w-[300px] gap-2">
              {dataOptions.map((option) => (
                <ListItem
                  disabled={option.disabled}
                  href={option.href}
                  key={option.title}
                  title={option.title}
                >
                  {option.description}
                </ListItem>
              ))}
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>
        {/* build menu */}
        <NavigationMenuItem>
          <NavigationMenuTrigger>Build</NavigationMenuTrigger>
          <NavigationMenuContent>
            <ul className="grid w-[300px] gap-2">
              {buildOptions.map((option) => (
                <ListItem
                  disabled={option.disabled}
                  href={option.href}
                  key={option.title}
                  title={option.title}
                >
                  {option.description}
                </ListItem>
              ))}
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>
        {/* automation menu */}
        <NavigationMenuItem>
          <NavigationMenuTrigger>Automation</NavigationMenuTrigger>
          <NavigationMenuContent>
            <ul className="grid w-[320px] gap-2">
              {automationOptions.map((option) => (
                <ListItem
                  disabled={option.disabled}
                  href={option.href}
                  key={option.title}
                  title={option.title}
                >
                  {option.description}
                </ListItem>
              ))}
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>
        {/* comms menu */}
        <NavigationMenuItem>
          <NavigationMenuTrigger>Comms</NavigationMenuTrigger>
          <NavigationMenuContent>
            <ul className="grid w-[300px] gap-2">
              {commsOptions.map((option) => (
                <ListItem
                  disabled={option.disabled}
                  href={option.href}
                  key={option.title}
                  title={option.title}
                >
                  {option.description}
                </ListItem>
              ))}
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  );
}

function ListItem({
  title,
  children,
  href,
  disabled,
  ...props
}: React.ComponentPropsWithoutRef<"li"> & {
  href: string;
  disabled?: boolean;
}) {
  if (disabled) {
    return (
      <li {...props}>
        <div className="block cursor-not-allowed select-none rounded-sm px-3 py-2 opacity-50">
          <div className="font-medium text-sm leading-none">{title}</div>
          <p className="line-clamp-2 text-muted-foreground text-sm leading-snug">
            {children}
          </p>
        </div>
      </li>
    );
  }

  return (
    <li {...props}>
      <NavigationMenuLink asChild>
        <Link
          className="block select-none rounded-sm px-3 py-2 transition-colors hover:bg-accent hover:text-accent-foreground"
          href={href}
        >
          <div className="font-medium text-sm leading-none">{title}</div>
          <p className="line-clamp-2 text-muted-foreground text-sm leading-snug">
            {children}
          </p>
        </Link>
      </NavigationMenuLink>
    </li>
  );
}

export default NavigationMenuDemo;
