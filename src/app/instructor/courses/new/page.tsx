import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createCourse } from "../actions";

export default async function NewCoursePage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const [session, params] = await Promise.all([getServerSession(authOptions), searchParams]);
  if (!session?.user || session.user.role !== "INSTRUCTOR") redirect("/login");
  return <main className="builder-page"><header className="builder-top"><Link className="brand" href="/dashboard"><span className="brand-mark">e</span> edutrack</Link><Link href="/dashboard">← Back to dashboard</Link></header><section className="builder-intro"><span className="eyebrow">INSTRUCTOR STUDIO · STEP 1 OF 3</span><h1>Start with a good idea.</h1><p>Set up the essentials for your new course. You can build the curriculum next.</p></section><form className="builder-form" action={createCourse}><label>Course title<input name="title" required minLength={5} maxLength={120} placeholder="e.g. Design systems that scale"/></label><label>Short description<input name="subtitle" required minLength={10} maxLength={180} placeholder="What will learners be able to do?"/></label><label>About this course<textarea name="description" required minLength={30} maxLength={10000} rows={5} placeholder="Describe the course, who it is for and what learners will make."/></label><div className="builder-form-row"><label>Category<input name="category" required minLength={2} maxLength={50} placeholder="Design, Development…"/></label><label>Difficulty<select name="difficulty" defaultValue="BEGINNER"><option value="BEGINNER">Beginner</option><option value="INTERMEDIATE">Intermediate</option><option value="ADVANCED">Advanced</option></select></label></div>{params.error && <p className="form-alert" role="alert">Please check the course details and try again.</p>}<button className="button">Create draft <span>↗</span></button></form></main>;
}
