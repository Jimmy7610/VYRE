# Profile UX Flow

## Purpose
A dedicated identity surface displaying a user's bio, statistics, and a chronological history of their public interactions and posts.

## Entry Points
- Tapping a user's avatar or handle anywhere in the app
- Direct URL (`/u/:username`)
- Tapping the "Profile" tab in the main navigation (for the authenticated user's own profile)

## Core User Actions
- Read user biography, join date, and public statistics
- Follow or unfollow the user
- Browse the user's posts, replies, and media via tabbed navigation
- Access secondary moderation actions (Report Profile, Block User)
- Edit profile details (if viewing self)

## UX States

### Loading
- Profile header skeleton detailing the avatar, username, and bio layout.
- Content tabs are inactive, and the feed area displays standard post skeletons.

### Empty
- User has no posts: "This user hasn't posted anything yet."
- Zero followers/following: Displayed neutrally without emphasis.

### Error
- User does not exist (404/Deleted): "This account cannot be found."
- Feed load failure: "Failed to load timeline", with a localized retry button.

### Rate Limited
- Rapid toggling of Follow/Unfollow prevents further requests and locks the button state temporarily, accompanied by an error toast.

### Banned/Restricted
- **Viewing a suspended user:** A tombstone UI replaces the profile. The bio and feed are entirely hidden, displaying only "This account has been suspended for violating terms of service."
- **Viewing a restricted user:** A warning banner is displayed below the username indicating the account is under review.

## Edge Cases & Abuse Considerations
- **Impersonation UI Defense:** Official system badges (like verification or admin status) must be rendered outside of the user-controlled distinct text boundaries to prevent fake emojis in the display name from spoofing authority.
- **Blocking Mechanics:** If the authenticated user blocks this profile, the UI instantly hides the feed, dims the avatar, and replaces the "Follow" button with an "Unblock" button to prevent any content leakage.

## Notes for Future Expansion
- Profile-pinned posts and mutual connections.
