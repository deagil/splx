"use client"

import * as React from "react"
import Link from "next/link"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import type { User } from "@supabase/supabase-js"
import { signOut } from "@/app/(app)/actions"

import { useIsMobile } from "@/hooks/use-mobile"
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu"

type MenuOption = {
  title: string
  href: string
  description: string
  disabled?: boolean
}

const devOptions: MenuOption[] = [
  {
    title: "Config",
    href: "/build/config",
    description: "View and manage workspace configuration tables",
  },
]

const buildOptions: MenuOption[] = [
  {
    title: "Pages",
    href: "/pages",
    description: "Create and manage UI views for your workspace",
  },
    {
    title: "Page Links",
    href: "/build/page-links",
    description: "Coming soon - Manage navigation options",
    disabled: true,
  },
  {
    title: "Workflows",
    href: "/build/workflows",
    description: "Coming soon - Automate processes and workflows",
    disabled: true,
  },
  // TODO: fold menus into page links
  // {
  //   title: "Menus",
  //   href: "/build/menus",
  //   description: "Coming soon - Create custom navigation menus",
  //   disabled: true,
  // },
]

const dataOptions: MenuOption[] = [
  {
    title: "Tables",
    href: "/build/data",
    description: "Browse and manage your workspace data tables",
  },
  {
    title: "Reports",
    href: "/data/reports",
    description: "View and create AI-assisted data reports",
  },
]

export function NavigationMenuDemo() {
  const isMobile = useIsMobile()
  const [user, setUser] = useState<User | null>(null)

  // Check if we're in local mode to show Dev menu
  const isLocalMode = process.env.NEXT_PUBLIC_APP_MODE === 'local'

  useEffect(() => {
    const supabase = createClient()

    // Get initial user
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const handleLogout = async () => {
    await signOut()
  }

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
                    className="from-muted/50 to-muted flex h-full w-full flex-col justify-end rounded-md bg-linear-to-b p-4 no-underline outline-hidden transition-all duration-200 select-none focus:shadow-md md:p-6"
                    href="/whats-new"
                  >
                    <div className="mb-2 text-lg font-medium sm:mt-4">
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
                  type="button"
                  onClick={handleLogout}
                  className="block w-full select-none rounded-sm px-3 py-2 text-left transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  <div className="text-sm leading-none font-medium">Sign Out</div>
                  <p className="text-muted-foreground line-clamp-2 text-sm leading-snug">
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
              <ul className="grid w-[300px] gap-2 p-4">
                {devOptions.map((option) => (
                  <ListItem
                    key={option.title}
                    title={option.title}
                    href={option.href}
                    disabled={option.disabled}
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
            <ul className="grid w-[300px] gap-2 p-4">
              {dataOptions.map((option) => (
                <ListItem
                  key={option.title}
                  title={option.title}
                  href={option.href}
                  disabled={option.disabled}
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
            <ul className="grid w-[300px] gap-2 p-4">
              {buildOptions.map((option) => (
                <ListItem
                  key={option.title}
                  title={option.title}
                  href={option.href}
                  disabled={option.disabled}
                >
                  {option.description}
                </ListItem>
              ))}
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  )
}

function ListItem({
  title,
  children,
  href,
  disabled,
  ...props
}: React.ComponentPropsWithoutRef<"li"> & { href: string; disabled?: boolean }) {
  if (disabled) {
    return (
      <li {...props}>
        <div className="block select-none rounded-sm px-3 py-2 cursor-not-allowed opacity-50">
          <div className="text-sm leading-none font-medium">{title}</div>
          <p className="text-muted-foreground line-clamp-2 text-sm leading-snug">
            {children}
          </p>
        </div>
      </li>
    )
  }

  return (
    <li {...props}>
      <NavigationMenuLink asChild>
        <Link href={href} className="block select-none rounded-sm px-3 py-2 transition-colors hover:bg-accent hover:text-accent-foreground">
          <div className="text-sm leading-none font-medium">{title}</div>
          <p className="text-muted-foreground line-clamp-2 text-sm leading-snug">
            {children}
          </p>
        </Link>
      </NavigationMenuLink>
    </li>
  )
}

export default NavigationMenuDemo
