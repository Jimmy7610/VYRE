# Notifications UX Flow

## Purpose
A centralized hub for users to view and manage interactions relevant to them, including mentions, replies, follows, and system alerts.

## Entry Points
- Notification bell/icon in the navigation bar (desktop/mobile)
- Direct URL (`/notifications`)

## Core User Actions
- Scroll through a chronological list of notifications
- Filter by type (e.g., "All", "Mentions", "System")
- Tap a notification to navigate to the relevant post or profile
- Mark individual or all notifications as read

## UX States

### Loading
- Skeleton rows indicating the avatar and text layout of upcoming notifications.
- Polling for new notifications runs silently in the background without UI interruption.

### Empty
- No notifications: "You're all caught up! No new notifications."

### Error
- Failed to fetch: A discrete banner above the list "Unable to fetch latest notifications" with a retry action.

### Rate Limited
- Rapid marking of items as read queues the requests locally and resolves them in batches, avoiding visual blockages.

### Banned/Restricted
- System alerts (e.g., warning of account restriction or content takedown) lock at the top of the feed and cannot be dismissed until acknowledged.
- Standard interaction notifications are paused if the account is under full suspension.

## Edge Cases & Abuse Considerations
- **Spam/Harassment Vectors:** If a user is being mass-mentioned (brigading), the notifications UI must automatically aggregate them (e.g., "[User] and 50 others mentioned you") rather than rendering 50 distinct malicious items.
- **Content Deletion:** If a user receives a notification for a post that is later deleted, tapping the notification cleanly routes to a standard 404 "Content unavailable" state rather than crashing.

## Notes for Future Expansion
- Granular push notification opt-ins directly from this interface.
