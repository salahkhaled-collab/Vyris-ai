import { type NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

/**
 * NextAuth configuration for Vyris.
 *
 * Uses the Prisma adapter with database-backed sessions. Google OAuth
 * tokens (access + refresh) are stored in the `Account` table by the
 * adapter automatically — see src/lib/google-token.ts to read them
 * back for API calls (Calendar, Gmail).
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
  ],
  session: {
    strategy: "database",
  },
  callbacks: {
    async session({ session, user }) {
      const dbUser = user as typeof user & {
        id: string;
        role: import("@prisma/client").Role | null;
        workspaceType: import("@prisma/client").WorkspaceType | null;
        onboarded: boolean;
      };
      if (session.user) {
        session.user.id = dbUser.id;
        session.user.role = dbUser.role;
        session.user.workspaceType = dbUser.workspaceType;
        session.user.onboarded = dbUser.onboarded;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
};
