import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { z } from "zod";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const credentialsSchema = z.object({ email: z.string().email(), password: z.string().min(1) });

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 14 },
  pages: { signIn: "/login" },
  providers: [CredentialsProvider({
    name: "Email and password",
    credentials: { email: { label: "Email", type: "email" }, password: { label: "Password", type: "password" } },
    async authorize(raw) {
      const parsed = credentialsSchema.safeParse(raw);
      if (!parsed.success) return null;
      const user = await prisma.user.findUnique({ where: { email: parsed.data.email.trim().toLowerCase() } });
      if (!user || user.suspendedAt || !(await compare(parsed.data.password, user.passwordHash))) return null;
      return { id: user.id, name: user.name, email: user.email, role: user.role };
    },
  })],
  callbacks: {
    async jwt({ token, user }) {
      if (user && "role" in user) token.role = user.role;
      if (token.sub) {
        const account = await prisma.user.findUnique({ where: { id: token.sub }, select: { role: true, suspendedAt: true } });
        if (!account || account.suspendedAt) return { ...token, sub: undefined, role: undefined, disabled: true };
        token.role = account.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.disabled || !token.sub) return { ...session, user: undefined } as unknown as typeof session;
      if (session.user) { session.user.id = token.sub; session.user.role = token.role ?? Role.STUDENT; }
      return session;
    },
  },
};
