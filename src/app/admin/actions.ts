"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function adminId() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") redirect("/login");
  return session.user.id;
}

export async function setUserAccess(userId: string, formData: FormData) {
  const actorId = await adminId();
  const action = z.enum(["suspend", "reactivate"]).safeParse(formData.get("action"));
  if (!action.success) redirect("/admin/users?error=action");
  if (actorId === userId) redirect("/admin/users?error=self");
  const target = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, role: true, suspendedAt: true } });
  if (!target) redirect("/admin/users?error=missing");
  if (target.role === "ADMIN" && action.data === "suspend" && !target.suspendedAt) {
    const activeAdmins = await prisma.user.count({ where: { role: "ADMIN", suspendedAt: null } });
    if (activeAdmins <= 1) redirect("/admin/users?error=last-admin");
  }
  const suspendedAt = action.data === "suspend" ? new Date() : null;
  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { suspendedAt } }),
    prisma.auditLog.create({ data: { actorId, action: action.data === "suspend" ? "USER_SUSPENDED" : "USER_REACTIVATED", entityType: "USER", entityId: userId } }),
  ]);
  revalidatePath("/admin/users"); revalidatePath("/dashboard");
  redirect("/admin/users?saved=1");
}

export async function moderateCourse(courseId: string, formData: FormData) {
  const actorId = await adminId();
  const action = z.enum(["approve", "reject", "unpublish"]).safeParse(formData.get("action"));
  if (!action.success) redirect("/admin/courses?error=action");
  const course = await prisma.course.findUnique({ where: { id: courseId }, select: { id: true, status: true } });
  if (!course) redirect("/admin/courses?error=missing");
  if (action.data === "approve" && !["PENDING", "DRAFT"].includes(course.status)) redirect("/admin/courses?error=status");
  const status = action.data === "approve" ? "PUBLISHED" : action.data === "reject" ? "REJECTED" : "UNPUBLISHED";
  await prisma.$transaction([
    prisma.course.update({ where: { id: courseId }, data: { status, ...(status === "PUBLISHED" ? { publishedAt: new Date() } : {}) } }),
    prisma.courseChangeLog.create({ data: { courseId, actorId, action: `ADMIN_${action.data.toUpperCase()}` } }),
    prisma.auditLog.create({ data: { actorId, action: `COURSE_${action.data.toUpperCase()}`, entityType: "COURSE", entityId: courseId } }),
  ]);
  revalidatePath("/admin/courses"); revalidatePath("/courses"); revalidatePath("/dashboard");
  redirect("/admin/courses?saved=1");
}
