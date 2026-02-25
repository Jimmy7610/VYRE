# Global Feed UX Flow

## Purpose

The primary discovery and consumption surface for VYRE. Provides a continuous stream of content in a responsive, web-first PWA environment entirely in dark mode.

## Entry Points

- Direct access via root URL (`/`)
- App launch from home screen or browser shortcut
- Main navigation "Home" or "Feed" tab

## Core User Actions

- Scroll through chronologically or algorithmically sorted posts
- Refresh feed (pull-to-refresh on touch, refresh button on desktop)
- Tap a post to open Post Detail view
- Interact with posts (Like, Share)
- Switch feed filters (e.g., "Following" vs "Global")

## UX States

### Loading

- Initial visual: Dark mode skeleton screens mimicking post dimensions.
- Pagination: Inline loading spinner at the bottom of the feed indicating more content is being fetched.
- Pull-to-refresh: Native-web pull indicator at the top of the viewport.

### Empty

- If "Following" feed is empty: Display a concise message ("You aren't following anyone yet.") with a CTA to explore the "Global" feed.
- If no content exists overall: Minimal text indicating "No posts found."

### Error

- Network failure detected: Non-intrusive toast notification ("Offline mode active") while displaying cached content.
- Fetch error on pagination: Inline "Unable to load more posts" with a manual "Try Again" button.

### Rate Limited

- Throttling on excessive refresh attempts. The refresh action is temporarily disabled, accompanied by a visual toast: "Please wait before refreshing again."

### Banned/Restricted

- If the current user is restricted (read-only): Feed renders normally, but interaction buttons (Like, Reply) are disabled or trigger an educational toast ("Your account is currently restricted from interacting.")

## Edge Cases & Abuse Considerations

- **Rapid Scraping:** Extremely fast scrolling/pagination vectors should trigger application-level debouncing and silent log events.
- **Malformed Payloads:** If a post payload fails validation, the feed must gracefully skip rendering that specific post rather than crashing the entire list.

## Notes for Future Expansion

- Feed personalization toggles and inline media auto-play settings.
