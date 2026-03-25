Files:
- tests/integration/jury/end-to-end.test.ts (P0)
- tests/integration/jury/concurrent-verdicts.test.ts (P2)

Skeleton: end-to-end.test.ts
- Steps:
  1. Upload valid image
  2. Assert jury job created
  3. Simulate jury fetching pending jobs
  4. Submit accept verdict
  5. Assert image status transitions to 'accepted' and notification/event emitted

Skeleton: concurrent-verdicts.test.ts
- Steps: two jurors submit conflicting verdicts concurrently; assert final state follows business aggregation rule (coordinate with Scribe for rule).  
