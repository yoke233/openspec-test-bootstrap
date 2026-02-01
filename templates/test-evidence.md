# Test Evidence Plan

Write how to produce evidence (don’t paste huge logs at planning time). Prefer CI artifacts.

## Required Evidence
- Single command runnable: `TEST_CMD`
- Offline guarantee: no external network
- Determinism: seed / clock / timezone
- Coverage delta: before/after (touched modules/packages)

## Collection Steps
1) Run `TEST_CMD`
2) Export coverage summary
3) Save minimal repro steps for any failure

## Outputs (paths)
- coverage report:
- logs:
- snapshots/fixtures:

