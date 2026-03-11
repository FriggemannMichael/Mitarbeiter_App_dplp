#!/usr/bin/env node

import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";

function fail(message, code = 1) {
  console.error(`ERROR: ${message}`);
  process.exit(code);
}

const customerIdRaw = process.argv[2];
if (!customerIdRaw) {
  fail("Usage: npm run build:customer -- <customer-id>");
}

const customerId = customerIdRaw.trim().toLowerCase();
const companyCode = `CUSTOMER-${customerId}`.toUpperCase();
const envFilePath = path.resolve(`.env.customer-${customerId}`);
const fileEnv = {};

if (fs.existsSync(envFilePath)) {
  const lines = fs.readFileSync(envFilePath, "utf-8").split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separator = line.indexOf("=");
    if (separator <= 0) continue;
    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim();
    fileEnv[key] = value;
  }
}

const env = {
  ...process.env,
  ...fileEnv,
  VITE_CONFIG_PATH: fileEnv["VITE_CONFIG_PATH"] || `customers/${customerId}/config.json`,
  VITE_COMPANY_CODE: fileEnv["VITE_COMPANY_CODE"] || companyCode,
  VITE_EXPECTED_CODE: fileEnv["VITE_EXPECTED_CODE"] || companyCode,
  BUILD_OUT_DIR: `dist-${customerId}`,
};

const npmExecPath = process.env.npm_execpath;
const isNpmScriptContext = typeof npmExecPath === "string" && npmExecPath.length > 0;
const command = isNpmScriptContext ? process.execPath : process.platform === "win32" ? "npm.cmd" : "npm";
const args = isNpmScriptContext ? [npmExecPath, "run", "build"] : ["run", "build"];

const result = spawnSync(command, args, { stdio: "inherit", env });

if (result.error) {
  fail(`Customer build failed: ${result.error.message}`);
}

if (result.status !== 0) {
  fail("Customer build failed.", result.status ?? 1);
}

console.log(`Build complete: dist-${customerId}`);
