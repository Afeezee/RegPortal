import bcrypt from "bcryptjs";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";

import { env } from "@/lib/env";
import { getUserByLoginId } from "@/lib/auth/user-store";
import type { AppRole } from "@/lib/types";

const credentialsSchema = z.object({
  loginId: z.string().min(3, "Enter your matric number or assigned login ID."),
  password: z.string().min(6, "Password must be at least 6 characters."),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: env.NEXTAUTH_SECRET ?? "regportal-dev-secret-change-me",
  trustHost: true,
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  providers: [
    Credentials({
      credentials: {
        loginId: { label: "Matric Number or Staff Login", type: "text" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (rawCredentials) => {
        const parsedCredentials = credentialsSchema.safeParse(rawCredentials);

        if (!parsedCredentials.success) {
          return null;
        }

        const { loginId, password } = parsedCredentials.data;
        const user = await getUserByLoginId(loginId);

        if (!user) {
          return null;
        }

        const passwordMatches = user.passwordHash
          ? await bcrypt.compare(password, user.passwordHash)
          : user.demoPassword === password;

        if (!passwordMatches) {
          return null;
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          accountStatus: user.accountStatus,
          loginId: user.loginId,
          matricNumber: user.matricNumber,
          currentLevel: user.currentLevel,
        };
      },
    }),
  ],
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) {
        token.role = user.role as AppRole;
        token.accountStatus = user.accountStatus as "pending" | "active" | "suspended";
        token.loginId = user.loginId as string;
        token.matricNumber = user.matricNumber as string | undefined;
        token.currentLevel = user.currentLevel as number | undefined;
      }

      return token;
    },
    session: async ({ session, token }) => {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.role = token.role as AppRole;
        session.user.accountStatus = token.accountStatus as "pending" | "active" | "suspended";
        session.user.loginId = token.loginId as string;
        session.user.matricNumber = token.matricNumber as string | undefined;
        session.user.currentLevel = token.currentLevel as number | undefined;
      }

      return session;
    },
    authorized: async ({ auth: activeSession, request }) => {
      const pathname = request.nextUrl.pathname;
      const isAuthPage = pathname.startsWith("/login");
      const isSignupPage = pathname.startsWith("/signup");
      const isPendingPage = pathname.startsWith("/pending-verification");
      const isProtectedPortal =
        pathname.startsWith("/student") ||
        pathname.startsWith("/adviser") ||
        pathname.startsWith("/admin");

      if ((isAuthPage || isSignupPage) && activeSession?.user) {
        if (activeSession.user.accountStatus === "pending") {
          return Response.redirect(new URL("/pending-verification", request.nextUrl));
        }
        return Response.redirect(new URL(`/${activeSession.user.role}`, request.nextUrl));
      }

      if (isPendingPage && !activeSession?.user) {
        return Response.redirect(new URL("/login", request.nextUrl));
      }

      if (isPendingPage && activeSession?.user && activeSession.user.accountStatus !== "pending") {
        return Response.redirect(new URL(`/${activeSession.user.role}`, request.nextUrl));
      }

      if (isProtectedPortal && !activeSession?.user) {
        return false;
      }

      if (isProtectedPortal && activeSession?.user?.accountStatus !== "active") {
        return Response.redirect(new URL("/pending-verification", request.nextUrl));
      }

      return true;
    },
  },
});
