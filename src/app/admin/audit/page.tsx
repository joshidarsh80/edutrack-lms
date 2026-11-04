import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function AdminAuditPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") redirect("/login");
  const events = await prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 100, include: { actor: { select: { name: true, email: true } } } });
  return <main className="dashboard-page"><header className="dashboard-top"><Link className="brand" href="/dashboard"><span className="brand-mark">e</span> edutrack</Link><nav><Link href="/dashboard">Overview</Link><Link href="/admin/users">Users</Link><Link href="/admin/courses">Courses</Link></nav></header><section className="dashboard-welcome"><span className="eyebrow">ADMIN · AUDIT</span><h1>Platform <em>activity.</em></h1><p>Recent administrator changes and platform setup events.</p></section><div className="admin-audit-list">{events.map(event=><article key={event.id}><span><b>{event.action.replaceAll("_", " ").toLowerCase()}</b><small>{event.actor.name} · {event.actor.email}</small></span><span>{event.entityType}{event.entityId ? ` · ${event.entityId}` : ""}</span><time dateTime={event.createdAt.toISOString()}>{event.createdAt.toLocaleString()}</time></article>)}</div>{events.length === 0 && <section className="dashboard-panel dashboard-empty"><span>✳</span><b>No audit events yet.</b></section>}</main>;
}
