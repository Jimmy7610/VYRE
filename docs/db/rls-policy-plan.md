# Row Level Security (RLS) Policy Plan

## Philosophy

- **Default Deny:** Every table starts locked down.
- **Identity via `auth.uid()`:** All policies anchor to the authenticated user ID injected securely by Supabase.
- **Soft Deletes Context:** `deleted_at IS NULL` is globally applied to public read policies.
- **Moderator Escapes:** Moderators have elevated `jwt` claims (e.g., `auth.jwt() ->> 'role' = 'moderator'`) allowing them selectively bypassed read access.

---

### 1. `users`

- **SELECT:** Users can read their own row (`id = auth.uid()`).
- **INSERT:** Handled exclusively via Supabase Auth server-side triggers. Denied to public.
- **UPDATE:** Users can update their own row (`id = auth.uid()`), restricted to specific safe columns.
- **DELETE:** Denied. Account deletion should be handled via an RPC/Edge Function to ensure complete GDPR cleanup safely.

### 2. `profiles`

- **SELECT:**
  - _Public:_ Anyone can read where `deleted_at IS NULL` AND `is_suspended = FALSE`.
  - _Self:_ Full access (`id = auth.uid()`), even if suspended.
  - _Moderator:_ Full access via JWT claim.
- **INSERT:** Users can insert their own profile on signup (`id = auth.uid()`).
- **UPDATE:** Users can update their own profile (`id = auth.uid()`). Attempting to modify `is_restricted` or `is_suspended` is denied (checked via trigger or granular column policies).
- **DELETE:** Users can soft-delete their own profile (`UPDATE deleted_at = NOW() WHERE id = auth.uid()`). Hard deletes are denied.

### 3. `posts`

- **SELECT:**
  - _Public:_ Anyone can read where `deleted_at IS NULL`.
  - _Author:_ Full access (`author_id = auth.uid()`).
  - _Moderator:_ Full access.
- **INSERT:** Authenticated users can insert where `author_id = auth.uid()`. (Blocked if `is_restricted = TRUE` via a separate sub-query or claim check).
- **UPDATE:** Authors (`author_id = auth.uid()`) can only perform soft deletes. Content edits are denied implicitly if the design explicitly forbids editing. If allowed, `author_id = auth.uid()`.
- **DELETE:** Denied. Authors must soft-delete instead via `UPDATE`.

### 4. `post_images`

- **SELECT:** Mirrors `posts`. Anyone can view where the parent post `deleted_at IS NULL`.
- **INSERT:** Authors can insert where they own the `post_id`.
- **UPDATE:** Denied. Images shouldn't change post-publish for security hash integrity.
- **DELETE:** Denied. Cascade deleted when the parent post is archived or strictly unlinked via soft-delete of the post.

### 5. `follows`

- **SELECT:** Public read access (with privacy toggles, if a user goes private, this policy dynamically checks the privacy column of `following_id`).
- **INSERT:** User can insert where `follower_id = auth.uid()`.
- **UPDATE:** Denied.
- **DELETE:** User can delete where `follower_id = auth.uid()`.

### 6. `likes`

- **SELECT:** Public. Limits may apply to hide global like histories if intended.
- **INSERT:** User can insert where `user_id = auth.uid()`.
- **UPDATE:** Denied.
- **DELETE:** User can delete where `user_id = auth.uid()`.

### 7. `comments`

- **SELECT:**
  - _Public:_ Anyone where `deleted_at IS NULL`.
  - _Author/Moderator:_ Full access.
- **INSERT:** Authenticated users where `author_id = auth.uid()`. (Blocked if restricted).
- **UPDATE:** Authors can soft-delete their comments. Modifying `content` is allowed conditionally based on product rules.
- **DELETE:** Denied. Soft delete via `UPDATE`.

### 8. `dms` (Threads)

- **SELECT:** Participants only. `user1_id = auth.uid() OR user2_id = auth.uid()`.
- **INSERT:** Authenticated users where `auth.uid() IN (user1_id, user2_id)`. Further restricted to ensure the other user is a mutual follower (sub-query inside the policy check).
- **UPDATE:** Participants can update (e.g., soft-delete the visible thread state for themselves if schema expands to support individual thread hiding).
- **DELETE:** Denied.

### 9. `dm_messages`

- **SELECT:** Participants of the parent `dm_id` ONLY. A join check ensures `auth.uid()` belongs to the `dms` row.
- **INSERT:** Participants of the parent `dm_id`. Must set `sender_id = auth.uid()`.
- **UPDATE:** Senders (`sender_id = auth.uid()`) can soft-delete their own messages. Participants can update `is_read = TRUE` where they are NOT the sender.
- **DELETE:** Denied. Soft delete only.

### 10. `notifications`

- **SELECT:** Recipients only (`user_id = auth.uid()`).
- **INSERT:** Denied via client. Only system roles or database triggers (service_role) can create notifications to prevent spoofing.
- **UPDATE:** Recipients can set `is_read = TRUE` (`user_id = auth.uid()`).
- **DELETE:** Recipients can delete their own notifications.

### 11. `reports`

- **SELECT:**
  - _Reporter:_ Can view their own reports (`reporter_id = auth.uid()`).
  - _Moderator:_ Full access via JWT claim.
  - _Accused:_ Strictly denied.
- **INSERT:** Authenticated users (`reporter_id = auth.uid()`). Rate limits handled via edge functions.
- **UPDATE:** Denied to users. Moderators only.
- **DELETE:** Denied structurally.

### 12. `moderation_actions`

- **SELECT:** Moderators / Super Admins only (via JWT claim). Completely hidden from public and standard users.
- **INSERT:** Moderators only (via Edge Function with service_role).
- **UPDATE:** Denied. Must be an immutable audit log.
- **DELETE:** Denied.
