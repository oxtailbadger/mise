import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      name: "Household Login",
      credentials: {
        householdName: { label: "Household name", type: "text" },
        password:      { label: "Password",        type: "password" },
      },
      async authorize(credentials) {
        const householdName = (credentials?.householdName as string | undefined)?.trim();
        const password      = credentials?.password as string | undefined;
        if (!householdName || !password) return null;

        const household = await prisma.household.findUnique({
          where: { name: householdName },
        });
        if (!household) return null;

        // If the DB password is empty (Stanton migration path), fall back to
        // the env-var hash and auto-write it into the DB on first login.
        let hash = household.password;
        if (!hash) {
          const b64 = process.env.HOUSEHOLD_PASSWORD_HASH_B64;
          if (!b64) return null;
          hash = Buffer.from(b64, "base64").toString("utf-8");
          await prisma.household.update({
            where: { id: household.id },
            data:  { password: hash },
          });
        }

        const valid = await bcrypt.compare(password, hash);
        if (!valid) return null;

        return { id: household.id, name: household.name };
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, user }) {
      // On first sign-in, persist the household id into the token.
      if (user) token.householdId = user.id;
      return token;
    },
    async session({ session, token }) {
      // Surface householdId as session.user.id so all API routes can read it.
      session.user.id = token.householdId as string;
      return session;
    },
  },
});
