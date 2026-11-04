"use server";

import { hash } from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const registrationSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(254),
  password: z.string().min(10).max(128),
  role: z.enum(["STUDENT", "INSTRUCTOR"]),
});

export type RegistrationState = { error?: string; success?: boolean };

export async function registerUser(_previous: RegistrationState, formData: FormData): Promise<RegistrationState> {
  const parsed = registrationSchema.safeParse({
    name: formData.get("name"), email: formData.get("email"),
    password: formData.get("password"), role: formData.get("role"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the details and try again." };
  const email = parsed.data.email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) return { error: "An account with that email already exists." };
  const passwordHash = await hash(parsed.data.password, 12);
  await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({ data: { name: parsed.data.name, email, passwordHash, role: parsed.data.role } });
    if (parsed.data.role === "STUDENT") await tx.studentProfile.create({ data: { userId: user.id } });
    else await tx.instructorProfile.create({ data: { userId: user.id } });
  });
  return { success: true };
}
