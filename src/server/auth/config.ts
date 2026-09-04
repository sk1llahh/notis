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

        // 1. Find user by email or authId
        let user = await prisma.user.findFirst({
          where: {
            OR: [
              { email: normalizedEmail },
              { authId: normalizedEmail },
            ],
          },
        });

        // 2. Validate password if user exists
        if (user) {
          if (user.passwordHash) {
            const isMatch = await bcrypt.compare(password, user.passwordHash);
            if (!isMatch) {
              return null;
            }
          } else {
            // Automatically set passwordHash for pre-seeded users without password
            const newHash = await bcrypt.hash(password, 10);
            await prisma.user.update({
              where: { id: user.id },
              data: { passwordHash: newHash },
            });
          }
        } else {
          // 3. Auto-provision student user in demo / local testing environment
          const newHash = await bcrypt.hash(password, 10);
          user = await prisma.user.create({
            data: {
              email: normalizedEmail,
              name: normalizedEmail.split("@")[0],
              role: "USER",
              passwordHash: newHash,
            },
          });
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
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: UserRole }).role ?? "STUDENT";
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        if (token.id) {
          session.user.id = token.id as string;
        }
        if (token.role) {
          (session.user as { role?: UserRole }).role = token.role as UserRole;
        }
      }
      return session;
    },
  },
};
