import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

const POS_PATH = "/pos";
const KDS_PATH = "/kds";
const ADMIN_PATH = "/admin";
const HISTORY_PATH = "/history";

export default withAuth(
  (req) => {
    const role = req.nextauth.token?.role;
    const path = req.nextUrl.pathname;

    if (path.startsWith(POS_PATH) && !["ADMIN", "MANAGER", "CASHIER"].includes(String(role))) {
      return NextResponse.redirect(new URL("/forbidden", req.url));
    }

    if (path.startsWith(KDS_PATH) && !["ADMIN", "MANAGER", "BARISTA"].includes(String(role))) {
      return NextResponse.redirect(new URL("/forbidden", req.url));
    }

    if (path.startsWith(ADMIN_PATH) && !["ADMIN", "MANAGER"].includes(String(role))) {
      return NextResponse.redirect(new URL("/forbidden", req.url));
    }

    if (path.startsWith(HISTORY_PATH) && !["ADMIN", "MANAGER", "CASHIER"].includes(String(role))) {
      return NextResponse.redirect(new URL("/forbidden", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => Boolean(token),
    },
  },
);

export const config = {
  matcher: ["/pos/:path*", "/kds/:path*", "/admin/:path*", "/history/:path*"],
};
