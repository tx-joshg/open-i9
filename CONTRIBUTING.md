# Contributing to Open I-9

Thanks for your interest in contributing! This guide will help you get set up and understand how we work.

## Getting Started

1. **Fork the repo** and clone your fork
2. Run the setup script:
   ```bash
   ./setup.sh
   ```
3. Start the dev server:
   ```bash
   npm run dev
   ```
4. Open `http://localhost:3000/admin` and create your admin account

## Development

### Tech stack
- Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS
- Prisma ORM with PostgreSQL (SQLite for local dev)
- pdf-lib for I-9 PDF generation

### Commands
```bash
npm run dev              # Dev server
npm run build            # Production build
npx tsc --noEmit         # Type check (no build)
npm run lint             # Lint
npx prisma migrate dev   # Run migrations
npx prisma studio        # Browse database
```

### Branch naming
- `feat/` — new features (e.g., `feat/bulk-invite-upload`)
- `fix/` — bug fixes (e.g., `fix/ssn-validation`)
- `docs/` — documentation only
- `refactor/` — code changes that aren't features or fixes
- `ci/` — CI/CD changes

## Making Changes

1. Create a branch off `main` with the appropriate prefix
2. Make your changes
3. Run `npx tsc --noEmit` to type check — the build must pass
4. Run `npm run lint` to check for lint errors
5. Commit with a clear message describing what and why
6. Push your branch and open a PR against `main`

### PR requirements
- CI must pass (build + type check + lint)
- At least 1 approval from a maintainer
- Squash merge to keep history clean

## Code Style

- **TypeScript** — use proper types. No `any`.
- **Zod** — validate all API inputs
- **PII** — any new sensitive fields must use `encryptPii()` / `decryptPii()` from `src/lib/pii.ts`
- **Flat code** — avoid deep nesting and unnecessary abstraction
- **No comments for obvious code** — only comment when the "why" isn't clear from the code itself

## Architecture Notes

- All form state lives in the `useI9Form` hook (`src/hooks/useI9Form.ts`)
- File uploads go to `/api/uploads`, return a `fileKey`, stored in form state
- PII is encrypted at the application layer before hitting the database
- The I-9 PDF is generated from a field mapping config (`src/lib/i9-field-mapping.ts`) — not hardcoded field names
- Admin auth uses session tokens stored in the `AdminUser` table, verified by `isAuthorized()` in `src/lib/auth.ts`
- All admin API routes import `isAuthorized` from `@/lib/auth` — don't create inline auth checks

## Reporting Issues

- Use the **Bug Report** or **Feature Request** issue templates
- Include steps to reproduce for bugs
- Check existing issues before creating a new one

## Questions?

Open a discussion or issue — happy to help.
