import { redirect } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  const user = session.user;
  const today = new Intl.DateTimeFormat("en", { weekday: "long", month: "long", day: "numeric" }).format(new Date());

  if (user.role === "STUDENT") {
    const [enrollments, completed, minutes, upcoming, learningCourses] = await Promise.all([
      prisma.enrollment.count({ where: { userId: user.id } }),
      prisma.enrollment.count({ where: { userId: user.id, completedAt: { not: null } } }),
      prisma.studySession.aggregate({ where: { userId: user.id }, _sum: { durationMinutes: true } }),
      prisma.assignmentSubmission.count({ where: { userId: user.id, status: { in: ["IN_PROGRESS", "SUBMITTED"] } } }),
      prisma.enrollment.findMany({ where: { userId: user.id }, orderBy: { enrolledAt: "desc" }, take: 4, include: { course: { include: { instructor: { select: { name: true } }, category: { select: { slug: true } }, sections: { orderBy: { position: "asc" }, include: { lessons: { orderBy: { position: "asc" }, include: { progress: { where: { userId: user.id }, select: { completedAt: true } } } } } } } } } }),
    ]);
    return <DashboardShell name={session.user.name ?? "Learner"} today={today} role="STUDENT"><div className="dashboard-stats"><Metric label="Enrolled courses" value={enrollments}/><Metric label="Courses completed" value={completed}/><Metric label="Learning hours" value={Math.round((minutes._sum.durationMinutes ?? 0) / 60 * 10) / 10}/><Metric label="Open submissions" value={upcoming}/></div><section className="dashboard-panel"><div className="dashboard-panel-head"><div><span className="eyebrow">YOUR LEARNING</span><h2>Keep your momentum.</h2></div><Link href="/courses">Explore courses →</Link></div>{enrollments === 0 ? <div className="dashboard-empty"><span>✳</span><b>Your learning journey starts with one course.</b><p>Browse the course catalog and find a topic that sparks your curiosity.</p><Link className="button" href="/courses">Explore courses <span>↗</span></Link></div> : <div className="learning-course-list">{learningCourses.map(enrollment=>{
      const lessons = enrollment.course.sections.flatMap(section => section.lessons);
      const completedLessons = lessons.filter(lesson => lesson.progress[0]?.completedAt).length;
      const percent = lessons.length ? Math.round(completedLessons / lessons.length * 100) : 0;
      const nextLesson = lessons.find(lesson => !lesson.progress[0]?.completedAt) ?? lessons[0];
      return <article className="learning-course-row" key={enrollment.id}><div className={`learning-course-art ${enrollment.course.category.slug}`}>✳</div><div className="learning-course-info"><small>{enrollment.course.category.slug.toUpperCase()} · {enrollment.course.instructor.name}</small><h3>{enrollment.course.title}</h3><div className="learning-progress"><i style={{ width: `${percent}%` }}/></div><span>{percent}% complete{nextLesson ? ` · Up next: ${nextLesson.title}` : " · No lessons yet"}</span></div>{nextLesson ? <Link className="continue-button" href={`/learn/${enrollment.course.slug}/${nextLesson.id}`}>Continue →</Link> : <Link className="continue-button" href={`/courses/${enrollment.course.slug}`}>View →</Link>}</article>;
    })}</div>}</section></DashboardShell>;
  }
  if (user.role === "INSTRUCTOR") {
    const [courses, students, pending, ownedCourses] = await Promise.all([
      prisma.course.count({ where: { instructorId: user.id } }),
      prisma.enrollment.count({ where: { course: { instructorId: user.id } } }),
      prisma.assignmentSubmission.count({ where: { assignment: { course: { instructorId: user.id } }, status: "SUBMITTED" } }),
      prisma.course.findMany({ where: { instructorId: user.id }, orderBy: { updatedAt: "desc" }, take: 6, select: { id: true, title: true, status: true, _count: { select: { enrollments: true } } } }),
    ]);
    return <DashboardShell name={session.user.name ?? "Instructor"} today={today} role="INSTRUCTOR"><div className="dashboard-stats"><Metric label="Your courses" value={courses}/><Metric label="Learner enrollments" value={students}/><Metric label="Submissions to review" value={pending}/></div><section className="dashboard-panel"><div className="dashboard-panel-head"><div><span className="eyebrow">TEACHING SPACE</span><h2>Your courses.</h2></div><Link className="button" href="/instructor/courses/new">Create course <span>↗</span></Link></div>{ownedCourses.length === 0 ? <div className="dashboard-empty"><span>✳</span><b>Start with a good idea.</b><p>Create a course, organize sections and add your first lessons.</p><Link className="button" href="/instructor/courses/new">Start a course <span>↗</span></Link></div> : <div className="instructor-course-list">{ownedCourses.map(course=><article key={course.id}><span><b>{course.title}</b><small>{course._count.enrollments} learners · {course.status.toLowerCase()}</small></span><Link href={`/instructor/courses/${course.id}`}>Manage →</Link></article>)}</div>}</section></DashboardShell>;
  }
  const [users, students, instructors, courses] = await Promise.all([
    prisma.user.count(), prisma.user.count({ where: { role: "STUDENT" } }), prisma.user.count({ where: { role: "INSTRUCTOR" } }), prisma.course.count(),
  ]);
  return <DashboardShell name={session.user.name ?? "Administrator"} today={today} role="ADMIN"><div className="dashboard-stats"><Metric label="Platform users" value={users}/><Metric label="Students" value={students}/><Metric label="Instructors" value={instructors}/><Metric label="Courses" value={courses}/></div><section className="dashboard-panel"><div className="dashboard-panel-head"><div><span className="eyebrow">PLATFORM OPERATIONS</span><h2>Keep the learning space healthy.</h2></div></div><div className="admin-dashboard-links"><Link href="/admin/users"><b>Manage users</b><small>Search, suspend and restore accounts →</small></Link><Link href="/admin/courses"><b>Review courses</b><small>Approve, reject or unpublish course content →</small></Link><Link href="/admin/audit"><b>Audit log</b><small>Review recent administrator actions →</small></Link></div></section></DashboardShell>;
}

function Metric({ label, value }: { label: string; value: number }) { return <div className="dashboard-metric"><small>{label}</small><strong>{value.toLocaleString()}</strong></div>; }
function DashboardShell({ name, today, role, children }: { name: string; today: string; role: string; children: React.ReactNode }) {
  return <main className="dashboard-page"><header className="dashboard-top"><Link className="brand" href="/"><span className="brand-mark">e</span> edutrack</Link><nav><Link href="/dashboard">Overview</Link><Link href="/courses">Courses</Link>{role === "STUDENT" && <Link href="/assignments">Assignments</Link>}{role === "INSTRUCTOR" && <Link href="/instructor/assignments">Grading</Link>}{role === "ADMIN" && <Link href="/admin/users">Administration</Link>}</nav><form action="/api/auth/signout" method="post"><button className="signout-button">Log out</button></form></header><section className="dashboard-welcome"><span className="eyebrow">{role} SPACE · {today.toUpperCase()}</span><h1>Good to see you, <em>{name.split(" ")[0]}.</em></h1><p>A little progress adds up. Here’s your learning at a glance.</p></section>{children}</main>;
}
