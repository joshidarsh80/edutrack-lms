"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasCompletedPrerequisites } from "@/lib/learning";

export async function enrollInCourse(courseId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "STUDENT") redirect("/login");
  const course = await prisma.course.findFirst({ where: { id: courseId, status: "PUBLISHED" }, include: { prerequisites: { select: { prerequisiteCourseId: true } } } });
  if (!course) redirect("/courses");
  if (course.price > 0) redirect(`/courses/${course.slug}?payment=unavailable`);
  const completed = await prisma.enrollment.findMany({ where: { userId: session.user.id, completedAt: { not: null }, courseId: { in: course.prerequisites.map(item => item.prerequisiteCourseId) } }, select: { courseId: true } });
  if (!hasCompletedPrerequisites(course.prerequisites.map(item => item.prerequisiteCourseId), completed.map(item => item.courseId))) redirect(`/courses/${course.slug}?prerequisite=1`);
  await prisma.$transaction(async (tx) => {
    await tx.enrollment.upsert({ where: { userId_courseId: { userId: session.user.id, courseId: course.id } }, create: { userId: session.user.id, courseId: course.id }, update: {} });
    await tx.notification.create({ data: { userId: session.user.id, type: "ENROLLMENT", title: "You’re enrolled", body: "Your new course is ready when you are.", href: `/courses/${course.slug}` } });
  });
  revalidatePath("/dashboard");
  redirect(`/courses/${course.slug}?enrolled=1`);
}
