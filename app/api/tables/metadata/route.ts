import { GET as v1Get } from "@/app/api/v1/tables/metadata/route";
import { delegateToV1 } from "@/server/api/legacy";

/** Legacy path — delegates to `/api/v1/tables/metadata`. */
export const GET = delegateToV1(v1Get);
