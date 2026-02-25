# Messages UX Flow

## Purpose

A private, secure surface for 1-to-1 or group direct messaging between users.

## Entry Points

- "Messages" tab in the main navigation
- "Message" action button on a user's Profile
- Direct URL (`/messages`)

## Core User Actions

- View active conversation list (Inbox)
- Open a specific conversation thread
- Send plain text or media messages
- Accept or decline message requests from unknown users
- Block or report a conversation

## UX States

### Loading

- Inbox: List of skeleton conversation summaries.
- Thread: Skeleton bubbles. Older messages load seamlessly as the user scrolls up.

### Empty

- Inbox: "No messages yet. Start a conversation."
- Thread: "This is the beginning of your conversation with [User]."
- Filtered Requests: "No new message requests."

### Error

- Message failed to send: The bubble remains in the thread but turns red with an "X" icon and a "Tap to retry" prompt.
- Connectivity loss: A banner warns "Offline. Messages will send when connection is restored."

### Rate Limited

- Typing/sending too fast: The input area is disabled. Toast: "Message sending is temporarily throttled."

### Banned/Restricted

- Account restricted: The input area is completely hidden. The user can read existing conversations but cannot reply or initiate new ones.
- Blocked conversation: The input area is replaced by "You cannot reply to this conversation. [Unblock]"

## Edge Cases & Abuse Considerations

- **Unsolicited Imagery:** Media from users not in the recipient's explicit "Following" list must be blurred by default, requiring an explicit tap to reveal.
- **Phishing Links:** URLs sent via DM must not pre-fetch metadata automatically. They must be clearly styled as external, potentially unsafe links.

## Notes for Future Expansion

- End-to-end encryption key management UI.
