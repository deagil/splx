import {
  DELETE as v1Delete,
  GET as v1Get,
  PATCH as v1Patch,
  POST as v1Post,
} from "@/app/api/v1/data/[tableName]/route";
import { delegateToV1 } from "@/server/api/legacy";

/**
 * Legacy row CRUD — delegates to `/api/v1/data/[tableName]`.
 *
 * The hand-rolled SQL that used to live here is gone; see
 * `server/repositories/data.ts` for what replaced it and why (it had a live SQL
 * injection in POST and PATCH).
 *
 * This shim exists because the page-block generator writes
 * `/api/data/${tableConfig.id}` into saved page configs
 * (`lib/server/tables/pages/templates.ts`), so those URLs are persisted in the
 * `pages` table and cannot be changed by editing code alone. Delete it once
 * saved configs point at `/api/v1/`.
 */

export const GET = delegateToV1(v1Get);
export const POST = delegateToV1(v1Post);
export const PATCH = delegateToV1(v1Patch);
export const DELETE = delegateToV1(v1Delete);
