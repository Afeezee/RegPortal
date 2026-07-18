export { auth as middleware } from "./auth";

export const config = {
  matcher: ["/student/:path*", "/adviser/:path*", "/admin/:path*", "/login", "/signup", "/pending-verification"],
};
