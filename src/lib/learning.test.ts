import { describe, expect, it } from "vitest";
import { buildRevisionPlan, calculateCourseProgress, eligibleAchievementSlugs, gradeMultipleChoice, hasCompletedPrerequisites } from "./learning";

describe("course progress", () => {
  it("calculates rounded progress and clamps invalid counts", () => {
    expect(calculateCourseProgress(2, 3)).toBe(67);
    expect(calculateCourseProgress(4, 3)).toBe(100);
    expect(calculateCourseProgress(-2, 3)).toBe(0);
    expect(calculateCourseProgress(0, 0)).toBe(0);
  });
});

describe("quiz scoring", () => {
  it("awards points only when the selected set exactly matches the answer key", () => {
    expect(gradeMultipleChoice(["b", "a"], ["a", "b", "b"], 5)).toBe(5);
    expect(gradeMultipleChoice(["a"], ["a", "b"], 5)).toBe(0);
    expect(gradeMultipleChoice(["a"], ["b"], 5)).toBe(0);
    expect(gradeMultipleChoice(["a"], ["a"], -1)).toBe(0);
  });
});

describe("revision schedule", () => {
  it("uses the suggested 1, 3, 7, 14 day intervals for strong quiz results", () => {
    const start = new Date("2026-01-01T12:00:00Z");
    const plan = buildRevisionPlan(start, 90);
    expect(plan.map(item => item.intervalDays)).toEqual([1, 3, 7, 14]);
    expect(plan[0].dueAt.toISOString()).toBe("2026-01-02T12:00:00.000Z");
  });
  it("raises revision priority and shortens intervals after a low score", () => {
    const plan = buildRevisionPlan(new Date("2026-01-01T00:00:00Z"), 40);
    expect(plan.map(item => item.intervalDays)).toEqual([1, 2, 3, 7]);
    expect(plan.every(item => item.priority === "HIGH")).toBe(true);
  });
});

describe("prerequisites and achievements", () => {
  it("requires every prerequisite course to be completed", () => {
    expect(hasCompletedPrerequisites(["html", "css"], ["html", "css", "js"])).toBe(true);
    expect(hasCompletedPrerequisites(["html", "css"], ["html"])).toBe(false);
  });
  it("returns milestone awards from measured activity", () => {
    expect(eligibleAchievementSlugs({ completedCourses: 1, streakDays: 7, perfectQuizzes: 1 })).toEqual(["first-course", "week-of-learning", "perfect-score"]);
    expect(eligibleAchievementSlugs({ completedCourses: 0, streakDays: 2, perfectQuizzes: 0 })).toEqual([]);
  });
});
