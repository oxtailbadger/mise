import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      name: "Household Password",
      credentials: {
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const password = credentials?.password as string | undefined;
        if (!password) return null;

        const b64 = process.env.HOUSEHOLD_PASSWORD_HASH_B64;
        if (!b64) return null;

        // Decode from base64 to recover the bcrypt hash (avoids $ interpolation in dotenv)
        const hashed = Buffer.from(b64, "base64").toString("utf-8");

        const valid = await bcrypt.compare(password, hashed);
        if (!valid) return null;

        return { id: "household", name: "Mise Household" };
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    // Stay logged in for 30 days
    maxAge: 30 * 24 * 60 * 60,
  },
  callbacks: {
    async jwt({ token }) {
      return token;
    },
    async session({ session }) {
      return session;
    },
  },
});
