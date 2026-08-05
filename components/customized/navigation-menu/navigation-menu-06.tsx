"use client";

import {
  CreditCardIcon,
  Loader,
  type LucideIcon,
  SquareCheckIcon,
  SquareChevronUpIcon,
  SquarePowerIcon,
  ToggleRight,
} from "lucide-react";
import Link from "next/link";
import type * as React from "react";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import { cn } from "@/lib/utils";

const components: {
  title: string;
  href: string;
  description: string;
  icon: LucideIcon;
}[] = [
  {
    description:
      "A vertically stacked set of interactive headings that each reveal a section of content.",
    href: "/components/accordion",
    icon: SquareChevronUpIcon,
    title: "Accordion",
  },
  {
    description: "Displays a button or a component that looks like a button.",
    href: "/components/button",
    icon: SquarePowerIcon,
    title: "Button",
  },
  {
    description: "Displays a card with header, content, and footer.",
    href: "/components/card",
    icon: CreditCardIcon,
    title: "Card",
  },
  {
    description:
      "A control that allows the user to toggle between checked and not checked.",
    href: "/components/checkbox",
    icon: SquareCheckIcon,
    title: "Checkbox",
  },
  {
    description: "Informs users about the status of ongoing processes.",
    href: "/components/spinner",
    icon: Loader,
    title: "Spinner",
  },
  {
    description:
      "A control that allows the user to toggle between checked and not checked.",
    href: "/components/switch",
    icon: ToggleRight,
    title: "Switch",
  },
];

export default function RichNavigationMenu() {
  return (
    <NavigationMenu className="z-20">
      <NavigationMenuList>
        <NavigationMenuItem>
          <NavigationMenuTrigger>Products</NavigationMenuTrigger>
          <NavigationMenuContent className="px-0 py-1">
            <div className="grid w-[900px] grid-cols-3 gap-3 divide-x p-4">
              <div className="col-span-2">
                <h6 className="pl-2.5 font-semibold text-muted-foreground text-sm uppercase">
                  Capabilities
                </h6>
                <ul className="mt-2.5 grid grid-cols-2 gap-3">
                  {components.map((component) => (
                    <ListItem
                      href={component.href}
                      icon={component.icon}
                      key={component.title}
                      title={component.title}
                    >
                      {component.description}
                    </ListItem>
                  ))}
                </ul>
              </div>

              <div className="pl-4">
                <h6 className="pl-2.5 font-semibold text-muted-foreground text-sm uppercase">
                  Product & Features
                </h6>
                <ul className="mt-2.5 grid gap-3">
                  {components.slice(0, 3).map((component) => (
                    <ListItem
                      href={component.href}
                      icon={component.icon}
                      key={component.title}
                      title={component.title}
                    >
                      {component.description}
                    </ListItem>
                  ))}
                </ul>
              </div>
            </div>
          </NavigationMenuContent>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <NavigationMenuTrigger>Solutions</NavigationMenuTrigger>
          <NavigationMenuContent className="p-4">
            <h6 className="pl-2.5 font-semibold text-muted-foreground text-sm uppercase">
              Solutions
            </h6>
            <ul className="mt-2.5 grid w-[400px] gap-3 md:w-[500px] md:grid-cols-2 lg:w-[600px]">
              {components.map((component) => (
                <ListItem
                  href={component.href}
                  icon={component.icon}
                  key={component.title}
                  title={component.title}
                >
                  {component.description}
                </ListItem>
              ))}
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <NavigationMenuLink asChild className={navigationMenuTriggerStyle()}>
            <Link href="/docs">Developers</Link>
          </NavigationMenuLink>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <NavigationMenuTrigger>Products</NavigationMenuTrigger>
          <NavigationMenuContent className="px-0 py-1">
            <div className="grid w-[900px] grid-cols-3 gap-3 divide-x p-4">
              <div className="col-span-2">
                <h6 className="pl-2.5 font-semibold text-muted-foreground text-sm uppercase">
                  Capabilities
                </h6>
                <ul className="mt-2.5 grid grid-cols-2 gap-3">
                  {components.map((component) => (
                    <ListItem
                      href={component.href}
                      icon={component.icon}
                      key={component.title}
                      title={component.title}
                    >
                      {component.description}
                    </ListItem>
                  ))}
                </ul>
              </div>

              <div className="pl-4">
                <h6 className="pl-2.5 font-semibold text-muted-foreground text-sm uppercase">
                  Product & Features
                </h6>
                <ul className="mt-2.5 grid gap-3">
                  {components.slice(0, 3).map((component) => (
                    <ListItem
                      href={component.href}
                      icon={component.icon}
                      key={component.title}
                      title={component.title}
                    >
                      {component.description}
                    </ListItem>
                  ))}
                </ul>
              </div>
            </div>
          </NavigationMenuContent>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <NavigationMenuTrigger>Solutions</NavigationMenuTrigger>
          <NavigationMenuContent className="p-4">
            <h6 className="pl-2.5 font-semibold text-muted-foreground text-sm uppercase">
              Solutions
            </h6>
            <ul className="mt-2.5 grid w-[400px] gap-3 md:w-[500px] md:grid-cols-2 lg:w-[600px]">
              {components.map((component) => (
                <ListItem
                  href={component.href}
                  icon={component.icon}
                  key={component.title}
                  title={component.title}
                >
                  {component.description}
                </ListItem>
              ))}
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <NavigationMenuLink asChild className={navigationMenuTriggerStyle()}>
            <Link href="/docs">Developers</Link>
          </NavigationMenuLink>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  );
}

const ListItem = ({
  className,
  title,
  children,
  icon: Icon,
  href,
  ref,
  ...props
}: React.ComponentPropsWithoutRef<typeof Link> & { icon: LucideIcon } & {
  ref?: React.RefObject<React.ElementRef<typeof Link> | null>;
}) => (
  <li>
    <NavigationMenuLink asChild>
      <Link
        className={cn(
          "block select-none rounded-md p-3 leading-none no-underline outline-hidden transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
          className
        )}
        href={href}
        ref={ref}
        {...props}
      >
        <div className="flex items-center gap-2 font-semibold leading-none tracking-tight">
          <Icon className="h-5 w-5" />
          {title}
        </div>
        <p className="mt-2 line-clamp-2 text-muted-foreground text-sm leading-snug">
          {children}
        </p>
      </Link>
    </NavigationMenuLink>
  </li>
);
ListItem.displayName = "ListItem";
