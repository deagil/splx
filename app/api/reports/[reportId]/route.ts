import { GET as v1Get } from "@/app/api/v1/reports/[reportId]/route";
import { delegateToV1 } from "@/server/api/legacy";

/** Legacy path — delegates to `/api/v1/reports/[reportId]`. */
export const GET = delegateToV1(v1Get);
