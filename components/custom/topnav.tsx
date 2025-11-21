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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import type { User as DbUser } from "@/lib/db/schema"

const buildOptions: { title: string; href: string; description: string }[] = [
  {
    title: "Data",
    href: "/build/data",
    description: "Browse and manage your workspace data tables",
  },
  {
    title: "Config",
    href: "/build/config",
    description: "View and manage workspace configuration tables",
  },
]

export function NavigationMenuDemo() {
  const isMobile = useIsMobile()
  const [user, setUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<DbUser | null>(null)

  useEffect(() => {
    const supabase = createClient()

    // Get initial user
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)

      // Fetch user profile data
      if (user) {
        fetch('/api/profile')
          .then(res => res.json())
          .then(data => {
            if (data.profile) {
              setUserProfile(data.profile)
            }
          })
          .catch(err => {
            console.error('Failed to fetch user profile:', err)
          })
      }
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)

      // Refetch profile on auth change
      if (session?.user) {
        fetch('/api/profile')
          .then(res => res.json())
          .then(data => {
            if (data.profile) {
              setUserProfile(data.profile)
            }
          })
          .catch(err => {
            console.error('Failed to fetch user profile:', err)
          })
      } else {
        setUserProfile(null)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const handleLogout = async () => {
    await signOut()
  }

  // Get user initials from firstname and lastname
  const getUserInitials = () => {
    if (!userProfile) return "?"
    const firstInitial = userProfile.firstname?.charAt(0) ?? ""
    const lastInitial = userProfile.lastname?.charAt(0) ?? ""
    return (firstInitial + lastInitial).toUpperCase() || "?"
  }

  // Get display name
  const getDisplayName = () => {
    if (!userProfile) return user?.email ?? "User"
    const fullName = `${userProfile.firstname ?? ""} ${userProfile.lastname ?? ""}`.trim()
    return fullName || (user?.email ?? "User")
  }

  return (
    <NavigationMenu viewport={isMobile}>
      <NavigationMenuList className="flex-wrap">
        <NavigationMenuItem>
          <NavigationMenuTrigger>Home</NavigationMenuTrigger>
          <NavigationMenuContent>
            <ul className="grid w-[280px] gap-1 p-2">
              <li>
                <NavigationMenuLink asChild>
                  <Link
                    href="/workspace-settings"
                    className="block select-none rounded-sm px-3 py-2 text-sm leading-none no-underline outline-hidden transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                  >
                    Workspace Settings
                  </Link>
                </NavigationMenuLink>
              </li>
              <li className="my-1 h-px bg-border" />
              {user ? (
                <>
                  <li className="px-3 py-3">
                    <div className="flex items-start gap-3">
                      <Avatar className="size-10">
                        {userProfile?.avatar_url && (
                          <AvatarImage src={userProfile.avatar_url} alt={getDisplayName()} />
                        )}
                        <AvatarFallback className="bg-primary/10 text-primary font-medium">
                          {getUserInitials()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{getDisplayName()}</p>
                        {user.email && (
                          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                        )}
                      </div>
                    </div>
                  </li>
                  <li className="my-1 h-px bg-border" />
                  <li>
                    <NavigationMenuLink asChild>
                      <Link
                        href="/profile"
                        className="block select-none rounded-sm px-3 py-2 text-sm leading-none no-underline outline-hidden transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                      >
                        Edit Profile
                      </Link>
                    </NavigationMenuLink>
                  </li>
                  <li>
                    <NavigationMenuLink asChild>
                      <Link
                        href="/preferences"
                        className="block select-none rounded-sm px-3 py-2 text-sm leading-none no-underline outline-hidden transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                      >
                        Preferences
                      </Link>
                    </NavigationMenuLink>
                  </li>
                  <li>
                    <NavigationMenuLink asChild>
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="block w-full select-none rounded-sm px-3 py-2 text-left text-sm leading-none no-underline outline-hidden transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                      >
                        Sign Out
                      </button>
                    </NavigationMenuLink>
                  </li>
                </>
              ) : (
                <li>
                  <NavigationMenuLink asChild>
                    <Link
                      href="/signin"
                      className="block select-none rounded-sm px-3 py-2 text-sm leading-none no-underline outline-hidden transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                    >
                      Sign In
                    </Link>
                  </NavigationMenuLink>
                </li>
              )}
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <NavigationMenuTrigger>Build</NavigationMenuTrigger>
          <NavigationMenuContent>
            <ul className="grid w-[300px] gap-2 p-4">
              {buildOptions.map((option) => (
                <ListItem
                  key={option.title}
                  title={option.title}
                  href={option.href}
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
  ...props
}: React.ComponentPropsWithoutRef<"li"> & { href: string }) {
  return (
    <li {...props}>
      <NavigationMenuLink asChild>
        <Link href={href}>
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
