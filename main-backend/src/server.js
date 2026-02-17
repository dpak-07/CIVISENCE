require("dotenv").config();

const path = require("path");
const express = require("express");
const cors = require("cors");

const config = require("./config");
const { connectDb } = require("./db");
const { seedDepartments } = require("./utils/seed");
const { waitForAiReady } = require("./aiClient");
const { startAiServiceIfNeeded, stopAiService, isTrue } = require("./aiProcess");

const authRoutes = require("./routes/authRoutes");
const issuesRoutes = require("./routes/issuesRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");
const reportRoutes = require("./routes/reportRoutes");

const app = express();
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cors({ origin: config.allowedOrigins, credentials: true }));

app.use("/uploads", express.static(path.resolve(__dirname, "../uploads")));

app.get("/", (_req, res) => {
  res.json({ service: "main-backend", status: "operational", ai_service_url: process.env.AI_SERVICE_URL || "http://127.0.0.1:8001" });
});

app.get("/health", (_req, res) => {
  res.json({ service: "main-backend", status: "healthy" });
});

app.use("/api/auth", authRoutes);
app.use("/api/issues", issuesRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api", reportRoutes);

app.use((err, _req, res, _next) => {
  const statusCode = err.status || 500;
  res.status(statusCode).json({ detail: err.message || "Internal server error" });
});

async function bootstrap() {
  await connectDb();
  await seedDepartments();

  startAiServiceIfNeeded();

  const shouldWait = isTrue(process.env.WAIT_FOR_AI_ON_STARTUP, true);
  if (shouldWait) {
    const timeoutMs = Number(process.env.AI_STARTUP_TIMEOUT_MS || 120000);
    const ready = await waitForAiReady(timeoutMs);
    if (!ready) {
      console.warn(`[main-backend] AI service was not ready within ${timeoutMs}ms`);
    } else {
      console.log("[main-backend] AI service is healthy");
    }
  }

  app.listen(config.port, () => {
    console.log(`[main-backend] listening on http://127.0.0.1:${config.port}`);
  });
}

bootstrap().catch((error) => {
  console.error("[main-backend] bootstrap failed", error);
  process.exit(1);
});

function handleExit(signal) {
  console.log(`[main-backend] received ${signal}, shutting down...`);
  stopAiService();
  process.exit(0);
}

process.on("SIGINT", () => handleExit("SIGINT"));
process.on("SIGTERM", () => handleExit("SIGTERM"));
