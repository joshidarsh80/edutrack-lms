"use client";

import { useActionState } from "react";
import Link from "next/link";
import { registerUser, type RegistrationState } from "./actions";

const initialState: RegistrationState = {};

export function RegistrationForm() {
  const [state, action, pending] = useActionState(registerUser, initialState);
  return <form action={action} className="auth-form">
    <label>Your name<input name="name" autoComplete="name" minLength={2} maxLength={80} required /></label>
    <label>Email address<input name="email" type="email" autoComplete="email" required /></label>
    <label>Password<input name="password" type="password" autoComplete="new-password" minLength={10} required /><small>Use at least 10 characters.</small></label>
    <label>I’m joining as<select name="role" defaultValue="STUDENT"><option value="STUDENT">Student</option><option value="INSTRUCTOR">Instructor</option></select></label>
    {state.error && <p className="form-alert" role="alert">{state.error}</p>}
    {state.success ? <div className="form-success" role="status">Your account is ready. <Link href="/login">Log in to continue →</Link></div> : <button className="button auth-submit" disabled={pending}>{pending ? "Creating your account…" : "Create account"}<span>↗</span></button>}
    <p className="auth-switch">Already have an account? <Link href="/login">Log in</Link></p>
  </form>;
}
