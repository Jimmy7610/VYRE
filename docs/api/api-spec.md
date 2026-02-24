# VYRE API Specification

## Overview
This document outlines the core endpoints for the VYRE application. Currently, these are implemented as stubs for the Beta Runner.

---

### 1. Global Feed
- **Endpoint:** `GET /api/feed/global`
- **Method:** `GET`
- **Auth required:** No (Public Read-Only)
- **Rate limit tier:** High Capacity (e.g., 60 req/min/IP)
- **Input Validation:**
  - `cursor`: optional string (UUID of last post)
  - `limit`: optional integer (1-50, default 20)
- **Abuse Considerations:** Rapid sequential unauthenticated scraping. IP-based throttling and optional proof-of-work/captcha for extreme spikes.

### 2. Create Post
- **Endpoint:** `POST /api/posts`
- **Method:** `POST`
- **Auth required:** Yes (Bearer Token)
- **Rate limit tier:** Low Capacity (e.g., 5 req/min/user)
- **Input Validation:**
  - `content`: required string (Max 500 chars)
  - `image_id`: optional UUID
- **Abuse Considerations:** Spamming large payloads. Payload size must be strictly limited at the gateway before hitting application logic.

### 3. Like Post
- **Endpoint:** `POST /api/posts/:id/like`
- **Method:** `POST`
- **Auth required:** Yes
- **Rate limit tier:** Medium Capacity (e.g., 30 req/min/user)
- **Input Validation:**
  - `id`: required UUID (Post ID)
- **Abuse Considerations:** Repeated toggling to stress DB/cache. Fast-fail unauthenticated requests. Debounce toggling on client.

### 4. Upload Image (Signed URL)
- **Endpoint:** `POST /api/images/sign-upload`
- **Method:** `POST`
- **Auth required:** Yes
- **Rate limit tier:** Extremely Low Capacity (e.g., 2 req/min/user)
- **Input Validation:**
  - `content_type`: required string (Must be image/jpeg, image/png, image/webp)
  - `content_length`: required integer (Max 5MB)
- **Abuse Considerations:** Storage exhaustion. Pre-signed URLs must expire quickly (e.g., 5 mins) and max-size must be enforced by the storage bucket independently.

### 5. Submit Report
- **Endpoint:** `POST /api/reports`
- **Method:** `POST`
- **Auth required:** Yes
- **Rate limit tier:** Low Capacity (e.g., 3 req/10min/user)
- **Input Validation:**
  - `target_id`: required UUID
  - `target_type`: required string (post, profile, comment)
  - `reason`: required string (enum)
- **Abuse Considerations:** False reporting to harass users. Rate limit strictly, and prioritize reports based on reporter reputation in the future.
