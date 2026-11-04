"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function submitAssignment(assignmentId: string, formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "STUDENT") redirect("/login");
  const text = z.string().trim().min(10).max(20_000).safeParse(formData.get("text"));
  if (!text.success) redirect("/assignments?error=invalid");
  const assignment = await prisma.assignment.findFirst({ where: { id: assignmentId, course: { status: "PUBLISHED" } }, select: { id: true, dueAt: true, courseId: true, course: { select: { instructorId: true } } } });
  if (!assignment) redirect("/assignments");
  const enrollment = await prisma.enrollment.findUnique({ where: { userId_courseId: { userId: session.user.id, courseId: assignment.courseId } }, select: { id: true } });
  if (!enrollment) redirect("/courses");
  const prior = await prisma.assignmentSubmission.findUnique({ where: { assignmentId_userId: { assignmentId, userId: session.user.id } }, select: { status: true } });
  if (prior?.status === "GRADED") redirect("/assignments?error=graded");
  const late = Boolean(assignment.dueAt && Date.now() > assignment.dueAt.getTime());
  await prisma.$transaction(async tx => {
    await tx.assignmentSubmission.upsert({
      where: { assignmentId_userId: { assignmentId, userId: session.user.id } },
      create: { assignmentId, userId: session.user.id, text: text.data, status: "SUBMITTED", submittedAt: new Date(), late },
      update: { text: text.data, status: "SUBMITTED", submittedAt: new Date(), late },
    });
    await tx.notification.create({ data: { userId: assignment.course.instructorId, type: "ASSIGNMENT_SUBMISSION", title: "A learner submitted work", body: "A new assignment submission is ready for review.", href: "/instructor/assignments" } });
  });
  revalidatePath("/assignments"); revalidatePath("/instructor/assignments");
  redirect(`/assignments?submitted=${late ? "late" : "1"}`);
}

export async function gradeAssignmentSubmission(submissionId: string, formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "INSTRUCTOR") redirect("/login");
  const parsed = z.object({ score: z.coerce.number().int().min(0), feedback: z.string().trim().min(3).max(5000) }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/instructor/assignments?error=invalid");
  const submission = await prisma.assignmentSubmission.findFirst({ where: { id: submissionId, assignment: { course: { instructorId: session.user.id } } }, include: { assignment: { select: { maxPoints: true } }, user: { select: { id: true } } } });
  if (!submission) redirect("/dashboard");
  if (parsed.data.score > submission.assignment.maxPoints) redirect("/instructor/assignments?error=score");
  await prisma.$transaction([
    prisma.assignmentSubmission.update({ where: { id: submission.id }, data: { score: parsed.data.score, feedback: parsed.data.feedback, status: "GRADED", gradedAt: new Date() } }),
    prisma.notification.create({ data: { userId: submission.user.id, type: "GRADE", title: "Assignment graded", body: "Your instructor has reviewed your work and left feedback.", href: "/assignments" } }),
  ]);
  revalidatePath("/assignments"); revalidatePath("/instructor/assignments");
  redirect("/instructor/assignments?graded=1");
}
