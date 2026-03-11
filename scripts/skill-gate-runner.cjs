const { spawnSync } = require("node:child_process");
const path = require("node:path");

const scriptPath = path.join(__dirname, "skill-gate.ps1");
const forwardedArgs = process.argv.slice(2);

const result = spawnSync(
  "powershell",
  ["-ExecutionPolicy", "Bypass", "-File", scriptPath, ...forwardedArgs],
  { stdio: "inherit" },
);

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);
