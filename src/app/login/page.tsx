import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Log in" };

export default function LoginPage() {
  return <main className="auth-page"><Link className="brand" href="/"><span className="brand-mark">e</span> edutrack</Link><section className="auth-panel"><div className="eyebrow">WELCOME BACK</div><h1>Your next step<br/>is waiting.</h1><p className="auth-intro">Pick up your learning right where you left off.</p><LoginForm /></section><p className="auth-footnote">Learn a little. Grow a lot.</p></main>;
}
