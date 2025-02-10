import { NextRequest, NextResponse } from "next/server";

export const config = {
  matcher: [
    /*
     * Match all paths except static files and api routes
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
    "/api/:path*",
  ],
};

export function middleware(req: NextRequest) {
  try {
    const basicAuth = req.headers.get("authorization");

    if (!basicAuth) {
      return unauthorized();
    }

    const auth = basicAuth.split(" ")[1];
    if (!auth) {
      return unauthorized();
    }

    const [user, pwd] = atob(auth).split(":");
    if (!user || !pwd) {
      return unauthorized();
    }

    const envUser = process.env.BASIC_AUTH_USER;
    const envPwd = process.env.BASIC_AUTH_PWD;
    if (user === envUser && pwd === envPwd) {
      return NextResponse.next();
    }

    return unauthorized();
  } catch (e) {
    console.error("Auth error:", e);
    return unauthorized();
  }
}

function unauthorized() {
  return new NextResponse("Authentication Required", {
    status: 401,
    headers: new Headers({
      "WWW-Authenticate": 'Basic realm="Secure Area"',
      "Content-Type": "text/plain",
    }),
  });
}
