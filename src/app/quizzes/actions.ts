"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { gradeMultipleChoice } from "@/lib/learning";

export async function startQuiz(quizId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "STUDENT") redirect("/login");
  const quiz = await prisma.quiz.findFirst({ where: { id: quizId, published: true, course: { status: "PUBLISHED" } }, select: { id: true, courseId: true, maxAttempts: true } });
  if (!quiz) redirect("/assignments");
  const enrollment = await prisma.enrollment.findUnique({ where: { userId_courseId: { userId: session.user.id, courseId: quiz.courseId } }, select: { id: true } });
  if (!enrollment) redirect("/courses");
  const attempts = await prisma.quizAttempt.count({ where: { quizId, userId: session.user.id } });
  if (attempts >= quiz.maxAttempts) redirect(`/quizzes/${quizId}?error=attempts`);
  const attempt = await prisma.quizAttempt.create({ data: { quizId, userId: session.user.id } });
  redirect(`/quizzes/${quizId}?attempt=${attempt.id}`);
}

export async function submitQuiz(quizId: string, attemptId: string, formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "STUDENT") redirect("/login");
  const attempt = await prisma.quizAttempt.findFirst({
    where: { id: attemptId, quizId, userId: session.user.id, status: "IN_PROGRESS", quiz: { published: true, course: { status: "PUBLISHED" } } },
    include: {
      quiz: {
        include: {
          questions: {
            orderBy: { position: "asc" },
            include: { options: { orderBy: { position: "asc" } } },
          },
        },
      },
    },
  });
  if (!attempt) redirect(`/quizzes/${quizId}?error=attempt`);
  const enrollment = await prisma.enrollment.findUnique({ where: { userId_courseId: { userId: session.user.id, courseId: attempt.quiz.courseId } }, select: { id: true } });
  if (!enrollment) redirect("/courses");
  const answers = attempt.quiz.questions.map(question => {
    const validIds = new Set(question.options.map(option => option.id));
    const optionIds = formData.getAll(question.id).filter((id): id is string => typeof id === "string" && validIds.has(id));
    const textAnswer = formData.get(`text-${question.id}`);
    const correctIds = question.options.filter(option => option.isCorrect).map(option => option.id);
    const pointsAwarded = question.type === "SHORT_ANSWER" ? 0 : gradeMultipleChoice(correctIds, optionIds, question.points);
    return { questionId: question.id, optionIds, textAnswer: typeof textAnswer === "string" ? textAnswer.slice(0, 5000) : null, pointsAwarded, needsManualGrade: question.type === "SHORT_ANSWER" };
  });
  const earnedPoints = answers.reduce((sum, answer) => sum + answer.pointsAwarded, 0);
  const possiblePoints = attempt.quiz.questions.reduce((sum, question) => sum + question.points, 0);
  const score = possiblePoints > 0 ? Math.round(earnedPoints / possiblePoints * 100) : 0;
  const needsManualGrade = answers.some(answer => answer.needsManualGrade);
  const timedOut = Boolean(attempt.quiz.timeLimitMinutes && Date.now() > attempt.startedAt.getTime() + attempt.quiz.timeLimitMinutes * 60_000);
  await prisma.$transaction(async tx => {
    await tx.quizAnswer.createMany({ data: answers.map(({ questionId, optionIds, textAnswer, pointsAwarded }) => ({ attemptId, questionId, optionIds, textAnswer, pointsAwarded })) });
    await tx.quizAttempt.update({ where: { id: attemptId }, data: { score, status: timedOut ? "TIMED_OUT" : needsManualGrade ? "AWAITING_MANUAL" : "SUBMITTED", submittedAt: new Date() } });
    if (!needsManualGrade) await tx.notification.create({ data: { userId: session.user.id, type: "QUIZ", title: "Quiz results are ready", body: "Your quiz attempt has been scored.", href: `/quizzes/${quizId}` } });
  });
  revalidatePath(`/quizzes/${quizId}`);
  redirect(`/quizzes/${quizId}?result=${attemptId}`);
}
