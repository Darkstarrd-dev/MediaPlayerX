import { execSync } from "node:child_process";

const IGNORED_ADVISORIES = new Set([
  // esbuild 0.28.x — 唯一修复路径是 vite@8（改用 rolldown 替代 esbuild），属破坏性变更
  // GHSA-gv7w-rqvm-qjhr: Missing binary integrity verification in Deno module (仅影响 Deno)
  // GHSA-g7r4-m6w7-qqqr: Arbitrary file read when running the development server on Windows
  "https://github.com/advisories/GHSA-gv7w-rqvm-qjhr",
  "https://github.com/advisories/GHSA-g7r4-m6w7-qqqr",
]);

let stdout;
try {
  stdout = execSync("npm audit --json --audit-level=high", {
    encoding: "utf8",
    maxBuffer: 1024 * 1024,
  });
} catch (e) {
  stdout = e.stdout || "";
  if (!stdout) {
    console.error(e.message || String(e));
    process.exit(1);
  }
}

if (!stdout.trim()) {
  process.exit(0);
}

let data;
try {
  data = JSON.parse(stdout);
} catch {
  console.error("npm audit 输出解析失败");
  process.exit(1);
}

const vulnerabilities = data.vulnerabilities || {};

function resolveVia(viaEntry, allVulns) {
  if (typeof viaEntry === "string") {
    const child = allVulns[viaEntry];
    return child ? child.via || [] : [];
  }
  if (viaEntry && typeof viaEntry === "object") {
    return [viaEntry];
  }
  return [];
}

function isIgnored(vuln, allVulns) {
  const viaEntries = Array.isArray(vuln.via) ? vuln.via : [vuln.via];
  const allVia = viaEntries.flatMap((v) => resolveVia(v, allVulns));
  if (allVia.length === 0) return false;
  return allVia.every((v) => v && typeof v === "object" && IGNORED_ADVISORIES.has(v.url));
}

const filtered = Object.fromEntries(
  Object.entries(vulnerabilities).filter(([, info]) => !isIgnored(info, vulnerabilities)),
);

if (Object.keys(filtered).length > 0) {
  const summary = Object.entries(filtered)
    .map(([name, info]) => `  ${name}: ${info.severity} — ${info.name} ${info.range}`)
    .join("\n");
  console.error(`发现 ${Object.keys(filtered).length} 个未被抑制的安全漏洞:\n${summary}`);
  process.exit(1);
}

console.log("安全审计通过（已抑制已知不可修复项）");
process.exit(0);
