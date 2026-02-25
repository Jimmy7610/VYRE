# Level B Hardening - Baseline Verification Notes

**Date:** 2026-02-25
**Engineer:** Antigravity

## Baseline Check (Post Level A)

- **Feed Load:** Confirmed working. All mock and real posts load.
- **Like Toggle:** Works seamlessly (optimistic UI holds).
- **Comments Drawer:** Opens, input accepts text, submit attempts to auth.
- **Image Upload:** Current path is `public/`. Will need modification to `userId/` for logical RLS partitioning.
- **Read-Only Beta:** Toast fires specifically blocking settings changes. Global interactions are also monitored.
- **Realtime:** Verified active. Supabase channel is subscribing successfully to `public` schema changes.

## Goal

Proceed with Level B: Secure the database with strict RLS policies, secure Storage buckets using path-based folder restrictions, implement partial indexes for performance, and refactor global feed load into cursor-based pagination.
