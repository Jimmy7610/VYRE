# Post Detail UX Flow

## Purpose

To provide a focused, deep-engagement view of a single post, its attached media, and the associated comment thread.

## Entry Points

- Tapping a post in the Global Feed, Profile, or Search results
- Direct URL navigation (`/post/:id`)
- Incoming push or in-app notification

## Core User Actions

- Read full post content and view uncropped media
- Interact with the post (Like, Share, Report)
- Read the comment thread
- Compose and submit a reply
- Access the overflow menu for moderation (Mute, Block author)

## UX States

### Loading

- Hero content loads immediately if cached from feed.
- Comment thread displays a descending hierarchy of skeleton placeholders.
- Media elements display a dark, low-resolution placeholder or solid gray box until fully loaded.

### Empty

- If there are no comments: "No comments yet. Be the first to reply."
- If the post was deleted during navigation: 404 state with "This post has been removed" and a "Back to Home" action.

### Error

- Comment submission failure: The comment remains in the text area, bordered in red, with a "Retry" button.
- Media load failure: Broken image icon with a "Tap to reload" prompt.

### Rate Limited

- Spamming interactions (e.g., toggling Like repeatedly): The UI locks the action locally for a cooldown period and displays a toast ("You are doing that too fast").

### Banned/Restricted

- If the viewer is restricted: The comment input area is completely hidden. Action buttons are visually dimmed.
- If the post author is restricted: A permanent warning banner appears above the post ("This account is under review").

## Edge Cases & Abuse Considerations

- **Brigading:** If a post receives an anomalous spike in comments, the UI should dynamically collapse deep threads and display a "High Activity" warning to manage expectations on load times and moderation.
- **Deep Linking:** Navigating directly to a nested comment ID must highlight the target comment immediately, even if the parent thread is exceptionally long.

## Notes for Future Expansion

- Nested reply collapsing based on reputation scoring.
