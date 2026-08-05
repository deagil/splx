import { POST as v1Post } from "@/app/api/v1/tables/sync/route";
import { delegateToV1 } from "@/server/api/legacy";

/** Legacy path — delegates to `/api/v1/tables/sync`. */
export const POST = delegateToV1(v1Post);
