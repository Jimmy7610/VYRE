# Access Control Map

This matrix defines the strict boundaries of data access based on user roles and resource targets.

| ROLE | ACTION | RESOURCE | STATUS | NOTES |
| :--- | :--- | :--- | :--- | :--- |
| **Anonymous** | read | Public Profiles (`deleted_at IS NULL`) | **ALLOWED** | Read-only discovery. |
| **Anonymous** | read | Posts/Comments | **ALLOWED** | Read-only discovery. |
| **Anonymous** | write | Any | **DENIED** | Must authenticate to mutate. |
| | | | | |
| **Auth User** | read | Other Public Profiles | **ALLOWED** | Suspended profiles are hidden. |
| **Auth User** | update | Own Profile (`id = auth.uid()`) | **ALLOWED** | Restricted columns (like `is_suspended`) are locked. |
| **Auth User** | write | Posts/Comments | **ALLOWED** | Blocked if `is_restricted = TRUE`. |
| **Auth User** | update | Own Posts | **ALLOWED** | Soft-delete only. |
| **Auth User** | read/write | DMs / `dm_messages` | **DENIED** | Unless they are a participant. |
| **Auth User** | write | Reports | **ALLOWED** | Can report any content or user. |
| **Auth User** | read | Moderation Actions | **DENIED** | Strictly hidden. |
| | | | | |
| **Content Owner**| update | Own Comments / Posts | **ALLOWED** | Soft deletes (`deleted_at = NOW()`). |
| **Content Owner**| delete | Own Account | **ALLOWED** | Must use specific secure RPC for full wipe. |
| | | | | |
| **Follower** | read | Follower-only DMs | **ALLOWED** | DM creation requires mutual follow check. |
| **Follower** | read | Following Feed | **ALLOWED** | Aggregation of posts from followed users. |
| | | | | |
| **Moderator** | read | All Profiles (incl. Suspended) | **ALLOWED** | Triages reports and assesses banned users. |
| **Moderator** | read | All Posts (incl. deleted) | **ALLOWED** | Requires JWT claim (`role: moderator`). |
| **Moderator** | read | DMs / `dm_messages` | **DENIED** | Moderators cannot read private DMs proactively. Can only read if a specific message is explicitly Reported. |
| **Moderator** | moderate| Users / Content | **ALLOWED** | Execute suspensions, content deletions. |
| **Moderator** | update | `reports` status | **ALLOWED** | Mark reports as resolved/dismissed. |
| **Moderator** | delete | Audit Logs | **DENIED** | Audit logs are immutable. |
| | | | | |
| **Super Admin** | moderate| Moderators | **ALLOWED** | Promote/demote moderator roles. |
| **Super Admin** | read | All Data | **ALLOWED** | Using Postgres `service_role` securely. |
| **Super Admin** | delete | Any Data | **ALLOWED** | Hard deletes permitted via `service_role`. |

## Key Trade-offs & Risks
1. **DM Privacy vs Moderation:** Moderators are completely blind to DMs unless explicitly reported by a participant. This protects privacy but means proactive scanning of grooming/abuse within DMs is not possible without automated ML models reviewing payloads in transit or specialized server-side triggers.
2. **Soft Deletes vs GDPR:** The system relies heavily on `deleted_at`. To comply with GDPR "Right to be Forgotten", an asynchronous cron job or edge function must be scheduled to convert soft deletes to hard deletes after a holding period (e.g., 30 days).
3. **Write-Time Checks:** Enforcing follower-only DM rules within RLS `INSERT` policies creates complex sub-queries. It may impact database write performance at extreme scale. Alternative is handling DM thread creation strictly via RPC functions.
