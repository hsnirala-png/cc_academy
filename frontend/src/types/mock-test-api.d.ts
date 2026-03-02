export type ExamType = "PSTET_1" | "PSTET_2";
export type StreamChoice = "SCIENCE_MATH" | "SOCIAL_STUDIES";
export type MockSubject =
  | "PUNJABI"
  | "ENGLISH"
  | "CHILD_PEDAGOGY"
  | "MATHS"
  | "EVS"
  | "MATHS_EVS"
  | "SCIENCE_MATH"
  | "SOCIAL_STUDIES";
export type MockOption = "A" | "B" | "C" | "D";
export type AttemptStatus = "IN_PROGRESS" | "SUBMITTED";

export interface MockTest {
  id: string;
  title: string;
  examType: ExamType;
  subject: MockSubject;
  streamChoice: StreamChoice | null;
  isActive: boolean;
  activeQuestions?: number;
  requiredQuestions?: number;
  createdAt: string;
  updatedAt: string;
  _count?: {
    questions: number;
    attempts?: number;
  };
}

export interface Attempt {
  id: string;
  userId: string;
  mockTestId: string;
  status: AttemptStatus;
  totalQuestions: number;
  correctCount: number | null;
  scorePercent: number | null;
  remarkText: string | null;
  startedAt: string;
  submittedAt: string | null;
  mockTest?: MockTest;
}

export interface AttemptQuestionDetail {
  orderIndex: number;
  questionId: string;
  questionText: string;
  questionTextAlt: string | null;
  optionA: string;
  optionAAlt: string | null;
  optionB: string;
  optionBAlt: string | null;
  optionC: string;
  optionCAlt: string | null;
  optionD: string;
  optionDAlt: string | null;
  selectedOption: MockOption | null;
  correctOption?: MockOption;
  explanation?: string | null;
  explanationAlt?: string | null;
}

export interface AttemptDetailResponse {
  attempt: Attempt & {
    questions: AttemptQuestionDetail[];
  };
}
