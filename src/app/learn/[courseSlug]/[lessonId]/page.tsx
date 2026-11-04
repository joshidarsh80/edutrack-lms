import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { LessonPlayer } from "./lesson-player";

export default async function LessonPage({ params }: { params: Promise<{ courseSlug: string; lessonId: string }> }) {
  const [{ courseSlug, lessonId }, session] = await Promise.all([params, getServerSession(authOptions)]);
  const userId = session?.user.id ?? "";
  const lesson = await prisma.lesson.findFirst({
    where: { id: lessonId, section: { course: { slug: courseSlug, status: "PUBLISHED" } } },
    include: {
      section: {
        include: {
          course: {
            include: {
              sections: {
                orderBy: { position: "asc" },
                include: {
                  lessons: {
                    orderBy: { position: "asc" },
                    include: { progress: { where: { userId }, select: { completedAt: true } } },
                  },
                },
              },
            },
          },
        },
      },
      resources: true,
      progress: { where: { userId }, select: { lastPositionSeconds: true, completedAt: true } },
    },
  });
  if (!lesson) redirect(`/courses/${courseSlug}`);
  const enrolled = session?.user?.role === "STUDENT"
    ? await prisma.enrollment.findUnique({ where: { userId_courseId: { userId, courseId: lesson.section.course.id } }, select: { id: true } })
    : null;
  if (!lesson.isPreview && !enrolled) redirect(`/courses/${courseSlug}`);
  const curriculum = lesson.section.course.sections.map(section => ({
    id: section.id,
    title: section.title,
    lessons: section.lessons.map(item => ({
      id: item.id,
      title: item.title,
      durationSeconds: item.durationSeconds,
      isPreview: item.isPreview,
      completed: Boolean(item.progress[0]?.completedAt),
    })),
  }));
  return <main className="player-page"><header className="player-top"><Link className="brand" href="/dashboard"><span className="brand-mark">e</span> edutrack</Link><div>{lesson.section.course.title}</div><Link href={`/courses/${courseSlug}`}>Course details →</Link></header><LessonPlayer lessonId={lesson.id} title={lesson.title} lessonType={lesson.type} videoUrl={lesson.videoUrl} textContent={lesson.textContent} resumeAt={lesson.progress[0]?.lastPositionSeconds ?? 0} initiallyCompleted={Boolean(lesson.progress[0]?.completedAt)} resources={lesson.resources.map(resource => ({ id: resource.id, title: resource.title, url: resource.url }))} curriculum={curriculum} courseSlug={courseSlug} enrolled={Boolean(enrolled)}/></main>;
}
