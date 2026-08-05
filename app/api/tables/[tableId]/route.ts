import {
  DELETE as v1Delete,
  GET as v1Get,
  PATCH as v1Patch,
} from "@/app/api/v1/tables/[tableId]/route";
import { delegateToV1 } from "@/server/api/legacy";

/** Legacy path — delegates to `/api/v1/tables/[tableId]`. */
export const GET = delegateToV1(v1Get);
export const PATCH = delegateToV1(v1Patch);
export const DELETE = delegateToV1(v1Delete);
