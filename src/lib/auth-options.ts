import { type NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/prisma";

/**
 * NextAuth configuration for Vyris.
 *
 * Uses the Prisma adapter for account/session storage. Session
 * STRATEGY is JWT, not database — CredentialsProvider requires this,
 * NextAuth does not support database sessions with credentials auth.
 * Google OAuth tokens are still stored in the `Account` table by the
 * adapter automatically — see src/lib/google-token.ts to read them
 * back for API calls (Calendar, Gmail). The adapter still works fine
 * for that under JWT strategy; only the SESSION lookup changed.
 *
 * Scopes requested:
 *  - calendar.readonly — populates the Command Center schedule panel
 *  - gmail.readonly    — populates the Inbox page with real email
 */
export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      authorization: {
        params: {
          scope: [
            "openid",
            "email",
            "profile",
            "https://www.googleapis.com/auth/calendar.readonly",
            "https://www.googleapis.com/auth/gmail.readonly",
          ].join(" "),
          access_type: "offline", // required to receive a refresh_token
          prompt: "consent", // forces refresh_token on every login during testing
        },
      },
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        // No user, or a Google-only account with no password set
        if (!user || !user.password) return null;

        const valid = await compare(credentials.password, user.password);
        if (!valid) return null;

        // Return everything the jwt callback needs — this object
        // becomes the `user` param on initial sign-in only.
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
          workspaceType: user.workspaceType,
          onboarded: user.onboarded,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      // Initial sign-in: `user` is populated (from adapter for Google,
      // from authorize() return value for credentials). Copy the
      // fields we need onto the token since they won't be passed
      // again on subsequent requests.
      if (user) {
        const u = user as typeof user & {
          role: import("@prisma/client").Role | null;
          workspaceType: import("@prisma/client").WorkspaceType | null;
          onboarded: boolean;
        };
        token.id = u.id;
        token.role = u.role;
        token.workspaceType = u.workspaceType;
        token.onboarded = u.onboarded;
      }

      // Manual refresh path: call `session.update()` client-side after
      // onboarding completes (or role changes) to re-sync the token
      // without forcing a full re-login.
      if (trigger === "update" && session) {
        if (session.onboarded !== undefined) token.onboarded = session.onboarded;
        if (session.role !== undefined) token.role = session.role;
        if (session.workspaceType !== undefined) token.workspaceType = session.workspaceType;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as import("@prisma/client").Role | null;
        session.user.workspaceType = token.workspaceType as import("@prisma/client").WorkspaceType | null;
        session.user.onboarded = token.onboarded as boolean;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
};