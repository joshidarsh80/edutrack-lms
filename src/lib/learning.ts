export function calculateCourseProgress(completedLessons: number, totalLessons: number): number {
  if (totalLessons <= 0) return 0;
  return Math.round(Math.min(Math.max(completedLessons, 0), totalLessons) / totalLessons * 100);
}

export function gradeMultipleChoice(correctOptionIds: string[], submittedOptionIds: string[], points: number): number {
  const correct = [...new Set(correctOptionIds)].sort();
  const submitted = [...new Set(submittedOptionIds)].sort();
  if (correct.length !== submitted.length || correct.some((id, index) => id !== submitted[index])) return 0;
  return Math.max(0, points);
}

export type RevisionPlanItem = { dueAt: Date; intervalDays: number; priority: "NORMAL" | "HIGH" };

export function buildRevisionPlan(startAt: Date, quizPercent: number): RevisionPlanItem[] {
  const intervals = quizPercent >= 80 ? [1, 3, 7, 14] : quizPercent >= 50 ? [1, 2, 4, 8] : [1, 2, 3, 7];
  const priority = quizPercent < 50 ? "HIGH" : "NORMAL";
  return intervals.map(intervalDays => ({ dueAt: new Date(startAt.getTime() + intervalDays * 86_400_000), intervalDays, priority }));
}

export function hasCompletedPrerequisites(requiredCourseIds: string[], completedCourseIds: string[]): boolean {
  const completed = new Set(completedCourseIds);
  return requiredCourseIds.every(courseId => completed.has(courseId));
}

export function eligibleAchievementSlugs(stats: { completedCourses: number; streakDays: number; perfectQuizzes: number }): string[] {
  const awards: string[] = [];
  if (stats.completedCourses > 0) awards.push("first-course");
  if (stats.streakDays >= 7) awards.push("week-of-learning");
  if (stats.perfectQuizzes > 0) awards.push("perfect-score");
  return awards;
}
