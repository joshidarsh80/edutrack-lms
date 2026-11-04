import "next-auth";
import "next-auth/jwt";
import type { DefaultSession } from "next-auth";
import type { Role } from "@prisma/client";

declare module "next-auth" {
  interface User { role: Role }
  interface Session { user: { id: string; role: Role } & NonNullable<DefaultSession["user"]> }
}

declare module "next-auth/jwt" { interface JWT { role?: Role; disabled?: boolean } }
