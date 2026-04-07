# Admin Workflow Test Skeleton

Files:
- tests/integration/admin/login-persistence.test.ts (P1)

## Skeleton: login-persistence.test.ts

Tests for admin login localStorage persistence feature (remembering last used email).

### Test Scenarios:

#### 1. localStorage save after successful login
- Steps:
  1. Clear localStorage
  2. Submit valid admin credentials (email + password)
  3. Assert login succeeds (redirect or success response)
  4. Assert localStorage contains 'adminEmail' key with submitted email value
- Expected: Email stored in localStorage after successful login
- Priority: P1

#### 2. Auto-fill email on page reload
- Steps:
  1. Set localStorage 'adminEmail' to 'test.admin@example.com'
  2. Load/reload login page
  3. Assert email input field is pre-filled with 'test.admin@example.com'
  4. Assert password field is empty (security: never persist password)
- Expected: Saved email appears in input field on page load
- Priority: P1

#### 3. User can override auto-filled email
- Steps:
  1. Set localStorage 'adminEmail' to 'old.admin@example.com'
  2. Load login page (email auto-filled)
  3. Clear email field and type 'new.admin@example.com'
  4. Submit valid credentials for new email
  5. Assert login succeeds
  6. Assert localStorage 'adminEmail' now contains 'new.admin@example.com'
- Expected: User can change pre-filled email and new email is saved
- Priority: P1

#### 4. Empty email not saved to localStorage
- Steps:
  1. Set localStorage 'adminEmail' to 'existing@example.com'
  2. Load login page
  3. Clear email field completely
  4. Submit form (expect validation error or handle gracefully)
  5. Assert localStorage 'adminEmail' still contains original value OR is removed
- Expected: Empty/cleared email doesn't overwrite valid stored email
- Priority: P2

#### 5. Invalid email format not saved
- Steps:
  1. Clear localStorage
  2. Submit login with invalid email format (e.g., 'not-an-email')
  3. Assert login fails (validation error)
  4. Assert localStorage 'adminEmail' is empty or unchanged
- Expected: Only valid email formats are persisted
- Priority: P2

#### 6. localStorage unavailable (privacy/incognito mode)
- Steps:
  1. Mock localStorage to throw error or return null (simulate privacy mode)
  2. Load login page
  3. Assert page loads without error (graceful degradation)
  4. Submit valid credentials
  5. Assert login succeeds even without localStorage
  6. Assert no errors logged to console
- Expected: Feature degrades gracefully when localStorage unavailable
- Priority: P2

#### 7. Multiple admin users on same device
- Steps:
  1. Login as 'admin1@example.com' (saved to localStorage)
  2. Logout
  3. Login page loads with 'admin1@example.com' auto-filled
  4. Change to 'admin2@example.com' and login successfully
  5. Assert localStorage now contains 'admin2@example.com'
  6. Logout and reload - assert 'admin2@example.com' is auto-filled
- Expected: Last successful login email is always the one remembered
- Priority: P2

#### 8. localStorage cleared by user
- Steps:
  1. Set localStorage 'adminEmail' to 'test@example.com'
  2. Manually clear browser localStorage (user action via DevTools)
  3. Reload login page
  4. Assert email field is empty (no auto-fill)
  5. Login with new email
  6. Assert new email is saved to localStorage
- Expected: System respects user's localStorage clear action
- Priority: P3

#### 9. XSS protection - malicious email in localStorage
- Steps:
  1. Manually inject malicious value to localStorage: `<script>alert('xss')</script>`
  2. Load login page
  3. Assert email field shows escaped/sanitized value or is empty
  4. Assert no script execution occurs
- Expected: Input field properly escapes localStorage values
- Priority: P1

#### 10. Session vs localStorage boundary
- Steps:
  1. Login successfully (email saved to localStorage)
  2. Close browser tab/window (session ends)
  3. Reopen browser and navigate to login page
  4. Assert email is still auto-filled (localStorage persists across sessions)
  5. Assert user is NOT logged in (session cleared)
- Expected: Email persists but authentication does not
- Priority: P2

## Implementation Notes:

- **Storage key**: Use consistent key name (e.g., 'adminEmail' or 'lastAdminLogin')
- **Security**: NEVER store passwords in localStorage
- **Privacy**: Consider adding "Remember me" checkbox for user consent
- **Validation**: Validate email format before saving to localStorage
- **Error handling**: Wrap localStorage access in try-catch for quota/privacy errors
- **Cleanup**: Consider expiration/TTL for stored emails (e.g., 30 days)

## Cross-cutting concerns:

- Coordinate with Astra on frontend implementation details
- Coordinate with Scribe on security/privacy policy decisions
- Test across browsers (Chrome, Firefox, Safari, Edge)
- Test on mobile devices (iOS Safari, Chrome Mobile)
- Accessibility: Ensure auto-fill works with screen readers and keyboard navigation
