# VYRE

A security-first social platform built around public signal, not noise.

## Core Toolchain (Locked)
**Do not upgrade these dependencies without an explicit architectural step:**
- **Node.js:** v20+
- **Vite:** 6.x
- **TypeScript:** 5.x
- **Tailwind CSS:** 4.x (`@tailwindcss/postcss`)

## Local Development (Beta Shell)

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Environment Variables**
   Ensure you have a `.env` file in the root directory:
   ```env
   VITE_BETA_MODE=true
   ```
   *(Note: This flag enables the temporary Beta Access button on the landing page bypassing auth workflows. It MUST be removed or set to `false` for production.)*

3. **Start Development Server**
   ```bash
   npm run dev
   ```
   *or manually via:*
   ```bash
   npx vite --port 5173 --host
   ```

4. **Access**
   Open your browser to `http://localhost:5173`.
