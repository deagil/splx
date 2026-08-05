import { GET as v1Get, POST as v1Post } from "@/app/api/v1/pages/route";
import { delegateToV1 } from "@/server/api/legacy";

/** Legacy path — delegates to `/api/v1/pages`. */
export const GET = delegateToV1(v1Get);
export const POST = delegateToV1(v1Post);
