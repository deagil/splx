import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageScreen } from "@/components/pages/page-screen";
import { getPageById } from "@/lib/server/pages";
import { resolveTenantContext } from "@/lib/server/tenant/context";
import { hasCapability } from "@/lib/server/tenant/permissions";

interface PageRouteParams {
  pageId: string;
}

type PageRouteSearchParams = Record<string, string | string[] | undefined>;

interface PageRouteProps {
  params: PageRouteParams | Promise<PageRouteParams>;
  searchParams: PageRouteSearchParams | Promise<PageRouteSearchParams>;
}

export default async function WorkspacePage({
  params,
  searchParams,
}: PageRouteProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const { pageId } = resolvedParams;
  const tenant = await resolveTenantContext();
  if (process.env.NODE_ENV !== "production") {
    console.info("[pages] resolved tenant", {
      pageId,
      roles: tenant.roles,
      userId: tenant.userId,
      workspaceId: tenant.workspaceId,
    });
  }
  if (!hasCapability(tenant, "pages.view")) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[pages] missing pages.view capability", {
        pageId,
        roles: tenant.roles,
      });
    }
    notFound();
  }
  const page = await getPageById(tenant, pageId);

  if (!page) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[pages] page not found", {
        pageId,
        workspaceId: tenant.workspaceId,
      });
    }
    notFound();
  }

  const viewMode = resolveViewMode(resolvedSearchParams.viewMode);
  const urlParams = extractUrlParams(resolvedSearchParams);
  const canEdit = hasCapability(tenant, "pages.edit");
  const effectiveMode = canEdit ? viewMode : "read";

  if (process.env.NODE_ENV !== "production") {
    console.info("[pages] rendering page", {
      canEdit,
      mode: effectiveMode,
      pageId,
      urlParams,
    });
  }

  return (
    <PageScreen
      canEdit={canEdit}
      page={page}
      urlParams={urlParams}
      viewMode={effectiveMode}
    />
  );
}

export async function generateMetadata({
  params,
}: {
  params: PageRouteParams | Promise<PageRouteParams>;
}): Promise<Metadata> {
  try {
    const tenant = await resolveTenantContext();
    const resolvedParams = await params;
    if (!hasCapability(tenant, "pages.view")) {
      return {
        title: "Pages",
      };
    }
    const page = await getPageById(tenant, resolvedParams.pageId);

    if (!page) {
      return {
        title: "Page not found",
      };
    }

    return {
      description: page.description ?? undefined,
      title: `${page.name} · Pages`,
    };
  } catch {
    return {
      title: "Pages",
    };
  }
}

function resolveViewMode(
  rawMode: string | string[] | undefined
): "read" | "edit" {
  if (Array.isArray(rawMode)) {
    return resolveViewMode(rawMode.at(-1));
  }

  return rawMode === "edit" ? "edit" : "read";
}

function extractUrlParams(
  searchParams: Record<string, string | string[] | undefined>
): Record<string, string> {
  const params: Record<string, string> = {};

  for (const [key, value] of Object.entries(searchParams)) {
    if (key === "viewMode") {
      continue;
    }

    if (typeof value === "string") {
      params[key] = value;
    } else if (Array.isArray(value) && value.length > 0) {
      const lastValue = value.at(-1);
      if (typeof lastValue === "string") {
        params[key] = lastValue;
      }
    }
  }

  return params;
}
