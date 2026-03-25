Calypso Tests - Decision Note

Decision: Create tests/ directory containing a detailed upload_flow.md test plan (markdown). Do not add executable tests now.

Rationale:
- We need a clear, reproducible plan covering happy paths, limits, and jury workflow before authoring automated tests.
- Daedalus will add package.json scripts and configure Jest to run tests later; Calypso focuses on test cases and edge cases.

Actions:
- Calypso: authored tests/upload_flow.md and added tests/.gitkeep.
- Daedalus: will wire Jest and add npm scripts to package.json.
- Scribe: consult for any product decisions (e.g., exact size limits, dedup rules) before automation.

Date: 2026-03-25

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>