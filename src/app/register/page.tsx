import type { Metadata } from "next";
import Link from "next/link";
import { RegistrationForm } from "./registration-form";

export const metadata: Metadata = { title: "Create your account" };

export default function RegisterPage() {
  return <main className="auth-page"><Link className="brand" href="/"><span className="brand-mark">e</span> edutrack</Link><section className="auth-panel"><div className="eyebrow">A FRESH START</div><h1>Make room for<br/><em>what’s next.</em></h1><p className="auth-intro">Create your free account and find a learning rhythm that feels like yours.</p><RegistrationForm /></section><p className="auth-footnote">By continuing, you agree to use this demo responsibly.</p></main>;
}
