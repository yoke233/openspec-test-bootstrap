# openspec-test-bootstrap

Bootstraps an OpenSpec schema (workflow) with change-scoped testing artifacts:

- `test-plan` → `evidence/test_plan.md`
- `test-cards` → `evidence/test_cards.md` (optional; enabled via `--addEvidence`)
- `test-evidence` → `evidence/test_evidence.md` (optional; enabled via `--addEvidence`)

## Usage

```bash
npm run build
node dist/cli.js --projectRoot . --schema my-workflow
```

Or via npx:

```bash
npx @yoke233/openspec-test-bootstrap --projectRoot . --schema my-workflow
```

## OpenSpec Resolution (Windows-friendly)

This tool tries (in order):
1) `./node_modules/.bin/openspec(.cmd)` under `--projectRoot`
2) `openspec` on `PATH`
3) `npx --no-install openspec`

You can override with:

```bash
node dist/cli.js --openspec <cmdOrPath> --projectRoot . --schema my-workflow
```

## CLI Options

- `--projectRoot <path>`: target project root (default: cwd)
- `--schema <name>`: schema name to create/update (default: `my-workflow`)
- `--forkFrom <schema>`: base schema to fork from (default: `spec-driven`)
- `--tools <none|all|csv>`: tools for `openspec init` (default: `none`)
- `--evidenceDir <path>`: evidence output dir inside schema (default: `evidence`)
- `--templates <dir>`: override source templates directory
- `--openspec <cmdOrPath>`: override openspec command/path
- `--no-init`: do not auto-run `openspec init`
- `--setDefault / --no-setDefault`: set `openspec/config.yaml` schema
- `--forceRebuild / --no-forceRebuild`: delete & recreate schema directory
- `--validate / --no-validate`: run `openspec schema validate`
- `--addEvidence / --no-addEvidence`: include test-cards/test-evidence artifacts
- `--dryRun`: print actions without writing/running

## Self-check

```bash
node dist/cli.js --help
```
