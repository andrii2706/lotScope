import { googleConfig } from "@/lib/server/google";
import { route } from "@/lib/server/route";

async function handleGET() {
  return Response.json({ google: Boolean(googleConfig()), salesContact: process.env.SALES_CONTACT || "" });
}

export const GET = route(handleGET);
