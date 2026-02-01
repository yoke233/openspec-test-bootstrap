# Test Cards

Each card drives test implementation: goal / setup / input / assertions / fixtures-mocks / offline strategy / determinism strategy.

Rules:
- Each card must reference at least one `CHG-*` and one `RISK-*` from `test-plan`.
- Must be implementable offline and deterministic.

## Card Template
- id: TC-001
- covers: [CHG-001]
- risks:  [RISK-001]
- level: unit|integration|e2e
- target: <function/module/endpoint>
- setup: <fixtures/mocks>
- input:
- assertions:
- offline: true
- deterministic: seed=<...>, clock=<freeze...>, timezone=<...>
- notes:

## Cards
- id: TC-001
  covers: []
  risks:  []
  level: unit
  target:
  setup:
  input:
  assertions:
  offline: true
  deterministic:
  notes:

