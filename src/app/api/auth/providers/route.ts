import { googleConfig } from "@/lib/google";

export async function GET() {
  return Response.json({ google: Boolean(googleConfig()), salesContact: process.env.SALES_CONTACT || "" });
}
