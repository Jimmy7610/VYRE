# Settings & Security UX Flow

## Purpose

The primary interface for users to control their account data, privacy preferences, session management, and PWA security options.

## Entry Points

- "Settings" or gear icon in the main navigation or Profile overflow menu
- Direct URL (`/settings`)

## Core User Actions

- Update profile metadata, email, and password
- Manage active sessions (view devices, revoke access)
- Toggle privacy settings (e.g., Private Account, Discoverability)
- Request data export
- Delete or deactivate account

## UX States

### Loading

- The form fields display skeleton placeholders while fetching current preferences from the backend.
- Destructive actions (like Account Deletion) require a secondary loading state to verify password confirmation.

### Empty

- Not applicable for core settings, but "Active Sessions" may show only "This device" if no other sessions exist.

### Error

- Validation failure: Inline red error text below the specific offending field (e.g., "Password must be at least 12 characters").
- Save failure: "Unable to save preferences. Please try again."

### Rate Limited

- Spamming profile updates (e.g., repeatedly changing username): "You can only change your username once every 14 days." The field becomes disabled.
- Repeated failed password attempts lock the settings UI and trigger an email alert.

### Banned/Restricted

- Suspended users can access this page exclusively to request a data export or submit an appeal. All other profile modification fields are frozen/disabled.

## Edge Cases & Abuse Considerations

- **Session Hijacking:** When a user revokes an active session from the list, the UI must immediately remove the item and confirm the revocation. The current session context must be heavily isolated from other JWTs.
- **Destructive Friction:** Account deletion must require re-authentication (password input), followed by a mandatory confirmation modal indicating permanent data loss.

## Notes for Future Expansion

- Passkey/WebAuthn enrollment interface.
- 2FA setup flows (TOTP).
