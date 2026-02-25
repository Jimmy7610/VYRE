# VYRE Architecture Audit - Level A (Quick Wins)

## What We Found (Top Issues)
1. **No formatting/linting baseline**: The project lacked Prettier and ESLint, leading to inconsistent code styles and potential hidden bugs.
2. **Layering smells**: The API layer (`/api/feed.ts`, `/api/profile.ts`) resided outside of the `src` directory but imported internals from `src/lib`, blurring the frontend vs. api boundaries.
3. **Implicit/Missing Types**: Database returns from Supabase were widely typed as `any`, causing fragile UI bindings and repeated inline type definitions without a central source of truth.
4. **Duplicate Imports**: Scattered, duplicate imports within `main.ts` (e.g., `createPost`, `uploadImage`) creating unnecessary compiler noise.
5. **Missing Export Barriers**: Type files were not centrally exported, requiring deep imports everywhere.
6. **Package script inconsistencies**: Missing standard lint and format scripts out-of-the-box.
7. **Malformed HTML**: Unclosed nested div wrappers and duplicated style attributes existed at the end of `index.html`.
8. **Loose Schema Documentation**: `schema.sql` lacked explicit warnings that it functioned as a snapshot, rather than the active migration authority.
9. **ESLint 9 Compatibility**: Outdated config style was being loaded by default under ESLint 9, requiring a conscious downgrade to v8 for stable, minimal friction linting. 
10. **One-Liner / Minified artifacts**: While minimal, some files lacked proper line-breaks and readability formatting before the automated sweep.

## What We Changed
- **Configured Tooling**: Added ESLint (v8) and Prettier with minimal, non-disruptive rules.
- **Enforced Formatting**: Formatted the entire codebase (`npm run format`), fixing trailing commas, quotes, and structural spacing.
- **Relocated API Layer**: Moved the `/api` directory natively into `/src/api` to resolve circular or awkward up-tree imports.
- **Domain Typing**: Created explicit TypeScript interfaces in `/src/types` (`Post`, `Comment`, `Profile`, `SupabaseDevError`) and globally swapped them out in the API handlers.
- **Docs Update**: Synced `schema.sql` with an informational advisory emphasizing Supabase as the source of truth.

### Commits Created:
1. `Chore: add prettier + eslint + format repo`
2. `Chore: move api layer into src and fix imports`
3. `Chore: add core types for feed/profile/comments`
4. `Docs: sync schema and add audit report`

## What We Intentionally Did NOT Touch
- **Backend Schema**: No tables, relationships, or migrations were altered.
- **UI Redesign**: Preserved the exact layout, colors, and components (no CSS changes).
- **Core Logic**: Retained all existing user comment tracking, Beta read-only blocking logic, real-time subscriptions, and Supabase client setups.
- **Existing User Comments in Code**: Preserved all inline instructional comments for the developers.

## Risks & Follow-ups
### Level B (Security & Performance)
- **Row Level Security (RLS)**: The database needs strict RLS policies bound to `auth.uid()` to prevent horizontal privilege escalation or data scraping.
- **Indexes**: Need covering indexes on `author_id` and composite indexes for `deleted_at IS NULL` to support feed queries efficiently as the table grows.

### Level C (Architecture v1)
- **Component Componentization**: `main.ts` is growing exceptionally large (~1300 lines). We need to split the application into proper UI components or modules (e.g., `FeedView`, `ProfileView`, `SettingsView`).
- **State Management**: The app relies on heavy DOM querying and direct mutation. Implementing a lightweight reactive state store (e.g., signals, or a light library) will stabilize updates.
- **Pagination**: The global feed loads all posts into memory. A cursor-based or offset limit paginator is required for scaling.
