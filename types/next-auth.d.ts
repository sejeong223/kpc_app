import { DefaultSession } from 'next-auth';


type TUserRole = 'User.Basic';

type UserRole = TUserRole;

declare module 'next-auth' {
  interface Session {
    user: {
      oid?: string;
      upn?: string;
      access_token?: string;
      roles?: UserRole[];
    } & DefaultSession['user'];
  }

  interface Profile {
    oid?: string;
    roles?: UserRole[];
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    oid?: string;
    access_token?: string;
    refresh_token?: string;
    expires_at?: number;
    upn?: string;
    version?: string;
    roles?: UserRole[];
  }
}
