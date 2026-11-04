import { PrismaClient, Role, Difficulty, LessonType } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();
const demoPassword = process.env.DEMO_PASSWORD;
const courseSpecs = [
  ["Design systems that scale", "design-systems-scale", "Thoughtful UI foundations for growing products.", "design", Difficulty.INTERMEDIATE],
  ["Build with modern React", "modern-react", "Build confident interfaces with reusable components.", "development", Difficulty.INTERMEDIATE],
  ["The strategic product manager", "strategic-product-manager", "Move from feature requests to product outcomes.", "business", Difficulty.BEGINNER],
  ["Writing for the web", "writing-for-web", "Make every word clearer, kinder and more useful.", "communication", Difficulty.BEGINNER],
  ["Data stories with Python", "data-stories-python", "Find the signal and share it with a compelling story.", "development", Difficulty.ADVANCED],
  ["Brand thinking for founders", "brand-thinking-founders", "Build a brand people can recognize and trust.", "design", Difficulty.BEGINNER],
  ["Product analytics, made practical", "practical-product-analytics", "Choose useful metrics and learn what they mean.", "business", Difficulty.INTERMEDIATE],
  ["Accessible interface essentials", "accessible-interface-essentials", "Create digital experiences more people can use.", "design", Difficulty.INTERMEDIATE],
] as const;

async function main() {
  if (!demoPassword) throw new Error("Set DEMO_PASSWORD before seeding demo accounts.");
  const passwordHash = await hash(demoPassword, 12);
  const admin = await prisma.user.upsert({ where: { email: "admin@edutrack.demo" }, update: {}, create: { name: "EduTrack Admin", email: "admin@edutrack.demo", passwordHash, role: Role.ADMIN } });
  const instructors = await Promise.all(Array.from({ length: 3 }, async (_, i) => {
    const user = await prisma.user.upsert({ where: { email: `instructor${i + 1}@edutrack.demo` }, update: {}, create: { name: ["Maya Chen", "Daniel Foster", "Aisha Patel"][i], email: `instructor${i + 1}@edutrack.demo`, passwordHash, role: Role.INSTRUCTOR, instructorProfile: { create: { headline: ["Product designer", "Software engineer", "Product strategist"][i], bio: "Demo instructor profile for EduTrack sample content." } } } });
    await prisma.instructorProfile.upsert({ where: { userId: user.id }, update: {}, create: { userId: user.id } });
    return user;
  }));
  const students = await Promise.all(Array.from({ length: 10 }, async (_, i) => {
    const user = await prisma.user.upsert({ where: { email: `student${i + 1}@edutrack.demo` }, update: {}, create: { name: ["Jordan Lee", "Sofia Rivera", "Noah Kim", "Amara Singh", "Ethan Brooks", "Leila Hassan", "Leo Garcia", "Priya Nair", "Mila Santos", "Sam Wilson"][i], email: `student${i + 1}@edutrack.demo`, passwordHash, role: Role.STUDENT, studentProfile: { create: { weeklyGoalMinutes: 300 } } } });
    await prisma.studentProfile.upsert({ where: { userId: user.id }, update: {}, create: { userId: user.id } });
    return user;
  }));
  const categoryNames = ["Design", "Development", "Business", "Communication"];
  const categories = await Promise.all(categoryNames.map(name => prisma.courseCategory.upsert({ where: { slug: name.toLowerCase() }, update: {}, create: { name, slug: name.toLowerCase(), description: `${name} courses from working practitioners.` } })));
  const categoryBySlug = new Map(categories.map(category => [category.slug, category]));
  for (const [i, [title, slug, subtitle, categorySlug, difficulty]] of courseSpecs.entries()) {
    await prisma.course.upsert({ where: { slug }, update: {}, create: {
      title, slug, subtitle, description: `${subtitle}\n\nThis demonstration course combines clear explanations, useful examples and practical exercises you can apply to your own work.`,
      categoryId: categoryBySlug.get(categorySlug)!.id, instructorId: instructors[i % instructors.length].id, difficulty,
      price: i % 3 === 0 ? 0 : 2400 + i * 300, status: "PUBLISHED", publishedAt: new Date(), language: "English",
      sections: { create: [
        { title: "Start with the foundations", position: 0, lessons: { create: [{ title: `Welcome to ${title}`, type: LessonType.TEXT, textContent: "A short introduction to the course and the outcomes you will work toward.", durationSeconds: 300, position: 0, isPreview: true }, { title: "The essential concepts", type: LessonType.VIDEO, videoUrl: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4", durationSeconds: 720, position: 1 }] } },
        { title: "Put it into practice", position: 1, lessons: { create: [{ title: "A guided exercise", type: LessonType.TEXT, textContent: "Apply the ideas from this section to a small, practical example.", durationSeconds: 600, position: 0 }, { title: "Review and next steps", type: LessonType.VIDEO, videoUrl: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4", durationSeconds: 540, position: 1 }] } },
      ] },
      assignments: { create: { title: "A project for your portfolio", instructions: "Describe a small project that applies one idea from this course. Explain your decisions and what you would improve next.", maxPoints: 100 } },
      quizzes: { create: { title: "Check your understanding", timeLimitMinutes: 10, maxAttempts: 3, passingScore: 70, published: true, questions: { create: { prompt: "What is a useful first step when learning a new skill?", type: "MULTIPLE_CHOICE", points: 1, position: 0, options: { create: [{ text: "Choose one clear learning goal", isCorrect: true, position: 0 }, { text: "Try to learn everything at once", isCorrect: false, position: 1 }] } } } } },
    } });
  }
  const courses = await prisma.course.findMany({ where: { status: "PUBLISHED" }, orderBy: { slug: "asc" }, take: 8, select: { id: true } });
  for (const [i, student] of students.entries()) {
    for (const course of courses.slice(0, 2 + i % 3)) await prisma.enrollment.upsert({ where: { userId_courseId: { userId: student.id, courseId: course.id } }, update: {}, create: { userId: student.id, courseId: course.id } });
    const existingStudy = await prisma.studySession.count({ where: { userId: student.id } });
    if (!existingStudy) await prisma.studySession.create({ data: { userId: student.id, startedAt: new Date(Date.now() - (i + 1) * 86_400_000), endedAt: new Date(Date.now() - (i + 1) * 86_400_000 + 45 * 60_000), durationMinutes: 45 + i * 5 } });
  }
  const achievements = [["first-course", "First steps", "Complete your first course."], ["week-of-learning", "A week of learning", "Study on seven different days."], ["perfect-score", "Perfect score", "Earn every point on a quiz."]] as const;
  for (const [slug, name, description] of achievements) await prisma.achievement.upsert({ where: { slug }, update: {}, create: { slug, name, description, points: 25 } });
  await prisma.auditLog.create({ data: { actorId: admin.id, action: "DEMO_SEED", entityType: "PLATFORM", details: { note: "Demo content seeded for local development." } } });
  console.log("EduTrack demo data is ready. All accounts use the configured demo password.");
}

main().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => prisma.$disconnect());
