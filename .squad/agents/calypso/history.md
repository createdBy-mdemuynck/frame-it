## History

Project: frame-it
Requested by: Maarten De Muynck

Seeded at team creation.

## Learnings - Calypso

- Created tests/upload_flow.md containing test cases for upload flows, limits, jury workflow, and edge cases (malformed images, rate limits, storage errors).
- Added tests/.gitkeep to ensure tests directory exists in the repository.
- Added decision note at .squad/decisions/inbox/calypso-tests.md detailing the approach and coordination with Daedalus and Scribe.
- Tests are a plan (markdown) and will be wired into Jest later by Daedalus; kept as non-executable artifacts for now.

## Learnings (2026-03-25)
- Calypso produced a comprehensive test plan; next is converting these plans into automated Jest tests once the scaffold wiring is complete.
