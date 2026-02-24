# Compose UX Flow

## Purpose
The primary creation surface for users to draft, preview, and publish content safely and securely.

## Entry Points
- Floating Action Button (FAB) or fixed "Create" button in the PWA shell
- Replying directly from within the Post Detail view
- System share target (triggering the PWA from OS-level sharing)

## Core User Actions
- Input text with live character count validation
- Attach, preview, and remove media files
- Cancel or dismiss the sequence

## UX States

### Loading
- Media upload: Immediate UI feedback showing file progress. User can continue typing, but the "Publish" button remains disabled until upload completes.
- Publishing: The compose modal prevents further edits, and the "Publish" button transforms into a spinner to prevent double-submission.

### Empty
- Default state on open. The text area is focused (triggering the virtual keyboard on mobile devices). The "Publish" button is explicitly disabled.

### Error
- File size/type violation: Immediate inline red text below the attachment area ("File exceeds limits or is unsupported").
- Submission failure: The form unlocks, preserving all text and media, with a specific error toast indicating the reason (e.g., "Network error, please try again").

### Rate Limited
- If the user publishes rapidly: The input area is temporarily disabled and an opaque overlay shows a countdown timer ("Please wait [X] seconds before posting again").

### Banned/Restricted
- Account suspended/read-only: The global entry points should be hidden. If accessed via direct URL, a modal blocks the UI: "Your account does not have permission to publish content."

## Edge Cases & Abuse Considerations
- **Large Pastes & Payload Injection:** Pasting massive blocks of text must instantly truncate to the absolute character limit. Hidden control characters must be stripped client-side before previewing.
- **Connection Drops:** If the network drops mid-composition, the PWA must silently save the draft to IndexedDB to prevent data loss.

## Notes for Future Expansion
- Native draft management and scheduled posting.
