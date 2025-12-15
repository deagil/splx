import { eq, desc, and, count, gte, sql as drizzleSql } from "drizzle-orm";
import { 
  chat, 
  document as documentSchema, 
  page, 
  workspaceApp,
  user as userSchema,
  type Chat,
  type Document,
  type Page,
  type User
} from "@/lib/db/schema";
import { getAppMode, resolveTenantContext } from "@/lib/server/tenant/context";
import { getResourceStore } from "@/lib/server/tenant/resource-store";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

export type DashboardStats = {
  documentsCreatedToday: number;
  chatsStartedToday: number;
};

export type ActivityItem = 
  | { type: "chat"; data: Chat }
  | { type: "document"; data: Document }
  | { type: "page"; data: Page };

export type OnboardingStatus = {
  hasConnectedApps: boolean;
  hasActivity: boolean;
};

async function getDb() {
  const mode = getAppMode();
  if (mode === "hosted") {
    const sql = postgres(process.env.POSTGRES_URL!);
    return { db: drizzle(sql), dispose: async () => await sql.end() };
  } else {
    const tenant = await resolveTenantContext();
    const store = await getResourceStore(tenant);
    return { 
      db: null, 
      store, 
      dispose: async () => await store.dispose() 
    };
  }
}

// Helper to execute query based on mode (same pattern as page.tsx but abstracted)
async function withDb<T>(callback: (db: any) => Promise<T>): Promise<T> {
  const { db, store, dispose } = await getDb();
  try {
    if (db) {
      return await callback(db);
    } else if (store) {
      return await store.withSqlClient(callback);
    }
    throw new Error("No database connection available");
  } finally {
    await dispose();
  }
}

export async function getDashboardStats(userId: string, workspaceId: string): Promise<DashboardStats> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  return await withDb(async (db) => {
    const [docs] = await db
      .select({ count: count() })
      .from(documentSchema)
      .where(
        and(
          eq(documentSchema.workspace_id, workspaceId),
          eq(documentSchema.user_id, userId),
          gte(documentSchema.created_at, startOfDay)
        )
      );

    const [chats] = await db
      .select({ count: count() })
      .from(chat)
      .where(
        and(
          eq(chat.workspace_id, workspaceId),
          eq(chat.user_id, userId),
          gte(chat.created_at, startOfDay)
        )
      );

    return {
      documentsCreatedToday: docs?.count || 0,
      chatsStartedToday: chats?.count || 0,
    };
  });
}

export async function getRecentActivity(userId: string, workspaceId: string): Promise<ActivityItem[]> {
  return await withDb(async (db) => {
    // Fetch top 5 of each type recently
    const recentChats = await db
      .select()
      .from(chat)
      .where(
        and(
          eq(chat.workspace_id, workspaceId),
          eq(chat.user_id, userId)
        )
      )
      .orderBy(desc(chat.created_at))
      .limit(5);

    const recentDocs = await db
      .select()
      .from(documentSchema)
      .where(
        and(
          eq(documentSchema.workspace_id, workspaceId),
          eq(documentSchema.user_id, userId)
        )
      )
      .orderBy(desc(documentSchema.created_at))
      .limit(5);

    const recentPages = await db
      .select()
      .from(page)
      .where(eq(page.workspace_id, workspaceId)) 
      .orderBy(desc(page.created_at))
      .limit(5);

    // Combine and sort
    const combined: ActivityItem[] = [
      ...recentChats.map((c: Chat) => ({ type: "chat" as const, data: c })),
      ...recentDocs.map((d: Document) => ({ type: "document" as const, data: d })),
      ...recentPages.map((p: Page) => ({ type: "page" as const, data: p })),
    ];

    return combined
      .sort((a, b) => {
        const dateA = new Date(a.data.created_at);
        const dateB = new Date(b.data.created_at);
        return dateB.getTime() - dateA.getTime();
      })
      .slice(0, 10);
  });
}

export async function getOnboardingStatus(workspaceId: string): Promise<OnboardingStatus> {
  return await withDb(async (db) => {
    const [appCount] = await db
      .select({ count: count() })
      .from(workspaceApp)
      .where(eq(workspaceApp.workspace_id, workspaceId));

    const [docCount] = await db
      .select({ count: count() })
      .from(documentSchema)
      .where(eq(documentSchema.workspace_id, workspaceId));
      
    const [chatCount] = await db
      .select({ count: count() })
      .from(chat)
      .where(eq(chat.workspace_id, workspaceId));

    return {
      hasConnectedApps: (appCount?.count || 0) > 0,
      hasActivity: (docCount?.count || 0) > 0 || (chatCount?.count || 0) > 0,
    };
  });
}

export async function getUserProfile(userId: string): Promise<Partial<User> | null> {
  return await withDb(async (db) => {
    const [user] = await db
      .select()
      .from(userSchema)
      .where(eq(userSchema.id, userId))
      .limit(1);
    return user || null;
  });
}
