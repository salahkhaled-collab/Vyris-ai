import { DefaultSession } from "next-auth";
import { Role, WorkspaceType } from "@prisma/client";

declare module "next-auth" {
  interface Session extends DefaultSession {
    user: DefaultSession["user"] & {
      id: string;
      role: Role | null;
      workspaceType: WorkspaceType | null;
      onboarded: boolean;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role | null;
    workspaceType: WorkspaceType | null;
    onboarded: boolean;
  }
}