"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export function LoginForm() {
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const router = useRouter();
  async function submit(formData: FormData) {
    setPending(true); setError("");
    const result = await signIn("credentials", { email: formData.get("email"), password: formData.get("password"), redirect: false });
    setPending(false);
    if (result?.error) setError("That email and password combination wasn’t recognized.");
    else router.push("/dashboard");
  }
  return <form action={submit} className="auth-form">
    <label>Email address<input name="email" type="email" autoComplete="email" required /></label>
    <label>Password<input name="password" type="password" autoComplete="current-password" required /></label>
    {error && <p className="form-alert" role="alert">{error}</p>}
    <button className="button auth-submit" disabled={pending}>{pending ? "Signing in…" : "Log in"}<span>↗</span></button>
    <p className="auth-switch">New to EduTrack? <Link href="/register">Create an account</Link></p>
  </form>;
}
