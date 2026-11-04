import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { startQuiz, submitQuiz } from "../actions";

export default async function QuizPage({ params, searchParams }: { params: Promise<{ quizId: string }>; searchParams: Promise<{ attempt?: string; result?: string; error?: string }> }) {
  const [{ quizId }, query, session] = await Promise.all([params, searchParams, getServerSession(authOptions)]);
  if (!session?.user) redirect("/login");
  if (session.user.role !== "STUDENT") redirect("/dashboard");
  const quiz = await prisma.quiz.findFirst({ where: { id: quizId, published: true, course: { status: "PUBLISHED" } }, include: { course: { select: { title: true, slug: true } }, questions: { orderBy: { position: "asc" }, include: { options: { orderBy: { position: "asc" }, select: { id: true, text: true } } } } } });
  if (!quiz) redirect("/courses");
  const enrollment = await prisma.enrollment.findUnique({ where: { userId_courseId: { userId: session.user.id, courseId: quiz.courseId } }, select: { id: true } });
  if (!enrollment) redirect(`/courses/${quiz.course.slug}`);
  const startAction = startQuiz.bind(null, quiz.id);
  if (query.result) {
    const attempt = await prisma.quizAttempt.findFirst({ where: { id: query.result, quizId, userId: session.user.id, submittedAt: { not: null } }, select: { id: true, score: true, status: true, submittedAt: true } });
    if (!attempt) redirect(`/quizzes/${quizId}`);
    const released = !quiz.resultsReleaseAt || quiz.resultsReleaseAt <= new Date();
    return <main className="dashboard-page"><header className="dashboard-top"><Link className="brand" href="/dashboard"><span className="brand-mark">e</span> edutrack</Link><nav><Link href="/courses">Courses</Link></nav></header><section className="quiz-result"><span className="eyebrow">QUIZ RESULT · {quiz.course.title.toUpperCase()}</span><h1>{quiz.title}</h1>{!released ? <p>Your attempt is saved. Results will be available after the instructor’s release date.</p> : attempt.status === "AWAITING_MANUAL" ? <p>Your multiple choice questions are scored. Short answers are waiting for instructor review.</p> : <><strong>{attempt.score ?? 0}%</strong><p>{attempt.status === "TIMED_OUT" ? "Time expired; your submitted responses were scored." : (attempt.score ?? 0) >= quiz.passingScore ? "You passed." : "Keep practicing and try again."} Passing score: {quiz.passingScore}%</p></>}<Link className="text-link" href={`/courses/${quiz.course.slug}`}>Back to course →</Link></section></main>;
  }
  if (query.attempt) {
    const attempt = await prisma.quizAttempt.findFirst({ where: { id: query.attempt, quizId, userId: session.user.id, status: "IN_PROGRESS" }, select: { id: true, startedAt: true } });
    if (!attempt) redirect(`/quizzes/${quizId}?error=attempt`);
    const submitAction = submitQuiz.bind(null, quiz.id, attempt.id);
    return <main className="dashboard-page"><header className="dashboard-top"><Link className="brand" href="/dashboard"><span className="brand-mark">e</span> edutrack</Link><Link href={`/courses/${quiz.course.slug}`}>Exit quiz</Link></header><section className="quiz-heading"><span className="eyebrow">{quiz.course.title.toUpperCase()}</span><h1>{quiz.title}</h1><p>{quiz.questions.length} questions · Passing score {quiz.passingScore}%</p></section><form className="quiz-form" action={submitAction}>{quiz.questions.map((question,index)=><fieldset className="quiz-question" key={question.id}><legend>{index+1}. {question.prompt} <small>{question.points} pts</small></legend>{question.type === "SHORT_ANSWER" ? <textarea name={`text-${question.id}`} rows={4} maxLength={5000} aria-label={`Answer ${index+1}`} placeholder="Write a short answer…"/> : question.options.map(option=><label className="quiz-option" key={option.id}><input type={question.type === "MULTIPLE_SELECT" ? "checkbox" : "radio"} name={question.id} value={option.id}/><span>{option.text}</span></label>)}</fieldset>)}<button className="button">Submit quiz <span>↗</span></button></form></main>;
  }
  const attempts = await prisma.quizAttempt.count({ where: { quizId, userId: session.user.id } });
  const beginDisabled = attempts >= quiz.maxAttempts;
  return <main className="dashboard-page"><header className="dashboard-top"><Link className="brand" href="/dashboard"><span className="brand-mark">e</span> edutrack</Link><Link href={`/courses/${quiz.course.slug}`}>← Back to course</Link></header><section className="quiz-result"><span className="eyebrow">ASSESSMENT · {quiz.course.title.toUpperCase()}</span><h1>{quiz.title}</h1><p>{quiz.questions.length} questions · {quiz.timeLimitMinutes ? `${quiz.timeLimitMinutes} minute limit` : "Untimed"} · {quiz.maxAttempts} attempts · Passing score {quiz.passingScore}%</p>{query.error && <div className="form-alert" role="alert">{query.error === "attempts" ? "You have used all available attempts." : "That quiz attempt is unavailable."}</div>}<form action={startAction}><button className="button" disabled={beginDisabled}>{beginDisabled ? "No attempts remaining" : "Start quiz"}<span>↗</span></button></form></section></main>;
}
