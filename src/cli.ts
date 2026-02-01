/* eslint-disable no-console */
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PACKAGE_ROOT = path.resolve(__dirname, "..");

function die(msg: string): never {
  console.error(`[openspec-test-bootstrap] ERROR: ${msg}`);
  process.exit(1);
}
function info(msg: string) {
  console.log(`[openspec-test-bootstrap] ${msg}`);
}

type CliArgs = {
  projectRoot: string;
  schema: string;
  tools: string;
  forkFrom: string;
  evidenceDir: string;
  templates: string | null;
  openspecCmd: string | null;
  noInit: boolean;
  setDefault: boolean;
  forceRebuild: boolean;
  validate: boolean;
  addEvidence: boolean;
  dryRun: boolean;
  yes: boolean;
  help?: boolean;
};

function parseArgs(argv: string[]): CliArgs {
  // Minimal args parser:
  // --projectRoot <path>
  // --schema <name>
  // --tools <all|none|csv>
  // --forkFrom <schemaName>
  // --evidenceDir <relativePath>
  // --templates <dir>
  // --openspec <cmdOrPath>
  // --no-init
  // --setDefault / --no-setDefault
  // --forceRebuild / --no-forceRebuild
  // --validate / --no-validate
  // --addEvidence / --no-addEvidence
  // --dryRun
  // --yes  (non-interactive always yes)
  const out: CliArgs = {
    projectRoot: process.cwd(),
    schema: "my-workflow",
    tools: "none",
    forkFrom: "spec-driven",
    evidenceDir: "evidence",
    templates: null,
    openspecCmd: null,
    noInit: false,
    setDefault: true,
    forceRebuild: false,
    validate: true,
    addEvidence: false,
    dryRun: false,
    yes: true,
  };

  const args = [...argv];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--projectRoot" || a === "--project-root")
      out.projectRoot = args[++i];
    else if (a === "--schema" || a === "--schemaName") out.schema = args[++i];
    else if (a === "--tools") out.tools = args[++i];
    else if (a === "--forkFrom" || a === "--fork-from")
      out.forkFrom = args[++i];
    else if (a === "--evidenceDir" || a === "--evidence-dir")
      out.evidenceDir = args[++i];
    else if (a === "--templates") out.templates = args[++i];
    else if (a === "--openspec" || a === "--openspecCmd")
      out.openspecCmd = args[++i];
    else if (a === "--no-init") out.noInit = true;
    else if (a === "--setDefault") out.setDefault = true;
    else if (a === "--no-setDefault" || a === "--no-set-default")
      out.setDefault = false;
    else if (a === "--forceRebuild") out.forceRebuild = true;
    else if (a === "--no-forceRebuild" || a === "--no-force-rebuild")
      out.forceRebuild = false;
    else if (a === "--validate") out.validate = true;
    else if (a === "--no-validate") out.validate = false;
    else if (a === "--addEvidence" || a === "--addTestCardsAndEvidence")
      out.addEvidence = true;
    else if (a === "--no-addEvidence" || a === "--no-add-evidence")
      out.addEvidence = false;
    else if (a === "--dryRun" || a === "--dry-run") out.dryRun = true;
    else if (a === "--yes" || a === "-y") out.yes = true;
    else if (a === "--help" || a === "-h") out.help = true;
  }
  return out;
}

function printHelp() {
  console.log(`
openspec-test-bootstrap

Usage:
  npx openspec-test-bootstrap --projectRoot . --schema my-workflow
  npx openspec-test-bootstrap --projectRoot . --schema my-workflow --tools none --no-addEvidence

Options:
  --projectRoot <path>         Target project root (default: cwd)
  --schema <name>              Schema name to create/update (default: my-workflow)
  --forkFrom <schema>          Base schema to fork from (default: spec-driven)
  --tools <none|all|csv>       openspec init tools (default: none)
  --evidenceDir <path>         Evidence output dir inside schema (default: evidence)
  --templates <dir>            Override source templates directory
  --openspec <cmdOrPath>       Override openspec command/path
  --no-init                    Do not auto-run 'openspec init'
  --setDefault / --no-setDefault
  --forceRebuild / --no-forceRebuild
  --validate / --no-validate
  --addEvidence / --no-addEvidence
  --dryRun                     Print actions without writing/running
`);
}

function which(cmd: string) {
  const isWin = process.platform === "win32";
  const checker = isWin ? "where" : "which";
  const r = spawnSync(checker, [cmd], { stdio: "ignore" });
  return r.status === 0;
}

function run(
  cmd: string,
  args: string[],
  cwd: string,
  opts: { dryRun?: boolean } = {},
) {
  if (opts.dryRun) {
    info(`[dry-run] run: ${cmd} ${args.join(" ")}`);
    return;
  }
  const base = { cwd, stdio: "inherit" as const };

  // Prefer `shell: false` (safer, avoids Node's shell warning on Windows).
  // Fallback to `shell: true` only if needed to execute `.cmd/.bat` shims.
  let r = spawnSync(cmd, args, { ...base, shell: false });
  if (r.error && process.platform === "win32") {
    const enoent = (r.error as NodeJS.ErrnoException).code === "ENOENT";
    if (enoent) {
      r = spawnSync(cmd, args, { ...base, shell: true });
    }
  }
  if (r.error) die(`${cmd} failed to start: ${r.error.message}`);
  if (r.status !== 0) die(`${cmd} exited with code ${r.status}`);
}

async function pathExists(p: string) {
  try {
    await fsp.access(p, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function ensureDir(p: string) {
  await fsp.mkdir(p, { recursive: true });
}

async function writeFileUtf8(
  p: string,
  content: string,
  opts: { dryRun?: boolean } = {},
) {
  if (opts.dryRun) {
    info(`[dry-run] write: ${p}`);
    return;
  }
  await ensureDir(path.dirname(p));
  await fsp.writeFile(p, content, { encoding: "utf8" });
}

function normalizeNewlines(s: string) {
  return s.replace(/\r\n/g, "\n");
}

function stripTrailingWhitespace(s: string) {
  return normalizeNewlines(s)
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/g, ""))
    .join("\n");
}

function indentBlockText(blockText: string, indent: string) {
  const normalized = stripTrailingWhitespace(blockText).trimEnd();
  const lines = normalized.split("\n");

  let minIndent: number | null = null;
  for (const line of lines) {
    if (!line.trim()) continue;
    const m = line.match(/^[ \t]*/);
    const n = (m?.[0] || "").length;
    minIndent = minIndent === null ? n : Math.min(minIndent, n);
  }
  const dedent = minIndent ?? 0;

  return lines
    .map((line) => {
      if (!line.trim()) return "";
      return indent + line.slice(dedent);
    })
    .join("\n");
}

function detectListIndent(blockBody: string) {
  const lines = normalizeNewlines(blockBody).split("\n");
  for (const line of lines) {
    if (!line.trim()) continue;
    const m = line.match(/^(\s*)-\s+/);
    if (m) return m[1] || "";
    return "";
  }
  return null;
}

async function readTextUtf8(p: string) {
  return normalizeNewlines(await fsp.readFile(p, "utf8"));
}

function ensureArtifactBlock(
  schemaContent: string,
  artifactId: string,
  blockText: string,
) {
  const s = normalizeNewlines(schemaContent);
  const idRe = new RegExp(
    `^\\s*-\\s*id:\\s*${escapeRegExp(artifactId)}\\s*$`,
    "m",
  );
  if (idRe.test(s)) return s;

  const m = s.match(/(^|\n)artifacts:\s*\n([\s\S]*?)(\n[^\s][\w-]*\s*:|\n?$)/);
  const defaultIndent = "  ";

  if (!m) {
    const block = indentBlockText(blockText, defaultIndent).trimEnd() + "\n";
    return s.trimEnd() + "\n\nartifacts:\n" + block + "\n";
  }

  const full = m[0];
  const headIdx = s.indexOf(full);
  const head = s.slice(0, headIdx);
  const tail = s.slice(headIdx + full.length);

  const artifactsBody = (m[2] || "").trimEnd();
  const indent =
    (artifactsBody && detectListIndent(artifactsBody)) ?? defaultIndent;
  const block = indentBlockText(blockText, indent).trimEnd() + "\n";
  const nextTopLevel = m[3] || "\n";

  const newFull =
    `${m[1]}artifacts:\n` +
    (artifactsBody ? artifactsBody + "\n\n" : "") +
    block +
    nextTopLevel;

  return head + newFull + tail;
}

function ensureArtifactRequires(
  schemaContent: string,
  artifactId: string,
  requireId: string,
) {
  let s = normalizeNewlines(schemaContent);
  const blockRe = new RegExp(
    `(^\\s*-\\s*id:\\s*${escapeRegExp(artifactId)}\\s*$)([\\s\\S]*?)(?=^\\s*-\\s*id:\\s*|^[^\\s][\\w-]*\\s*:|\\z)`,
    "m",
  );
  const m = s.match(blockRe);
  if (!m) return s;

  const wholeMatch = m[0];
  const start = s.indexOf(wholeMatch);
  const end = start + wholeMatch.length;

  let block = wholeMatch;

  const alreadyRe = new RegExp(
    `^\\s*-\\s*${escapeRegExp(requireId)}\\s*$`,
    "m",
  );
  if (alreadyRe.test(block)) return s;

  const reqHeaderRe = /^(\s*)requires:\s*$/m;
  const reqHeader = block.match(reqHeaderRe);

  if (!reqHeader) {
    block = block.trimEnd() + `\n    requires:\n      - ${requireId}\n`;
  } else {
    const indent = reqHeader[1] || "";
    const reqListRe = new RegExp(
      `^${escapeRegExp(indent)}requires:\\s*$\\n((?:^${escapeRegExp(indent)}\\s*-\\s*.*$\\n?)*)`,
      "m",
    );
    const ml = block.match(reqListRe);
    if (!ml) {
      block = block.replace(
        reqHeaderRe,
        `${indent}requires:\n${indent}  - ${requireId}\n`,
      );
    } else {
      const list = ml[1] || "";
      const newList = list.trimEnd() + `\n${indent}  - ${requireId}\n`;
      block = block.replace(reqListRe, `${indent}requires:\n${newList}`);
    }
  }

  return s.slice(0, start) + block + s.slice(end);
}

function escapeRegExp(x: string) {
  return x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function patchConfigSetSchema(openspecDir: string, schemaName: string) {
  const configFile = path.join(openspecDir, "config.yaml");
  let content = "";
  if (await pathExists(configFile))
    content = normalizeNewlines(await fsp.readFile(configFile, "utf8"));
  if (/^schema:\s*.*$/m.test(content))
    content = content.replace(/^schema:\s*.*$/m, `schema: ${schemaName}`);
  else content = `schema: ${schemaName}\n\n` + content;
  await writeFileUtf8(configFile, content);
}

type Runner = { cmd: string; baseArgs: string[] };

function resolveOpenSpecRunner(
  projectRoot: string,
  explicitCmd: string | null,
): Runner | null {
  const isWin = process.platform === "win32";

  if (explicitCmd) {
    const resolved = path.isAbsolute(explicitCmd)
      ? explicitCmd
      : path.resolve(projectRoot, explicitCmd);
    return { cmd: resolved, baseArgs: [] };
  }

  const localBinDir = path.join(projectRoot, "node_modules", ".bin");
  const localCandidates = isWin
    ? ["openspec.cmd", "openspec.exe", "openspec.bat"]
    : ["openspec"];
  for (const name of localCandidates) {
    const full = path.join(localBinDir, name);
    if (fs.existsSync(full)) return { cmd: full, baseArgs: [] };
  }

  if (which("openspec")) return { cmd: "openspec", baseArgs: [] };
  if (which("npx"))
    return { cmd: "npx", baseArgs: ["--no-install", "openspec"] };
  return null;
}

function resolveTemplateSourceDir(
  projectRoot: string,
  templatesArg: string | null,
) {
  if (!templatesArg) return path.join(PACKAGE_ROOT, "templates");
  return path.isAbsolute(templatesArg)
    ? templatesArg
    : path.resolve(projectRoot, templatesArg);
}

async function loadArtifactSnippet(snippetName: string, evidenceDir: string) {
  const snippetPath = path.join(PACKAGE_ROOT, "snippets", snippetName);
  const raw = await readTextUtf8(snippetPath);
  return raw.replaceAll("{{EVIDENCE_DIR}}", evidenceDir).trimEnd();
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  const projectRoot = path.resolve(args.projectRoot);
  const schemaName = args.schema;
  const forkFrom = args.forkFrom || "spec-driven";
  const tools = (args.tools || "none").trim();
  const evidenceDir = (args.evidenceDir || "evidence")
    .replace(/\\/g, "/")
    .replace(/\/+$/g, "");
  const dryRun = !!args.dryRun;

  if (!(await pathExists(projectRoot)))
    die(`Project root does not exist: ${projectRoot}`);

  const openspecRunner = resolveOpenSpecRunner(projectRoot, args.openspecCmd);
  if (!openspecRunner) {
    die(
      `Unable to find 'openspec'. Install locally and retry:\n` +
        `  npm i -D @fission-ai/openspec@latest\n` +
        `Or provide --openspec <cmdOrPath>.`,
    );
  }

  const openspecDir = path.join(projectRoot, "openspec");
  const schemaDir = path.join(openspecDir, "schemas", schemaName);
  const schemaFile = path.join(schemaDir, "schema.yaml");
  const templateDir = path.join(schemaDir, "templates");

  const templateSourceDir = resolveTemplateSourceDir(
    projectRoot,
    args.templates,
  );

  const runOpenSpec = (subArgs: string[]) =>
    run(
      openspecRunner.cmd,
      [...openspecRunner.baseArgs, ...subArgs],
      projectRoot,
      { dryRun },
    );

  // 1) init if missing
  if (!(await pathExists(openspecDir))) {
    if (args.noInit)
      die(
        `No openspec/ directory found at ${openspecDir} (auto-init disabled via --no-init).`,
      );

    info(`No openspec/ detected, running 'openspec init'`);
    const initArgs = ["init", "--force"];
    if (tools && tools.toLowerCase() !== "none")
      initArgs.splice(1, 0, "--tools", tools);
    runOpenSpec(initArgs);
  }

  // 2) Force rebuild
  if (args.forceRebuild && (await pathExists(schemaDir))) {
    info(`ForceRebuild: remove and recreate schema: ${schemaDir}`);
    if (!dryRun) await fsp.rm(schemaDir, { recursive: true, force: true });
  }

  // 3) fork if missing
  if (!(await pathExists(schemaDir))) {
    info(`Fork schema: ${forkFrom} -> ${schemaName}`);
    runOpenSpec(["schema", "fork", forkFrom, schemaName]);
  } else {
    info(`Schema exists; updating in-place: ${schemaDir}`);
  }

  if (!(await pathExists(schemaFile))) {
    if (dryRun) {
      info(`[dry-run] Would create and patch: ${schemaFile}`);
      info(`[dry-run] Done.`);
      return;
    }
    die(`Missing schema.yaml: ${schemaFile}`);
  }
  if (!dryRun) await ensureDir(templateDir);

  // 4) write templates from files
  const testPlanTemplate = await readTextUtf8(
    path.join(templateSourceDir, "test-plan.md"),
  );

  await writeFileUtf8(
    path.join(templateDir, "test-plan.md"),
    testPlanTemplate,
    { dryRun },
  );
  info(`Wrote template: ${path.join(templateDir, "test-plan.md")}`);

  if (args.addEvidence) {
    const testCardsTemplate = await readTextUtf8(
      path.join(templateSourceDir, "test-cards.md"),
    );
    const testEvidenceTemplate = await readTextUtf8(
      path.join(templateSourceDir, "test-evidence.md"),
    );
    await writeFileUtf8(
      path.join(templateDir, "test-cards.md"),
      testCardsTemplate,
      { dryRun },
    );
    info(`Wrote template: ${path.join(templateDir, "test-cards.md")}`);
    await writeFileUtf8(
      path.join(templateDir, "test-evidence.md"),
      testEvidenceTemplate,
      { dryRun },
    );
    info(`Wrote template: ${path.join(templateDir, "test-evidence.md")}`);
  }

  // 5) patch schema.yaml
  let schemaContent = normalizeNewlines(await fsp.readFile(schemaFile, "utf8"));

  const testPlanBlock = await loadArtifactSnippet(
    "test-plan.artifact.yaml",
    evidenceDir,
  );
  schemaContent = ensureArtifactBlock(
    schemaContent,
    "test-plan",
    testPlanBlock,
  );

  if (args.addEvidence) {
    const testCardsBlock = await loadArtifactSnippet(
      "test-cards.artifact.yaml",
      evidenceDir,
    );
    const testEvidenceBlock = await loadArtifactSnippet(
      "test-evidence.artifact.yaml",
      evidenceDir,
    );

    schemaContent = ensureArtifactBlock(
      schemaContent,
      "test-cards",
      testCardsBlock,
    );
    schemaContent = ensureArtifactBlock(
      schemaContent,
      "test-evidence",
      testEvidenceBlock,
    );
  }

  schemaContent = ensureArtifactRequires(schemaContent, "tasks", "test-plan");
  if (args.addEvidence) {
    schemaContent = ensureArtifactRequires(
      schemaContent,
      "tasks",
      "test-cards",
    );
    schemaContent = ensureArtifactRequires(
      schemaContent,
      "tasks",
      "test-evidence",
    );
  }

  await writeFileUtf8(schemaFile, schemaContent, { dryRun });
  info(`Updated schema: ${schemaFile}`);

  // 6) patch tasks template if exists
  const tasksTemplatePath = path.join(templateDir, "tasks.md");
  if (await pathExists(tasksTemplatePath)) {
    let tasksTemplate = normalizeNewlines(
      await fsp.readFile(tasksTemplatePath, "utf8"),
    );
    if (!/^##\s+3\.\s+Testing\b/m.test(tasksTemplate)) {
      const testingSection = args.addEvidence
        ? `

## 3. Testing

- [ ] 3.1 Implement tests from ${evidenceDir}/test_cards.md (offline + deterministic)
- [ ] 3.2 Add/Update fixtures & mocks (no external network)
- [ ] 3.3 Run TEST_CMD and capture coverage before/after evidence
`
        : `

## 3. Testing

- [ ] 3.1 Implement tests based on ${evidenceDir}/test_plan.md (offline + deterministic)
- [ ] 3.2 Add/Update fixtures & mocks (no external network)
- [ ] 3.3 Run TEST_CMD and capture coverage before/after evidence
`;
      tasksTemplate = tasksTemplate.trimEnd() + testingSection;
      await writeFileUtf8(tasksTemplatePath, tasksTemplate, { dryRun });
      info(`Patched tasks template: ${tasksTemplatePath}`);
    }
  }

  // 7) set default schema
  if (args.setDefault) {
    if (!dryRun) await patchConfigSetSchema(openspecDir, schemaName);
    info(`Set default schema: ${schemaName}`);
  }

  // 8) validate
  if (args.validate) {
    info(`Validate schema: ${schemaName}`);
    runOpenSpec(["schema", "validate", schemaName]);
  }

  info(`Done.`);
}

main().catch((e) => die(e instanceof Error ? e.stack || e.message : String(e)));
