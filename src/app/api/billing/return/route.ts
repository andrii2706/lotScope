function back(request: Request) {
  const base = (process.env.APP_URL || "").replace(/\/+$/, "") || new URL(request.url).origin;
  return Response.redirect(`${base}/billing?returned=1`, 303);
}

export const GET = back;
export const POST = back;
