"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { saveLessonProgress } from "../../actions";

type LessonItem = { id: string; title: string; durationSeconds: number; isPreview: boolean; completed: boolean };

export function LessonPlayer({ lessonId, title, lessonType, videoUrl, textContent, resumeAt, initiallyCompleted, resources, curriculum, courseSlug, enrolled }: {
  lessonId: string; title: string; lessonType: "VIDEO" | "TEXT"; videoUrl: string | null; textContent: string | null; resumeAt: number; initiallyCompleted: boolean; resources: { id: string; title: string; url: string }[]; curriculum: { id: string; title: string; lessons: LessonItem[] }[]; courseSlug: string; enrolled: boolean;
}) {
  const lastSavedAt = useRef(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [complete, setComplete] = useState(initiallyCompleted);

  function save(position: number, markComplete = false) {
    setError("");
    startTransition(async () => {
      try {
        await saveLessonProgress(lessonId, position, markComplete);
        if (markComplete) { setComplete(true); setMessage("Lesson marked complete. Nice work."); }
      } catch { setError("Your progress could not be saved. Please try again."); }
    });
  }

  return <div className="player-layout"><section className="player-main"><div className="player-crumb"><Link href={`/courses/${courseSlug}`}>Course overview</Link><span> / </span>{title}</div>{lessonType === "VIDEO" && videoUrl ? <video ref={videoRef} className="video-surface" controls playsInline preload="metadata" src={videoUrl} onLoadedMetadata={event => { if (resumeAt > 0) event.currentTarget.currentTime = resumeAt; }} onTimeUpdate={event => { const position = Math.floor(event.currentTarget.currentTime); if (enrolled && position - lastSavedAt.current >= 15) { lastSavedAt.current = position; save(position); } }} /> : <article className="lesson-reading"><span className="eyebrow">READING LESSON</span><h1>{title}</h1><p>{textContent ?? "Your instructor has not added lesson text yet."}</p></article>}<div className="player-lesson-head"><div><span className="eyebrow">LESSON</span><h1>{title}</h1></div>{enrolled && <button className="button" onClick={() => save(Math.floor(videoRef.current?.currentTime ?? resumeAt), true)} disabled={isPending || complete}>{complete ? "Completed ✓" : isPending ? "Saving…" : "Mark complete"}</button>}</div>{message && <p className="player-success" role="status">{message}</p>}{error && <p className="form-alert" role="alert">{error}</p>}<p className="player-description">Your learning progress saves as you go. You can come back to this lesson any time.</p>{resources.length > 0 && <section className="lesson-resources"><h2>Lesson resources</h2>{resources.map(resource=><a key={resource.id} href={resource.url} target="_blank" rel="noreferrer">↗ &nbsp;{resource.title}</a>)}</section>}<div className="player-save-state">{isPending ? "Saving your progress…" : "Progress saved"}</div></section><aside className="player-curriculum"><div className="player-course-head"><span className="eyebrow">COURSE CONTENT</span><h2>{courseSlug.replaceAll("-", " ")}</h2></div>{curriculum.map(section=><section className="player-section" key={section.id}><h3>{section.title}</h3>{section.lessons.map(lesson=><Link key={lesson.id} className={`player-lesson ${lesson.id === lessonId ? "active" : ""}`} href={`/learn/${courseSlug}/${lesson.id}`}><span className="lesson-check">{lesson.completed ? "✓" : lesson.id === lessonId ? "▶" : "○"}</span><span>{lesson.title}<small>{Math.ceil(lesson.durationSeconds / 60)} min{lesson.isPreview && !enrolled ? " · Preview" : ""}</small></span></Link>)}</section>)}</aside></div>;
}
