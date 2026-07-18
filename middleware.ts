import { auth } from "./auth";

export default auth;

export const config = {
  matcher: ["/student/:path*", "/adviser/:path*", "/admin/:path*", "/login", "/signup", "/pending-verification"],
};
