# Report Flow UX Flow

## Purpose
A critical, frictionless path for users to report content or profiles that violate system security, safety, or terms of service.

## Entry Points
- Overflow menu (three dots) on any Post, Comment, Profile, or Direct Message
- Embedded "Report" links in the moderator console

## Core User Actions
- Initiate report
- Select a primary reason (e.g., Spam, Harassment, Illegal Content, Custom)
- Optionally provide additional context via a text area
- Submit the report and receive a confirmation
- Optionally Block the reported user immediately after submission

## UX States

### Loading
- Submission: The "Submit" button turns into a spinner. The modal remains open to prevent accidental dismissal during the network request.

### Empty
- If an invalid reason ID is provided in the URL, gracefully fall back to the top-level selection list.

### Error
- Submission failure: "We couldn't process this report right now. Please try again." Form data remains intact.

### Rate Limited
- Abuse of the reporting system: If a user submits an anomalous number of reports in a short time, they receive a generic success message (to avoid revealing the throttle to bad actors), but the payload is silently de-prioritized or dropped backend-side.

### Banned/Restricted
- Restricted users maintain full access to the reporting tool to ensure physical/systemic safety issues can always be escalated.

## Edge Cases & Abuse Considerations
- **Context Injection:** The client must securely bundle the target's ID and type (Post/User) without exposing manipulation vectors in the DOM that would allow a user to alter the target mid-submission.
- **Post-Report Mitigation:** Immediately after a successful report, the UI must proactively hide the reported content from the reporter's local view (client-side mitigation) and prompt them with a "Block User?" action to ensure psychological safety.

## Notes for Future Expansion
- Transparency dashboard tracking the status of submitted reports.
