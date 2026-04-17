# Coding Conventions

## ファイル・命名

- File names: `kebab-case` with role suffix (`.usecase.ts`, `.repository.ts`, `.schema.ts`, `.controller.ts`, `.e2e.test.ts`)
- Functions: max 50 lines, files: max 400 lines (hard limit 800)
- `any` type is forbidden, use named exports (no default exports)

## ドメインロジック

- Factory functions (`create*()`) and transition functions return `Result<T, E>`
- **UseCases are orchestration only** — domain logic belongs in `models/`
- Forbidden in UseCases: `new Date()`, direct ID generation, spread syntax for aggregate partial updates
- Zod schemas: domain constraints in `models/schemas/*.schema.ts`, controllers add `.openapi()` metadata only. No inline literal unions — use schema-inferred types and constants everywhere

## Path Aliases (Backend only)

Defined in tsconfig.json, resolved via `tsx` at runtime and `resolve.alias` in vitest:

- `@/*` -> `src/*`
- `@shared/*` -> `src/shared/*`
- `@auth/*` -> `src/auth/*`
- `@meetup/*` -> `src/meetup/*`
