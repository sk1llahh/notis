import type { NextAuthConfig } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/server/db";
import { env } from "@/shared/config";
import type { UserRole } from "./session";

const credentialsSchema = z.object({
  email: z.string().email("Неверный формат email"),
  password: z.string().min(1, "Пароль обязателен"),
});

export const authConfig: NextAuthConfig = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
  },
  secret: env.AUTH_SECRET,
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Пароль", type: "password" },
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) {
          return null;
        }

        const { email, password } = parsed.data;
        const normalizedEmail = email.toLowerCase().trim();

        // 1. Find user by email
        const user = await prisma.user.findUnique({
          where: { email: normalizedEmail },
        });

        // 2. Reject if user does not exist or password hash is absent
        if (!user || !user.passwordHash) {
          return null;
        }

        // 3. Reject if user is banned
        if (user.isBanned) {
          console.warn(`[AUTH] Login blocked: user is banned (${normalizedEmail})`);
          return null;
        }

        // 4. Validate password
        const isMatch = await bcrypt.compare(password, user.passwordHash);
        if (!isMatch) {
          return null;
        }

        const role: UserRole =
          user.role === "ADMIN"
            ? "ADMIN"
            : user.role === "AUTHOR"
            ? "AUTHOR"
            : "STUDENT";

        return {
          id: user.id,
          email: user.email,
          name: user.name ?? user.email.split("@")[0],
          image: user.image ?? user.avatarUrl ?? null,
          role,
        };
      },
    }),
    ...(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET
      ? [
          GitHub({
            clientId: env.GITHUB_CLIENT_ID,
            clientSecret: env.GITHUB_CLIENT_SECRET,
          }),
        ]
      : []),
    ...(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
      ? [
          Google({
            clientId: env.GOOGLE_CLIENT_ID,
            clientSecret: env.GOOGLE_CLIENT_SECRET,
          }),
        ]
      : []),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: UserRole }).role ?? "STUDENT";
      }

      if (trigger === "update" && session) {
        if (session.role) {
          token.role = session.role as UserRole;
        }
        if (session.name) {
          token.name = session.name;
        }
      }

      // Fresh role & ban status check from database
      const userId = (token.id ?? token.sub) as string | undefined;
      if (userId) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: userId },
            select: { role: true, isBanned: true, deletedAt: true },
          });

          if (dbUser) {
            if (dbUser.isBanned || dbUser.deletedAt) {
              return null;
            }
            token.role =
              dbUser.role === "ADMIN"
                ? "ADMIN"
                : dbUser.role === "AUTHOR"
                ? "AUTHOR"
                : "STUDENT";
          }
        } catch {
          // Fallback if DB query fails in disconnected test environments
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        const userId = (token.id ?? token.sub) as string | undefined;
        if (userId) {
          session.user.id = userId;
        }
        if (token.role) {
          (session.user as { role?: UserRole }).role = token.role as UserRole;
        }
      }
      return session;
    },
  },
};
