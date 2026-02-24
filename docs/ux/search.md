# Search UX Flow

## Purpose
A high-speed discovery mechanism for finding users, hashtags, and specific posts across the VYRE network.

## Entry Points
- Search input field in the desktop header or the dedicated "Search" tab on mobile navigation
- Tapping a hashtag in a post

## Core User Actions
- Focus input to view recent searches or trending topics
- Type a query to trigger live, debounced suggestions
- Submit a full query to view categorized results (Tabs: Users, Posts, Tags)
- Clear search history

## UX States

### Loading
- Live search: A subtle, small spinner appears strictly inside the right edge of the text input.
- Full results: Skeleton loading cards mapping to the specific active tab (e.g., circular skeletons for Users, block skeletons for Posts).

### Empty
- Pre-search activation: Displays a history of "Recent Searches" or platform "Trending" topics.
- Zero results: Displays a clear message "No results found for '[query]'" to avoid confusion.

### Error
- Service unavailability: "Search is temporarily unavailable. Please try again later." fallback.

### Rate Limited
- API Quota exceeded: The search input is temporarily disabled and grayed out. Toast: "Slow down. Please wait a moment before searching again."

### Banned/Restricted
- Search remains functional for read-only accounts, but interactions with the resulting posts or users follow the standard restricted state rules (buttons disabled).

## Edge Cases & Abuse Considerations
- **XSS & Injection:** User queries reflected in the "No results for '[query]'" text must be strictly escaped to prevent client-side injection.
- **Content Safety:** If a query hits a heavily moderated or illegal keyword deny-list, the UI must intercept the query client-side and return a hardcoded "No results" or a specific safety warning to prevent the exposure of malicious content.

## Notes for Future Expansion
- Advanced filtering (e.g., date ranges, strict exact-match toggles).
