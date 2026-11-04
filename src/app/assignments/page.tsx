import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { submitAssignment } from "./actions";

export default async function AssignmentsPage({ searchParams }: { searchParams: Promise<{ error?: string; submitted?: string }> }) {
  const [session, query] = await Promise.all([getServerSession(authOptions), searchParams]);
  if (!session?.user) redirect("/login");
  if (session.user.role === "INSTRUCTOR") redirect("/instructor/assignments");
  if (session.user.role === "ADMIN") redirect("/dashboard");
  const enrollments = await prisma.enrollment.findMany({
    where: { userId: session.user.id },
    orderBy: { enrolledAt: "desc" },
    include: {
      course: {
        include: {
          assignments: {
            orderBy: { createdAt: "desc" },
            include: { submissions: { where: { userId: session.user.id } } },
          },
        },
      },
    },
  });
  const assignments = enrollments.flatMap(enrollment => enrollment.course.assignments.map(assignment => ({ ...assignment, courseTitle: enrollment.course.title, submission: assignment.submissions[0] })));
  return <main className="dashboard-page"><header className="dashboard-top"><Link className="brand" href="/dashboard"><span className="brand-mark">e</span> edutrack</Link><nav><Link href="/dashboard">Overview</Link><Link href="/courses">Courses</Link></nav><Link href="/dashboard">Learning space →</Link></header><section className="dashboard-welcome"><span className="eyebrow">YOUR LEARNING · ASSIGNMENTS</span><h1>Make your learning <em>visible.</em></h1><p>Submit your work, check your grades and revisit instructor feedback.</p></section>{query.submitted && <div className="enrollment-confirmation" role="status">Your assignment was submitted{query.submitted === "late" ? " late" : ""}.</div>}{query.error && <div className="form-alert" role="alert">{query.error === "graded" ? "This assignment is already graded." : "Check your response and try again."}</div>}{assignments.length ? <div className="assignment-list">{assignments.map(assignment=>{const submission=assignment.submission;return <article className="assignment-card" key={assignment.id}><div className="assignment-card-head"><div><span className="eyebrow">{assignment.courseTitle}</span><h2>{assignment.title}</h2></div><span className={`status-pill ${submission?.status.toLowerCase() ?? "not-started"}`}>{submission?.late ? "late" : submission?.status.toLowerCase() ?? "not started"}</span></div><p>{assignment.instructions}</p><div className="assignment-due">{assignment.dueAt ? `Due ${assignment.dueAt.toLocaleDateString()}` : "No deadline"} · {assignment.maxPoints} points</div>{submission?.status === "GRADED" ? <div className="graded-feedback"><b>Score: {submission.score}/{assignment.maxPoints}</b><p>{submission.feedback ?? "No written feedback was provided."}</p></div> : <form action={submitAssignment.bind(null, assignment.id)} className="assignment-submit-form"><label htmlFor={`submission-${assignment.id}`}>{submission ? "Update your work" : "Your submission"}</label><textarea id={`submission-${assignment.id}`} name="text" required minLength={10} maxLength={20_000} rows={4} defaultValue={submission?.text ?? ""} placeholder="Write your response or share your project summary…"/><button className="button">{submission ? "Update submission" : "Submit assignment"}<span>↗</span></button></form>}</article>})}</div> : <section className="dashboard-panel dashboard-empty"><span>✳</span><b>No assignments yet.</b><p>When your enrolled courses include assignments, they will appear here.</p><Link className="text-link" href="/courses">Explore courses →</Link></section>}</main>;
}
