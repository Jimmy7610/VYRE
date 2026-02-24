# Moderator Console UX Flow

## Purpose
An internal-facing, highly restricted dashboard for administrators to triage reports, ban users, and enforce platform security.

## Entry Points
- Hidden/Obfuscated URL (`/admin/triage` or similar)
- Only accessible if the authenticated user's JWT contains specific role claims

## Core User Actions
- View queues of algorithmic and user-submitted reports
- Lock, delete, or flag specific content
- Suspend, ban, or restrict specific user accounts
- Append internal audit notes to actions taken

## UX States

### Loading
- High-density data grid loading states. Heavy use of pagination spinners to handle large queues.

### Empty
- Queue empty: "No pending reports in this queue. Great job."

### Error
- Action failure (e.g., trying to ban an already banned user): "Action failed: State mismatch. Please refresh."
- Unauthorized: Immediate, hard redirect to the public home feed if standard user attempts access.

### Rate Limited
- Admins are generally exempt from strict rate limits, but destructive actions (e.g., bulk banning) should rely on a confirmed batching UI rather than rapid single clicks.

### Banned/Restricted
- A moderator account that has been compromised and subsequently restricted completely loses access to the console and is treated as a standard banned user.

## Edge Cases & Abuse Considerations
- **CSRF / Action Forgery:** Every action in this console must require strictly validated nonces or isolated CSRF tokens. The UI must clearly differentiate between "Action Taken" and "Action Failed".
- **Sensitive Content Burnout:** CSAM or extreme graphic violence must be blurred out by default in the queue, requiring the moderator to explicitly click "Reveal" to assess it, minimizing psychological harm.

## Notes for Future Expansion
- Audit logging UI to track which moderators took specific actions.
