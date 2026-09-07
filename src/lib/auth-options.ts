import { type NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/prisma";


export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  events: {
    async createUser({ user }) {
      // Role selection was removed from onboarding - every new account
      // starts as CEO. This only fires once, on first-time account
      // creation via the adapter (covers Google sign-up; email/password
      // signup sets this directly in /api/auth/signup).
      await prisma.user.update({
        where: { id: user.id },
        data: { role: "CEO" },
      });
    },
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      allowDangerousEmailAccountLinking: true,
      authorization: {
        params: {
          scope: [
            "openid",
            "email",
            "profile",
            "https://www.googleapis.com/auth/calendar.readonly",
            
          ].join(" "),
          access_type: "offline",
          prompt: "consent", 
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
    async signIn({ account }) {
      if (account?.provider === "google" && account.access_token) {
        await prisma.account.updateMany({
          where: { provider: "google", providerAccountId: account.providerAccountId },
          data: {
            access_token: account.access_token,
            refresh_token: account.refresh_token ?? undefined,
            expires_at: account.expires_at,
            token_type: account.token_type,
            scope: account.scope,
            id_token: account.id_token,
          },
        });
      }
      return true;
    },
    async jwt({ token, user, trigger, session }) {
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