# Test Plan (Change-scoped)

Goal: add tests for this change only — cover the code paths introduced/modified by the current PR and the directly impacted regression surface.

## Change Fingerprint (scope lock)
- BASE_REF:
- HEAD_SHA:
- DIFF_CMD: `git diff <BASE_REF>...<HEAD_SHA>`

## Scope (in / out)
- Included:
- Excluded (non-goals):

## Coverage Map
List affected modules/interfaces → risks → planned coverage points.

## Test Cards (summary)
Per impacted module: at least 1 normal + 2 boundary + 2 error cases.
Each card must map to a change id (CHG-*) and a risk id (RISK-*).

## Run Command & Coverage Delta (evidence)
- TEST_CMD:
- Coverage before:
- Coverage after:

## Flake Guard (determinism)
- seed:
- clock:
- timezone:
- concurrency/isolation:

## Offline / Online Policy
- Default: tests must run offline (no external network) and be deterministic.
- If an external-only dependency exists: isolate it behind an adapter, and use mocks/fixtures/fake servers for offline runs.
- Any online-only tests must be clearly labeled, opt-in, and not required for PR evidence.

## Trace Matrix (change → tests → risks)
| CHG | Change | RISK | Tests | Evidence |
|---|---|---|---|---|
