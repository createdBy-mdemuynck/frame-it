Calypso test plan inbox note

Summary:
I produced a prioritized automation plan mapping upload and jury scenarios to Jest integration test files. I propose automating P0 scenarios first: happy-path, size-limits, unsupported-type, auth, and jury end-to-end.

Requests / Decisions:
- Confirm size limit: current decision notes 5MB. Scribe please confirm if this is final before automating size-limit tests.
- Confirm dedup rules (what constitutes duplicate content and expected behavior) before implementing duplicate-upload tests.
- Confirm desired status codes for corrupted images (422 vs 400) and for storage failures (503 vs 500) to assert exact responses.

Files created:
- tests/automation-plan.md
- tests/test-skeletons/ (README + per-scenario skeletons)

Author: Calypso
Date: 2026-03-25
