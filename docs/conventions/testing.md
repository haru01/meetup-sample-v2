# Testing Conventions

## Backend
- Unit tests: `__tests__/*.test.ts` alongside target module, mock repositories/services
- E2E tests: `__tests__/*.e2e.test.ts` using supertest + isolated SQLite per test suite
- `createTestPrismaClient()` from `infrastructure/test-helper.ts` creates temp DB with `prisma db push`
- `clearMeetupTables(prisma)` / `clearAuthTables(prisma)` for cleanup between tests
- `createApp(testPrismaClient)` — app factory accepts PrismaClient for test isolation
- Coverage threshold: 80% minimum

## Frontend
- Component tests: `__tests__/*.test.tsx` using Vitest + React Testing Library
- Pure function tests: `__tests__/*.test.ts` (e.g., `meetup/utils/__tests__/label-utils.test.ts`)
- Hook tests: `__tests__/*.test.ts` using `renderHook` with mocked API client
- Page tests are not used — component tests + pure function tests + E2E でカバー
- JSDOM environment, `@testing-library/jest-dom/vitest` setup
- Mock `apiClient` and `token` modules with `vi.mock`

## E2E
- Playwright tests in `e2e/tests/*.spec.ts`
- `webServer` config auto-starts backend (port 3000) and frontend (port 5173)

## Test naming
- テストの describe/it は日本語で記述する
- **Acceptance criteria mapping**: Each issue acceptance criterion maps 1:1 to a test name
