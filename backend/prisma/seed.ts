import "../src/config/loadEnv";
import { ExamType, MockOption, MockSubject, Role } from "@prisma/client";
import bcrypt from "bcrypt";
import { prisma } from "../src/utils/prisma";

const buildQuestionSeed = (label: string, index: number) => {
  const optionSequence: MockOption[] = [
    MockOption.A,
    MockOption.B,
    MockOption.C,
    MockOption.D,
  ];

  return {
    questionText: `${label} Question ${index}`,
    optionA: `${label} ${index} - Option A`,
    optionB: `${label} ${index} - Option B`,
    optionC: `${label} ${index} - Option C`,
    optionD: `${label} ${index} - Option D`,
    correctOption: optionSequence[(index - 1) % optionSequence.length],
    explanation: `Explanation for ${label} question ${index}`,
    isActive: true,
  };
};

const ensureMockTestWithQuestions = async (params: {
  title: string;
  examType: ExamType;
  subject: MockSubject;
  requiredQuestions: number;
  createdBy: string;
}) => {
  let mockTest = await prisma.mockTest.findFirst({
    where: {
      title: params.title,
      examType: params.examType,
      subject: params.subject,
      streamChoice: null,
    },
  });

  if (!mockTest) {
    mockTest = await prisma.mockTest.create({
      data: {
        title: params.title,
        examType: params.examType,
        subject: params.subject,
        streamChoice: null,
        createdBy: params.createdBy,
        isActive: true,
      },
    });
  }

  const currentCount = await prisma.question.count({
    where: { mockTestId: mockTest.id },
  });

  if (currentCount >= params.requiredQuestions) {
    console.log(
      `${params.title} already has ${currentCount} questions. Seed skipped for questions.`
    );
    return mockTest;
  }

  const pending = params.requiredQuestions - currentCount;
  const start = currentCount + 1;
  const data = Array.from({ length: pending }, (_, index) =>
    buildQuestionSeed(params.title, start + index)
  ).map((question) => ({
    ...question,
    mockTestId: mockTest.id,
  }));

  await prisma.question.createMany({ data });
  console.log(`Seeded ${pending} questions for ${params.title}.`);
  return mockTest;
};

const ensureDemoLessonData = async (params: {
  assessmentTestId: string;
}) => {
  const courseId = "course_pstet_demo";
  const chapterId = "chapter_pstet_demo_1";
  const lessonId = "lesson_pstet_demo_1";

  await prisma.course.upsert({
    where: { id: courseId },
    update: {
      title: "PSTET Digital Course (Demo)",
      description: "Demo digital course for lesson player + progress tracking.",
      isActive: true,
    },
    create: {
      id: courseId,
      title: "PSTET Digital Course (Demo)",
      description: "Demo digital course for lesson player + progress tracking.",
      isActive: true,
    },
  });

  await prisma.chapter.upsert({
    where: { id: chapterId },
    update: {
      courseId,
      title: "Chapter 1: Learning Foundations",
      description: "Introduction chapter for lesson progress and assessment unlock.",
      orderIndex: 1,
    },
    create: {
      id: chapterId,
      courseId,
      title: "Chapter 1: Learning Foundations",
      description: "Introduction chapter for lesson progress and assessment unlock.",
      orderIndex: 1,
    },
  });

  await prisma.lesson.upsert({
    where: { id: lessonId },
    update: {
      chapterId,
      title: "Lesson 1: Child Development Basics",
      orderIndex: 1,
      videoUrl: "https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
      transcriptUrl: "/public/transcripts/pstet-demo-lesson-1.json",
      durationSec: 596,
      assessmentTestId: params.assessmentTestId,
    },
    create: {
      id: lessonId,
      chapterId,
      title: "Lesson 1: Child Development Basics",
      orderIndex: 1,
      videoUrl: "https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
      transcriptUrl: "/public/transcripts/pstet-demo-lesson-1.json",
      durationSec: 596,
      assessmentTestId: params.assessmentTestId,
    },
  });

  console.log("Demo lesson data is ready.");
};

const run = async (): Promise<void> => {
  const adminMobile = "9999999999";
  const adminEmail = "admin@ccacademy.com";
  const adminPassword = "Admin@12345";

  let admin = await prisma.user.findFirst({
    where: {
      OR: [{ mobile: adminMobile }, { email: adminEmail }],
    },
  });

  if (!admin) {
    const passwordHash = await bcrypt.hash(adminPassword, 10);

    admin = await prisma.user.create({
      data: {
        name: "CC Academy Admin",
        mobile: adminMobile,
        email: adminEmail,
        state: "Delhi",
        city: "New Delhi",
        passwordHash,
        role: Role.ADMIN,
      },
    });

    console.log("Admin user seeded successfully.");
  } else {
    console.log("Admin already exists.");
  }

  const punjabiTest = await ensureMockTestWithQuestions({
    title: "PSTET-1 Punjabi Mock Test",
    examType: ExamType.PSTET_1,
    subject: MockSubject.PUNJABI,
    requiredQuestions: 30,
    createdBy: admin.id,
  });

  await ensureMockTestWithQuestions({
    title: "PSTET-1 Maths/EVS Mock Test",
    examType: ExamType.PSTET_1,
    subject: MockSubject.MATHS_EVS,
    requiredQuestions: 60,
    createdBy: admin.id,
  });

  await ensureDemoLessonData({
    assessmentTestId: punjabiTest.id,
  });
};

run()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
