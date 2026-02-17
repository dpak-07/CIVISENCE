const path = require("path");
const fs = require("fs");
const { spawn, spawnSync } = require("child_process");

let aiProcess = null;

function isTrue(value, defaultValue = false) {
  if (value === undefined || value === null || value === "") {
    return defaultValue;
  }
  return String(value).toLowerCase() === "true";
}

function hasUvicorn(pythonExe, cwd) {
  try {
    const probe = spawnSync(
      pythonExe,
      ["-c", "import uvicorn; print('ok')"],
      { cwd, stdio: "pipe", shell: false }
    );
    return probe.status === 0;
  } catch (_err) {
    return false;
  }
}

function resolvePythonExecutable(aiDir) {
  if (process.env.AI_PYTHON_EXE) {
    return process.env.AI_PYTHON_EXE;
  }

  const candidates = [];

  if (process.env.CONDA_PREFIX) {
    candidates.push(path.join(process.env.CONDA_PREFIX, "python.exe"));
    candidates.push(path.join(process.env.CONDA_PREFIX, "bin", "python"));
  }

  // Project owner's common conda env path on Windows.
  const userProfile = process.env.USERPROFILE || "";
  if (userProfile) {
    candidates.push(path.join(userProfile, "anaconda3", "envs", "civisense", "python.exe"));
    candidates.push(path.join(userProfile, "miniconda3", "envs", "civisense", "python.exe"));
  }

  candidates.push("python");
  candidates.push("py");

  for (const candidate of candidates) {
    if (candidate.endsWith(".exe") && !fs.existsSync(candidate)) {
      continue;
    }
    if (hasUvicorn(candidate, aiDir)) {
      return candidate;
    }
  }

  return process.env.AI_PYTHON_EXE || "python";
}

function startAiServiceIfNeeded() {
  const shouldStart = isTrue(process.env.START_AI_SERVICE, true);
  if (!shouldStart) {
    return null;
  }

  const aiHost = process.env.AI_HOST || "127.0.0.1";
  const aiPort = process.env.AI_PORT || "8001";
  const aiDir = path.resolve(__dirname, process.env.AI_SERVICE_DIR || "../../ai_service");
  const pythonExe = resolvePythonExecutable(aiDir);

  const args = [
    "-m",
    "uvicorn",
    "main:app",
    "--host",
    aiHost,
    "--port",
    String(aiPort),
  ];

  aiProcess = spawn(pythonExe, args, {
    cwd: aiDir,
    env: { ...process.env },
    stdio: ["ignore", "pipe", "pipe"],
    shell: false,
  });

  aiProcess.stdout.on("data", (chunk) => {
    process.stdout.write(`[ai-service] ${chunk}`);
  });

  aiProcess.stderr.on("data", (chunk) => {
    process.stderr.write(`[ai-service] ${chunk}`);
  });

  aiProcess.on("exit", (code, signal) => {
    console.log(`[ai-service] exited code=${code} signal=${signal}`);
    if (code !== 0) {
      console.log("[main-backend] Hint: set AI_PYTHON_EXE in main-backend/.env to a python with uvicorn installed.");
    }
    aiProcess = null;
  });

  console.log(`[main-backend] started AI service: ${pythonExe} ${args.join(" ")}`);
  return aiProcess;
}

function stopAiService() {
  if (aiProcess && !aiProcess.killed) {
    aiProcess.kill("SIGTERM");
  }
}

module.exports = {
  startAiServiceIfNeeded,
  stopAiService,
  isTrue,
};
