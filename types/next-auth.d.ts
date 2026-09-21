import type { DefaultSession } from "next-auth";

import type { AppRole } from "@/lib/auth/roles";

type RefreshError = "RefreshAccessTokenError";

declare module "next-auth" {
  interface Session {
    user: {
      oid?: string;
      upn?: string;
      access_token?: string;
      roles: AppRole[];
    } & DefaultSession["user"];
    error?: RefreshError;
  }

  interface Profile {
    oid?: string;
    roles?: unknown;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    oid?: string;
    access_token?: string;
    expires_at?: number;
    upn?: string;
    version?: string;
    roles?: AppRole[];
    error?: RefreshError;
  }
}
