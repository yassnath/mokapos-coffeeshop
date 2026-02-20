import bcrypt from "bcryptjs";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import type { NextAuthOptions } from "next-auth";
import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";

import { prisma } from "@/lib/db";
import { env } from "@/lib/env";

const googleConfigured = Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        mode: { label: "Mode", type: "text" },
        identifier: { label: "Identifier", type: "text" },
        password: { label: "Password", type: "password" },
        pin: { label: "PIN", type: "password" },
      },
      async authorize(credentials) {
        const safeIdentifier = credentials?.identifier?.trim() ?? "";
        const fail = (reason: string) => {
          // Keep this visible in production logs (Vercel) for credential debugging.
          console.warn("[auth] credentials rejected", {
            reason,
            identifier: safeIdentifier || "(empty)",
          });
          return null;
        };

        const identifier = safeIdentifier;
        if (!identifier) return fail("missing identifier");

        const user = await prisma.user.findFirst({
          where: {
            OR: [
              { id: identifier },
              { email: { equals: identifier, mode: "insensitive" } },
              { username: { equals: identifier, mode: "insensitive" } },
            ],
            isActive: true,
          },
        });

        if (!user) return fail("user not found or inactive");

        const mode = credentials?.mode;
        if (mode === "pin") {
          const pin = credentials?.pin?.trim();
          if (!pin || !user.pinHash) return fail("pin not available");
          const validPin = await bcrypt.compare(pin, user.pinHash);
          if (!validPin) return fail("pin mismatch");
        } else {
          if (!credentials?.password || !user.passwordHash) return fail("password not available");
          const validPassword = await bcrypt.compare(credentials.password, user.passwordHash);
          if (!validPassword) return fail("password mismatch");
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          role: user.role,
          defaultStoreId: user.defaultStoreId,
        };
      },
    }),
    ...(googleConfigured
      ? [
          GoogleProvider({
            clientId: env.GOOGLE_CLIENT_ID!,
            clientSecret: env.GOOGLE_CLIENT_SECRET!,
          }),
        ]
      : []),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.defaultStoreId = user.defaultStoreId;
      }

      if (token.sub) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.sub },
          select: { role: true, defaultStoreId: true, isActive: true },
        });
        if (!dbUser?.isActive) return {};
        token.role = dbUser.role;
        token.defaultStoreId = dbUser.defaultStoreId;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
        session.user.role = (token.role ?? "CASHIER") as typeof session.user.role;
        session.user.defaultStoreId = token.defaultStoreId as string | undefined;
      }
      return session;
    },
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
