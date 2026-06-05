# CC Academy Development Rules & Product Roadmap

## 1. Core Product Identity

CC Academy must be developed as a professional EdTech platform, not as a basic AI-looking website.

The product identity is:

**CC Academy = Adaptive AI Teacher + Coaching + Tuition Marketplace Platform**

The platform should focus on:
- professional online coaching
- AI-based interactive teaching
- student learning improvement
- accurate answer explanation
- mock test learning
- human teacher marketplace
- safe commission and referral system
- trustworthy payments and student protection

Avoid cheap AI-generated visual style, unnecessary glowing cards, random gradients, buzzwords, or decorative AI features that do not improve learning.

## 2. Strict Change Control Rule

Never touch unrelated working functions.

When implementing any task:
- Change only the files required for the requested task.
- Do not refactor unrelated modules.
- Do not improve unrelated UI unless asked.
- Do not modify payment logic unless the task is payment-related.
- Do not modify authentication unless the task is auth-related.
- Do not modify teacher hub unless the task is teacher-hub-related.
- Do not modify AI teacher logic unless the task is AI-teacher-related.
- Do not modify mock tests unless the task is mock-test-related.
- Do not modify referral/wallet unless the task is referral-related.
- Do not modify database schema unless the task explicitly asks for schema/database change.
- Do not add new packages unless absolutely required and approved.
- Do not remove existing features without explicit instruction.
- Do not rename public routes/pages unless explicitly asked.

Before coding, always identify:
1. Requested feature/fix
2. Files that need change
3. Files that must not be touched
4. Risk to existing features
5. Testing checklist

## 3. No Misleading Development Rule

Do not expand the project randomly.

All new ideas must fit into the approved phase-wise roadmap.  
If a requested idea does not fit the roadmap, first explain where it should fit before coding.

Approved roadmap order:

1. Phase 1: Professional UI + trust pages
2. Phase 2: Secure enrollment + payment hardening
3. Phase 3: PSTET AI Teacher MVP
4. Phase 3A: AI Teacher Growth Engine
5. Phase 4: Mock test + AI explanation + weakness tracking
6. Phase 5: Admin AI teacher management
7. Phase 6: Human teacher registration + approval
8. Phase 7: Student-teacher booking system
9. Phase 7A: Teacher rating, review & quality analytics
10. Phase 8: Payment, commission, payout, referral wallet
11. Phase 9: Multi-exam expansion
12. Phase 10: Voice/whiteboard/advanced AI classroom

## 4. Phase 1: Professional UI + Trust Pages

Goal:
Make CC Academy look and feel like a serious EdTech brand.

Required:
- Fix spelling inconsistencies like CC Acadeemy / CC Academy.
- Fix broken characters/mojibake.
- Clean header/navigation.
- Improve hero section.
- Improve mobile view.
- Add or polish trust pages:
  - About
  - Contact
  - Privacy Policy
  - Terms and Conditions
  - Refund Policy
  - FAQs
  - Demo Class
  - Student Safety
  - Teacher Agreement

Do not break existing routes or student/admin flows.

## 5. Phase 2: Secure Enrollment + Payment Hardening

Goal:
Make student enrollment and payment safe before paid scaling.

Rules:
- Never trust client-supplied amount.
- Product/course price must be calculated server-side.
- Access must be granted only after verified successful payment.
- Failed payment must not grant access.
- Duplicate payment/webhook must not duplicate access or referral reward.
- Checkout must show legal/refund links.
- Dashboard must clearly show purchased/active courses.

Do not modify AI teacher, teacher marketplace, or mock-test logic unless explicitly required.

## 6. Phase 3: PSTET AI Teacher MVP

Goal:
Launch focused PSTET/CC Academy AI Teacher first.

Required:
- AI teacher selection.
- Punjabi/Hindi/English/bilingual teaching.
- Correct answer explanation.
- Wrong option explanation.
- Simple examples.
- Exam-focused points.
- Mini quiz.
- Doubt solving.
- Course/syllabus-based explanation.

Do not expand to UPSC/JEE/NEET before PSTET AI Teacher is stable.

## 7. Phase 3A: AI Teacher Growth Engine

This is a core requirement, not an optional future idea.

Goal:
Make AI teachers smarter, more accurate, and more student-focused over time without unsafe self-learning.

Core principle:
Before any model training or direct self-learning, build:
- student memory
- topic mastery
- source-grounded answers
- student feedback
- admin review system
- AI teacher quality analytics

Required features:
- Student learning profile.
- Student preference memory:
  - language preference
  - teaching speed
  - teaching style
  - weak subjects
  - weak topics
  - repeated mistakes
  - favorite AI teacher
- Topic-wise mastery tracking.
- Source-grounded answers based on:
  - lessons
  - syllabus
  - transcripts
  - notes
  - question bank
  - admin-approved explanations
- AI must not confidently answer unsupported course-bound questions.
- If verified source is missing, AI should clearly say that verification is required.
- Feedback buttons after AI answer:
  - Helpful
  - Not clear
  - Wrong answer
  - Too long
  - Too short
  - Explain with example
  - Explain in Punjabi/Hindi/English
  - Ask me MCQ
- Admin review queue for wrong/unclear/risky AI answers.
- AI teacher performance dashboard:
  - helpful percentage
  - wrong answer reports
  - average response time
  - subject-wise performance
  - prompt version
  - model/provider
  - risk flags

Safe improvement workflow:
AI teachers should improve through:
- reviewed feedback
- prompt versioning
- improved source content
- admin-approved corrections
- quality analytics

AI teachers must not directly learn unverified facts from student conversations.

Likely models:
- StudentLearningProfile
- StudentTopicMastery
- StudentPreferenceMemory
- AiTeacherProfile
- AiPromptVersion
- AiTutorSession
- AiTutorMessage
- AiAnswerFeedback
- AiExplanationSource
- AiTeacherQualityReview
- AiTeacherUsageStats
- AiRevisionPlan

Testing:
- AI adapts to student memory.
- AI updates topic mastery correctly.
- AI remains source-grounded.
- Unsupported answer is refused or marked for verification.
- Student feedback is saved.
- Wrong answer report appears in admin review.
- Admin can improve prompt/source safely.

## 8. Phase 4: Mock Test + AI Explanation + Weakness Tracking

Goal:
Turn mock tests into a learning engine.

Required:
- Explanation for every question.
- Explanation of why correct answer is correct.
- Explanation of why other options are wrong.
- Topic-wise weakness detection.
- Personal revision suggestions.
- Mistake pattern tracking.
- AI explanation must use stored question/explanation/course context.

Do not change scoring logic unless explicitly asked.

## 9. Phase 5: Admin AI Teacher Management

Goal:
Give admin control over AI teachers and quality.

Required:
- AI teacher profile CRUD.
- Prompt versioning.
- Publish/draft prompt workflow.
- Enable/disable AI teacher.
- Model/provider settings.
- Usage/cost dashboard.
- Answer review queue.
- Safety/risk flags.

Prompt changes must be versioned and reversible.

## 10. Phase 6: Human Teacher Registration + Approval

Goal:
Controlled teacher onboarding.

Required:
- Teacher registration/profile.
- Qualification and experience.
- Subject/exam/class/language selection.
- KYC/document verification.
- Admin approval/rejection.
- Teacher agreement acceptance.
- Teacher status controls.

Do not open public marketplace before approval and safety flows are ready.

## 11. Phase 7: Student-Teacher Booking System

Goal:
Allow students to find and book teachers safely.

Required:
- Teacher marketplace search.
- Teacher profile.
- Availability calendar.
- Demo class booking.
- Live class schedule.
- Class cancellation/reschedule rules.
- Student-teacher communication rules.
- Complaint/refund path.

## 12. Phase 7A: Teacher Rating, Review & Quality Analytics

Goal:
Allow students to rate human teachers and AI teachers professionally.

Human teacher rating aspects:
1. Teaching clarity
2. Content quality
3. Student understanding
4. Answer accuracy
5. Response time
6. Doubt solving quality
7. Examples and explanation method
8. Language comfort
9. Patience and professional behavior
10. Punctuality
11. Homework/revision support
12. Value for money

Rules:
- Only enrolled/paid/eligible students can rate.
- Rating allowed after class/session/course cycle.
- Duplicate reviews must be prevented.
- Written reviews should be moderated.
- Teacher may reply professionally.
- Admin can hide abusive/fake reviews.
- Low-rated teachers should appear in admin alerts.
- Rating may influence marketplace ranking after enough valid reviews.

AI teacher rating aspects:
- explanation clarity
- answer accuracy
- response speed
- language quality
- style fit
- usefulness
- wrong-answer reports

Likely models:
- TeacherReview
- TeacherReviewAspectScore
- TeacherReviewReply
- TeacherReviewModeration
- TeacherPerformanceStats
- TeacherResponseTimeMetric
- StudentTeacherSessionFeedback
- AiTeacherReview
- AiTeacherReviewAspectScore
- AiTeacherPerformanceStats

Testing:
- Only eligible students can rate.
- Aspect-wise rating is saved.
- Average rating is correct.
- Admin can moderate reviews.
- Teacher can reply without editing student rating.
- Low-rated teachers appear in admin alerts.
- AI teacher feedback appears in AI quality dashboard.

## 13. Phase 8: Payment, Commission, Payout, Referral Wallet

Goal:
Make all money flows auditable and compliant.

Rules:
- Referral must remain simple and single-level.
- Do not create MLM or chain-income system.
- Referral reward only after successful paid purchase.
- Refund should reverse referral/commission where applicable.
- Teacher payout must be ledger-based.
- Platform commission must be transparent.
- Admin must see payment/referral/payout reports.
- Fraud checks must be added.

Required:
- payment order lifecycle
- webhook verification
- wallet ledger
- teacher payout ledger
- refund adjustment
- invoice/GST planning
- anti-fraud controls

## 14. Phase 9: Multi-Exam Expansion

Goal:
Expand only after PSTET and core platform are stable.

Possible categories:
- UPSC
- JEE Main/Advanced
- NEET
- Board exams
- State exams
- National exams
- Skill courses

Rules:
- Do not add too many exams at once.
- Add exam taxonomy first.
- Add syllabus/topic structure.
- Add exam-specific mock patterns.
- Add exam-specific AI prompt/source rules.

## 15. Phase 10: Voice, Whiteboard, Advanced AI Classroom

Goal:
Build premium interactive AI classroom after core flows are stable.

Required:
- voice teaching
- student speech input
- whiteboard explanation
- transcript sync
- session recording/transcript
- cost controls
- fallback if voice fails
- mobile-friendly classroom layout

Do not start this before text-based AI teacher, payment, mock test, and student dashboard are stable.

## 16. Payment Safety Rules

Payment is high-risk. Follow strictly:
- Never create Razorpay order using raw client amount for real purchase.
- Always compute price on backend.
- Verify payment signature.
- Prefer webhook with idempotency.
- Grant access once only.
- Log payment events.
- Failed/cancelled payment must not grant access.
- Refund must adjust access, referral, commission, and payout.

## 17. AI Accuracy Rules

AI must be accurate and source-grounded.

Rules:
- Course-bound AI answers should use course content, syllabus, transcript, question bank, or approved explanation.
- AI should not invent facts.
- AI should explain uncertainty.
- AI should not give unsupported exam-final claims.
- Wrong answer feedback must go to review queue.
- Prompt updates must be versioned.
- Student personalization must not override factual correctness.
- Student conversations must not become direct training data without review.

## 18. Referral Compliance Rules

Referral must remain simple:
- single-level only
- no MLM
- no chain income
- no guaranteed earning claims
- no misleading income promise
- reward only on valid paid enrollment
- refund reversal required
- admin fraud rejection allowed

## 19. Teacher Marketplace Safety Rules

Before public teacher marketplace:
- teacher approval required
- KYC/qualification required
- teacher agreement required
- student safety rules required
- complaint/refund flow required
- payout ledger required
- rating/review moderation required

## 20. Development Workflow

For every future coding task, first provide:
1. Understanding of requested change
2. Phase mapping
3. Files to be changed
4. Files not to be touched
5. Database impact
6. Risk level
7. Test plan

Then implement only approved/requested scope.

After coding, provide:
1. Summary of changed files
2. What was changed
3. What was not touched
4. How to test
5. Any risks or next required step

## 21. Absolute Prohibition

Unless explicitly requested, do not:
- rewrite the full project
- replace the tech stack
- redesign all pages at once
- change database schema
- change payment logic
- change authentication
- delete old features
- rename routes
- remove admin features
- remove student features
- touch unrelated modules
- create MLM referral logic
- make unsupported AI claims
- open teacher marketplace publicly without safety controls

Final instruction:
This SKILL.md file must guide all future CC Academy development. Every new feature or fix should follow this roadmap, strict change-control rule, payment safety rules, AI accuracy rules, and teacher marketplace safety rules.
