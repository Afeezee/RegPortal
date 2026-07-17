import type { DefaultSession } from "next-auth";

import type { AppRole } from "@/lib/types";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      role: AppRole;
      loginId: string;
      matricNumber?: string;
      currentLevel?: number;
    };
  }

  interface User {
    role: AppRole;
    loginId: string;
    matricNumber?: string | null;
    currentLevel?: number | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: AppRole;
    loginId?: string;
    matricNumber?: string;
    currentLevel?: number;
  }
}
