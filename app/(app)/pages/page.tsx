import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AppLoader } from "@/components/shared/app-loader";
import { listPages } from "@/lib/server/pages";
import { resolveTenantContext } from "@/lib/server/tenant/context";
import { hasCapability } from "@/lib/server/tenant/permissions";

export const metadata: Metadata = {
  description: "Workspace pages configured via the dynamic pages builder.",
  title: "Pages",
};

async function PagesList() {
  const tenant = await resolveTenantContext();
  if (!hasCapability(tenant, "pages.view")) {
    notFound();
  }

  const pages = await listPages(tenant);

  return (
    <div className="rounded-lg border border-border/70 bg-background p-6 shadow-sm">
      {pages.length === 0 ? (
        <div className="text-muted-foreground text-sm">
          No pages exist yet. Use the builder to create your first page.
        </div>
      ) : (
        <ul className="divide-y divide-border/60">
          {pages.map((page) => (
            <li className="py-3 first:pt-0 last:pb-0" key={page.id}>
              <Link
                className="group flex flex-col gap-1 rounded-md px-2 py-1 transition hover:bg-muted/40"
                href={`/pages/${page.id}`}
              >
                <span className="font-medium text-foreground text-sm group-hover:text-primary">
                  {page.name}
                </span>
                <span className="text-muted-foreground text-xs">
                  /pages/{page.id}
                </span>
                {page.description ? (
                  <span className="text-muted-foreground text-xs">
                    {page.description}
                  </span>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function PagesIndex() {
  return (
    <div className="flex flex-1 flex-col gap-6 py-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-semibold text-3xl text-foreground tracking-tight">
            Pages
          </h1>
          <p className="text-muted-foreground text-sm">
            Manage dynamic application pages built with the layout builder.
          </p>
        </div>
      </div>

      <Suspense fallback={<AppLoader label="Loading pages" />}>
        <PagesList />
      </Suspense>
    </div>
  );
}
