import { NextResponse, type NextRequest } from "next/server";
import { isAuthorized } from "./lib/admin-auth";

export function proxy(request: NextRequest) {
  if (!process.env.ADMIN_PASSWORD) {
    return new NextResponse(
      "The leads dashboard is locked: set ADMIN_PASSWORD in the Vercel project settings.",
      { status: 503 },
    );
  }
  if (isAuthorized(request.headers.get("authorization"))) {
    return NextResponse.next();
  }
  return new NextResponse("Sign in required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="SK Home Solutions leads"' },
  });
}

export const config = {
  matcher: ["/leads", "/leads/:path*", "/api/leads/export"],
};
