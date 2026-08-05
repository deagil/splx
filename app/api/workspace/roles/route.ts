import { GET as v1Get } from "@/app/api/v1/workspace/roles/route";
import { delegateToV1 } from "@/server/api/legacy";

/** Legacy path — delegates to `/api/v1/workspace/roles`. */
export const GET = delegateToV1(v1Get);
