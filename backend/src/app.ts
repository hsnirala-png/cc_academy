import cors from "cors";
import express from "express";
import path from "path";
import { adminRouter } from "./routes/admin.routes";
import { adminLessonsRouter } from "./routes/admin.lessons.routes";
import { adminMockTestsRouter } from "./routes/admin.mock-tests.routes";
import { adminProductsRouter } from "./routes/admin.products.routes";
import { adminReferralsRouter } from "./routes/admin.referrals.routes";
import { adminSlidersRouter } from "./routes/admin.sliders.routes";
import { authRouter } from "./routes/auth.routes";
import { healthRouter } from "./routes/health.routes";
import { lessonsRouter } from "./routes/lessons.routes";
import { meRouter } from "./routes/me.routes";
import { paymentRouter } from "./routes/payment.routes";
import { productsRouter } from "./routes/products.routes";
import { referralsRouter } from "./routes/referrals.routes";
import { slidersRouter } from "./routes/sliders.routes";
import { studentMockTestsRouter } from "./routes/student.mock-tests.routes";
import { errorHandler, notFoundHandler } from "./middlewares/errorHandler";

const app = express();
app.use(express.static(path.join(process.cwd(), "public")));
app.use("/public", express.static(path.join(process.cwd(), "public")));

app.use(cors());
app.use(express.json({ limit: "25mb" }));

app.use("/health", healthRouter);
app.use("/auth", authRouter);
app.use("/me", meRouter);
app.use("/admin", adminRouter);
app.use("/admin", adminLessonsRouter);
app.use("/admin", adminMockTestsRouter);
app.use("/admin", adminProductsRouter);
app.use("/admin", adminReferralsRouter);
app.use("/admin", adminSlidersRouter);
app.use("/api/admin", adminLessonsRouter);
app.use("/api/admin", adminReferralsRouter);
app.use("/api/admin", adminSlidersRouter);
app.use("/student", studentMockTestsRouter);
app.use("/products", productsRouter);
app.use("/api/payment", paymentRouter);
app.use("/api", referralsRouter);
app.use("/api", lessonsRouter);
app.use("/api", slidersRouter);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
