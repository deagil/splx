import { POST as v1Post, PUT as v1Put } from "@/app/api/v1/pages/[pageId]/save/route";
import { delegateToV1 } from "@/server/api/legacy";

/** Legacy path — delegates to `/api/v1/pages/[pageId]/save`. */
export const PUT = delegateToV1(v1Put);
export const POST = delegateToV1(v1Post);
