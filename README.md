# Voticus

Photo and creative competitions for a Discord community. An admin creates a competition, approved members submit one entry each with up to ten images, then vote once for their favourite.

- `Voticus.Api`: ASP.NET Core 10 API with EF Core and SQLite for local development.
- `Voticus.Api.Tests`: xUnit integration tests against an in-memory SQLite database.
- `Voticus.Client`: React 19, TypeScript, MUI and Vite. Tests with Vitest and React Testing Library.

Design and acceptance criteria live in `design-spec.md` (kept outside the repo).

## Prerequisites

- .NET SDK 10
- Node 20.19 or later and npm
- `dotnet-ef` tool (`dotnet tool install -g dotnet-ef`)

## First run

### 1. Restore

```bash
dotnet restore
```

```bash
cd Voticus.Client && npm install
```

### 2. Secrets

The JWT signing key and the development seed passwords are never in source. Set them with user secrets from the repo root. The key must be at least 32 characters.

```bash
dotnet user-secrets set Jwt:Key "replace-with-a-random-string-of-at-least-32-chars" --project Voticus.Api
```

```bash
dotnet user-secrets set Seed:AdminPassword "Admin1234!" --project Voticus.Api
```

```bash
dotnet user-secrets set Seed:MemberPassword "Member1234!" --project Voticus.Api
```

Passwords need at least 6 characters with a digit, an upper and lower case letter and a symbol (Identity defaults).

In a hosted environment use environment variables instead: `Jwt__Key`, `Cors__AllowedOrigins__0`, `Storage__LocalPath`, `ConnectionStrings__DefaultConnection`.

### 3. Database and seed

In the Development environment the API applies pending migrations on startup and, when `Seed:Enabled` is true (it is in `appsettings.Development.json`) and the database has no users, seeds:

| Account | Role | Password secret |
|---|---|---|
| `admin@voticus.local` | Admin and Approved | `Seed:AdminPassword` |
| `member1@voticus.local` to `member3@voticus.local` | Approved | `Seed:MemberPassword` |
| `pending@voticus.local` | Member, not approved | `Seed:MemberPassword` |

It also creates one open and one closed competition with entries, generated images and votes.

To apply migrations by hand instead:

```bash
dotnet ef database update --project Voticus.Api
```

To start again from scratch, stop the API and delete `Voticus.Api/voticus.db` (plus any `-wal` and `-shm` files). The next start recreates and reseeds it.

### 4. Run the API

```bash
dotnet run --project Voticus.Api --launch-profile http
```

The API listens on `http://localhost:5273`. OpenAPI JSON is at `/openapi/v1.json` in Development. Health is at `/health`.

### 5. Run the client

```bash
cd Voticus.Client && npm run dev
```

The client runs on `http://localhost:5173` and reads the API address from `.env.development`.

## Tests and checks

```bash
dotnet test
```

```bash
cd Voticus.Client && npm test
```

```bash
cd Voticus.Client && npm run lint && npm run build
```

## Configuration reference

All settings are in `Voticus.Api/appsettings.json` with development overrides in `appsettings.Development.json`.

| Key | Purpose |
|---|---|
| `Jwt:Key`, `Jwt:Issuer`, `Jwt:LifetimeDays` | Token signing. Key from secrets or environment only. |
| `Cors:AllowedOrigins` | Array of allowed front-end origins. |
| `Storage:LocalPath` | Folder for uploaded images. Relative paths resolve against the content root. |
| `RateLimiting:Auth`, `RateLimiting:Vote` | `PermitLimit` per `WindowSeconds`, per IP for auth and per user for votes. |
| `Seed:Enabled`, `Seed:AdminPassword`, `Seed:MemberPassword` | Development seed. Passwords from secrets. |

## Notes

- The repo has its own `nuget.config` pointing at nuget.org only, so restores do not depend on private feeds in your global config.
- `voticus.db` and the image folder are ignored by git.
