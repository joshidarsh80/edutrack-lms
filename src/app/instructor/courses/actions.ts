"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const courseSchema = z.object({ title: z.string().trim().min(5).max(120), subtitle: z.string().trim().min(10).max(180), description: z.string().trim().min(30).max(10_000), category: z.string().trim().min(2).max(50), difficulty: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"]) });

async function instructorId() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "INSTRUCTOR") redirect("/login");
  return session.user.id;
}

export async function createCourse(formData: FormData) {
  const ownerId = await instructorId();
  const parsed = courseSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/instructor/courses/new?error=invalid");
  const categoryName = parsed.data.category;
  const categorySlug = categoryName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || `topic-${randomUUID().slice(0, 6)}`;
  const category = await prisma.courseCategory.upsert({ where: { slug: categorySlug }, update: {}, create: { name: categoryName, slug: categorySlug } });
  const titleSlug = parsed.data.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "course";
  const slug = `${titleSlug}-${randomUUID().slice(0, 6)}`;
  const course = await prisma.$transaction(async tx => {
    const created = await tx.course.create({ data: { title: parsed.data.title, subtitle: parsed.data.subtitle, description: parsed.data.description, difficulty: parsed.data.difficulty, categoryId: category.id, instructorId: ownerId, slug, status: "DRAFT" } });
    await tx.courseChangeLog.create({ data: { courseId: created.id, actorId: ownerId, action: "COURSE_CREATED" } });
    return created;
  });
  redirect(`/instructor/courses/${course.id}`);
}

export async function addSection(courseId: string, formData: FormData) {
  const ownerId = await instructorId();
  const title = z.string().trim().min(2).max(100).safeParse(formData.get("title"));
  if (!title.success) redirect(`/instructor/courses/${courseId}?error=section`);
  const course = await prisma.course.findFirst({ where: { id: courseId, instructorId: ownerId, status: { in: ["DRAFT", "UNPUBLISHED", "REJECTED"] } }, select: { id: true } });
  if (!course) redirect("/dashboard");
  const position = await prisma.courseSection.count({ where: { courseId } });
  await prisma.courseSection.create({ data: { courseId, title: title.data, position } });
  revalidatePath(`/instructor/courses/${courseId}`);
  redirect(`/instructor/courses/${courseId}`);
}

export async function addLesson(courseId: string, sectionId: string, formData: FormData) {
  const ownerId = await instructorId();
  const parsed = z.object({ title: z.string().trim().min(2).max(120), type: z.enum(["VIDEO", "TEXT"]), videoUrl: z.union([z.literal(""), z.string().url()]), textContent: z.string().max(20_000) }).safeParse(Object.fromEntries(formData));
  if (!parsed.success || (parsed.data.type === "VIDEO" && !parsed.data.videoUrl) || (parsed.data.type === "TEXT" && parsed.data.textContent.trim().length < 20)) redirect(`/instructor/courses/${courseId}?error=lesson`);
  const section = await prisma.courseSection.findFirst({ where: { id: sectionId, course: { id: courseId, instructorId: ownerId, status: { in: ["DRAFT", "UNPUBLISHED", "REJECTED"] } } }, select: { id: true } });
  if (!section) redirect("/dashboard");
  const position = await prisma.lesson.count({ where: { sectionId } });
  await prisma.lesson.create({ data: { sectionId, title: parsed.data.title, type: parsed.data.type, videoUrl: parsed.data.videoUrl || null, textContent: parsed.data.type === "TEXT" ? parsed.data.textContent : null, position, isPreview: position === 0 } });
  revalidatePath(`/instructor/courses/${courseId}`);
  redirect(`/instructor/courses/${courseId}`);
}

export async function publishCourse(courseId: string, formData: FormData) {
  const ownerId = await instructorId();
  const parsedAction = z.enum(["publish", "unpublish"]).safeParse(formData.get("action"));
  if (!parsedAction.success) redirect(`/instructor/courses/${courseId}?error=action`);
  const course = await prisma.course.findFirst({ where: { id: courseId, instructorId: ownerId }, include: { sections: { include: { lessons: true } } } });
  if (!course) redirect("/dashboard");
  if (parsedAction.data === "publish" && (!course.sections.length || course.sections.some(section => !section.lessons.length))) redirect(`/instructor/courses/${courseId}?error=empty`);
  const status = parsedAction.data === "publish" ? "PENDING" : "UNPUBLISHED";
  const actionName = parsedAction.data === "publish" ? "SUBMITTED_FOR_REVIEW" : "UNPUBLISHED";
  await prisma.$transaction([
    prisma.course.update({ where: { id: courseId }, data: { status, ...(status === "PENDING" ? { publishedAt: null } : {}) } }),
    prisma.courseChangeLog.create({ data: { courseId, actorId: ownerId, action: actionName } }),
  ]);
  revalidatePath("/courses"); revalidatePath("/dashboard"); revalidatePath(`/instructor/courses/${courseId}`);
  redirect(`/instructor/courses/${courseId}?saved=${status.toLowerCase()}`);
}
