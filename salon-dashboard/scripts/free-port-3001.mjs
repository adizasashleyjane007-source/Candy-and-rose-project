import { execSync } from "node:child_process";
import path from "node:path";

const PORT = 3001;
const PROJECT_DIR = path.resolve(process.cwd()).toLowerCase();

function getListeningPidsWindows(port) {
  try {
    const out = execSync(`netstat -ano -p tcp`, { encoding: "utf8" });
    const pids = new Set();
    for (const line of out.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("TCP")) continue;
      const parts = trimmed.split(/\s+/);
      if (parts.length >= 5) {
        const localAddr = parts[1] || "";
        const state = parts[3] || "";
        const pid = Number(parts[4]);
        if (
          state === "LISTENING" &&
          localAddr.endsWith(`:${port}`) &&
          Number.isInteger(pid) &&
          pid > 0 &&
          pid !== process.pid
        ) {
          pids.add(pid);
        }
      }
    }
    return [...pids];
  } catch {
    return [];
  }
}

function getCommandLineWindows(pid) {
  try {
    return execSync(
      `powershell -NoProfile -Command "(Get-CimInstance Win32_Process -Filter 'ProcessId = ${pid}').CommandLine"`,
      { encoding: "utf8" }
    ).trim();
  } catch {
    return "";
  }
}

function isSalonDashboardProcess(cmdLine) {
  const lower = (cmdLine || "").toLowerCase();
  if (!lower) return false;
  return (
    lower.includes("salon-dashboard") ||
    lower.includes(PROJECT_DIR)
  );
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  if (process.platform !== "win32") {
    return;
  }

  const pids = getListeningPidsWindows(PORT);
  if (pids.length === 0) {
    return;
  }

  for (const pid of pids) {
    const cmdLine = getCommandLineWindows(pid);
    if (!isSalonDashboardProcess(cmdLine)) {
      console.error(
        `Port ${PORT} is currently in use by an unrelated process (PID ${pid}: ${cmdLine || "unknown"}).`
      );
      console.error(
        `Please stop that application manually so salon-dashboard can run on port ${PORT}.`
      );
      process.exit(1);
    }

    console.log(
      `Stopping previous salon-dashboard dev server on port ${PORT} (PID ${pid})...`
    );
    try {
      execSync(`taskkill /PID ${pid} /T /F`, { stdio: "ignore" });
    } catch {
      // Process may have already exited
    }
  }

  // Wait briefly for port release
  for (let i = 0; i < 15; i++) {
    if (getListeningPidsWindows(PORT).length === 0) {
      return;
    }
    await sleep(200);
  }
}

main();

