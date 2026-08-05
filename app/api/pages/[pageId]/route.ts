import { GET as v1Get } from "@/app/api/v1/pages/[pageId]/route";
import { delegateToV1 } from "@/server/api/legacy";

/** Legacy path — delegates to `/api/v1/pages/[pageId]`. */
export const GET = delegateToV1(v1Get);
