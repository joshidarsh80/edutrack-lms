"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function saveLessonProgress(lessonId: string, positionSeconds: number, completed = false) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "STUDENT") throw new Error("Sign in as a student to save learning progress.");
  if (!Number.isFinite(positionSeconds) || positionSeconds < 0 || positionSeconds > 8 * 60 * 60) throw new Error("Invalid lesson position.");
  const lesson = await prisma.lesson.findFirst({ where: { id: lessonId, section: { course: { status: "PUBLISHED" } } }, include: { section: { select: { courseId: true } } } });
  if (!lesson) throw new Error("Lesson not found.");
  const enrollment = await prisma.enrollment.findUnique({ where: { userId_courseId: { userId: session.user.id, courseId: lesson.section.courseId } }, select: { id: true } });
  if (!enrollment && !lesson.isPreview) throw new Error("Enroll in this course to save progress.");
  if (!enrollment && completed) throw new Error("Enroll in the course before marking lessons complete.");
  await prisma.lessonProgress.upsert({
    where: { userId_lessonId: { userId: session.user.id, lessonId } },
    create: { userId: session.user.id, lessonId, lastPositionSeconds: Math.floor(positionSeconds), completedAt: completed ? new Date() : null },
    update: { lastPositionSeconds: Math.floor(positionSeconds), ...(completed ? { completedAt: new Date() } : {}) },
  });
  if (enrollment && completed) {
    const [totalLessons, completedLessons] = await Promise.all([
      prisma.lesson.count({ where: { section: { courseId: lesson.section.courseId } } }),
      prisma.lessonProgress.count({ where: { userId: session.user.id, completedAt: { not: null }, lesson: { section: { courseId: lesson.section.courseId } } } }),
    ]);
    if (totalLessons > 0 && totalLessons === completedLessons) {
      await prisma.enrollment.update({ where: { id: enrollment.id }, data: { completedAt: new Date() } });
    }
  }
  revalidatePath(`/learn`);
  return { saved: true };
}
