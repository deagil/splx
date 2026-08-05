import { POST as v1Post } from "@/app/api/v1/reports/execute/route";
import { delegateToV1 } from "@/server/api/legacy";

/** Legacy path — delegates to `/api/v1/reports/execute`. */
export const POST = delegateToV1(v1Post);
