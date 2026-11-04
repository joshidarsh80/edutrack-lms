import { spawn } from "node:child_process";

process.env.EDUTRACK_PREVIEW = "1";
const next = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "--webpack", "--hostname", "127.0.0.1", "--port", "3002"], { stdio: "inherit" });
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => next.kill(signal));
next.on("exit", code => { process.exitCode = code ?? 1; });
