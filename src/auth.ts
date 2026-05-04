import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

if (process.env.NODE_ENV === "production" && !process.env.AUTH_SECRET) {
  throw new Error("AUTH_SECRET is required in production");
}

const credentialsSchema = z.object({
  nickname: z.string().min(1),
  password: z.string().min(1),
  dormCode: z.string().regex(/^\d{6}$/),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET,
  trustHost: true,
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        nickname: { label: "Имя", type: "text" },
        password: { label: "Пароль", type: "password" },
        dormCode: { label: "Код общаги", type: "text" },
      },
      authorize: async (credentials) => {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { nickname, password, dormCode } = parsed.data;

        const dorms = await prisma.dorm.findMany();
        let matchedDorm: (typeof dorms)[0] | null = null;
        for (const d of dorms) {
          const ok = await bcrypt.compare(dormCode, d.accessCodeHash);
          if (ok) {
            matchedDorm = d;
            break;
          }
        }
        if (!matchedDorm) return null;

        const user = await prisma.user.findUnique({
          where: {
            nickname_dormId: {
              nickname,
              dormId: matchedDorm.id,
            },
          },
        });
        if (!user) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          name: user.nickname,
          email: `${user.id}@local`,
          image: user.avatarUrl ?? undefined,
          dormId: user.dormId,
          dormSlug: matchedDorm.slug,
          isOwner: user.isOwner,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id!;
        token.dormId = user.dormId!;
        token.dormSlug = user.dormSlug!;
        token.isOwner = Boolean(user.isOwner);
        token.picture = user.image;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.dormId = token.dormId as string;
        session.user.dormSlug = token.dormSlug as string;
        session.user.isOwner = Boolean(token.isOwner);
        session.user.image = token.picture as string | undefined | null;
        const u = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { avatarUrl: true, nickname: true, isOwner: true },
        });
        if (u) {
          session.user.name = u.nickname;
          session.user.image = u.avatarUrl;
          session.user.isOwner = u.isOwner;
        }
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth",
  },
});
