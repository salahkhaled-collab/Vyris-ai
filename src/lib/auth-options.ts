import { type NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { BASE_GOOGLE_SCOPES, shouldReplaceGrant } from "@/lib/google-scopes";
import { clientIp, consume, resetLimit, MINUTE } from "@/lib/rate-limit";

const LOGIN_FAILURES_ALLOWED = 10;
const LOGIN_FAILURES_PER_EMAIL = 50;
const LOGIN_WINDOW_MS = 15 * MINUTE;
/** bcrypt hash of a random string, compared when an account has no password. */
const DUMMY_HASH = "$2b$10$Z9XIXdCTxQgJm4FDEm7RKe.1.m.3IcpG10nJFE5kp787u8XrxIOGC";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),

  events: {
    async createUser({ user }) {
      await prisma.user.update({
        where: { id: user.id },
        data: { role: "CEO", accessLevel: "ADMIN" },
      });
    },
  },

  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      allowDangerousEmailAccountLinking: false,
      // Sign-in asks for basic profile only. Gmail and Calendar are requested
      // later from their Connect buttons (see src/lib/google-scopes.ts).
      authorization: {
        params: {
          scope: BASE_GOOGLE_SCOPES.join(" "),
          include_granted_scopes: "true",
        },
      },
    }),

    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          const email = credentials.email.toLowerCase().trim();
          // Slow down password guessing. Each attempt is counted before the
          // password is checked (one atomic increment), so parallel requests
          // can't all slip under the limit. The tight limit is per email AND
          // network, so a stranger can't lock the real owner out from elsewhere;
          // the loose per-email limit caps guessing spread across many networks.
          const raw = (req?.headers ?? {}) as Record<string, unknown>;
          const ip = clientIp(
            new Headers(
              Object.entries(raw).filter((e): e is [string, string] => typeof e[1] === "string")
            )
          );
          const keys = [
            { key: `login:${email}:${ip}`, limit: LOGIN_FAILURES_ALLOWED },
            { key: `login:${email}`, limit: LOGIN_FAILURES_PER_EMAIL },
          ];
          for (const k of keys) {
            if (!(await consume(k.key, k.limit, LOGIN_WINDOW_MS))) return null;
          }
          const user = await prisma.user.findUnique({ where: { email } });

          // Compare against a dummy hash when there is no password, so response
          // time doesn't reveal which emails have accounts.
          const valid = await compare(credentials.password, user?.password ?? DUMMY_HASH);
          if (!user?.password || !valid) {
            return null;
          }
          await Promise.all(keys.map((k) => resetLimit(k.key)));

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
            role: user.role,
            workspaceType: user.workspaceType,
            onboarded: user.onboarded,
          };
        } catch (e) {
          console.error("[auth] authorize threw:", e);
          return null;
        }
      },
    }),
  ],

  session: {
    strategy: "jwt",
  },

  callbacks: {
    async signIn({ account }) {
      if (account?.provider === "google" && account.access_token) {
        const existing = await prisma.account.findFirst({
          where: { provider: "google", providerAccountId: account.providerAccountId },
          select: { scope: true },
        });
        // A plain sign-in asks for profile scopes only and must not replace a
        // stored Gmail/Calendar grant. A Connect click always replaces it.
        if (existing && shouldReplaceGrant(existing.scope, account.scope)) {
          await prisma.account.updateMany({
            where: {
              provider: "google",
              providerAccountId: account.providerAccountId,
            },
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
        if (session.onboarded !== undefined) {
          token.onboarded = session.onboarded;
        }
        if (session.role !== undefined) {
          token.role = session.role;
        }
        if (session.workspaceType !== undefined) {
          token.workspaceType = session.workspaceType;
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role =
          token.role as import("@prisma/client").Role | null;
        session.user.workspaceType =
          token.workspaceType as import("@prisma/client").WorkspaceType | null;
        session.user.onboarded = token.onboarded as boolean;
      }

      return session;
    },
  },

  pages: {
    signIn: "/login",
  },
};