import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      dormId: string;
      dormSlug: string;
      isOwner: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    dormId?: string;
    dormSlug?: string;
    isOwner?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    dormId: string;
    dormSlug: string;
    isOwner?: boolean;
    picture?: string | null;
  }
}
