import { GET as v1Get } from "@/app/api/v1/data/[tableName]/schema/route";
import { delegateToV1 } from "@/server/api/legacy";

/** Legacy path — delegates to `/api/v1/data/[tableName]/schema`. */
export const GET = delegateToV1(v1Get);
