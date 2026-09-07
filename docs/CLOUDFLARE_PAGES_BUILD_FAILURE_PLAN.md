# Cloudflare Pages Build Failure: Remediation Plan

## Purpose

Resolve the Cloudflare Pages dependency-install failure for the `develop` frontend deployment without changing application features or business logic.

## Observed failure

The deployment stopped before the Vite build started. Cloudflare detected a Yarn lockfile and ran Yarn 4.9.1. Yarn attempted to migrate the existing lockfile, then stopped because Cloudflare runs dependency installation in immutable mode:

> `YN0028: The lockfile would have been modified by this install, which is explicitly forbidden.`

Both the repository root and `Smart_Civic_Platform_Frontend` contain Yarn v1 lockfiles. The frontend also contains a `package-lock.json`. This mixed package-manager metadata lets the build platform choose Yarn even though the frontend can be built with npm.

## Scope and constraints

- Do not change frontend or backend application logic.
- Keep the existing `develop` branch for the development deployment.
- Keep `Smart_Civic_Platform_Frontend` as the Cloudflare Pages root directory.
- Do not add Supabase credentials to source control.

## Preferred remediation: keep Yarn for this Pages project

This is the lowest-risk immediate fix because the frontend has a committed Yarn v1 lockfile.

1. In Cloudflare Dashboard, open **Workers & Pages** and select the development Pages project.
2. Open **Settings** -> **Environment variables**.
3. Add the build variable `YARN_VERSION` with value `1.22.22` for the Preview/development environment.
4. Save the variable.
5. Open **Settings** -> **Builds & deployments** and verify these values:

   | Setting | Required value |
   |---|---|
   | Production branch for this development Pages project | `develop` |
   | Root directory | `Smart_Civic_Platform_Frontend` |
   | Framework preset | `React (Vite)` |
   | Build command | `npm run build` |
   | Build output directory | `dist` |

6. Clear the Pages build cache from the deployment/build settings.
7. Trigger a new deployment of the current `develop` commit.
8. Confirm the log shows Yarn 1.22.22 (not Yarn 4.9.1), dependency installation completes, and the Vite build produces `dist`.

## Alternative remediation: standardize the frontend on npm

Choose this only if npm is the intended package manager for this project. It is a repository-metadata cleanup, not an application-logic change.

1. Confirm the frontend installs and builds successfully using its committed `package-lock.json` on a clean local install.
2. Remove only the frontend Yarn lockfile after that verification.
3. Ensure the Pages root directory remains `Smart_Civic_Platform_Frontend` so the root-level backend/development Yarn lockfile is not considered part of the frontend build.
4. Commit the lockfile cleanup to `develop` with a message that clearly records npm as the frontend package manager.
5. Clear the Pages build cache and redeploy.
6. Do not retain both `package-lock.json` and `yarn.lock` in the frontend folder after standardizing. Exactly one package-manager lockfile should be authoritative.

## What not to do

- Do not delete lockfiles only in Cloudflare's dashboard; fixes must be committed to Git when using Git-based deployment.
- Do not use a build command that bypasses dependency validation as the permanent solution.
- Do not modify source code merely to work around this dependency-install issue.
- Do not put `SUPABASE_SERVICE_ROLE_KEY`, JWT secrets, or SMTP credentials in `VITE_` variables.

## Required environment variable after the build succeeds

Add this to the development Pages deployment, in the appropriate development/preview environment:

| Variable | Value |
|---|---|
| `VITE_API_BASE_URL` | `https://api-dev.jibanneupane.com.np/api` |

Use the real backend URL if the development backend uses a different host. Vite values are embedded into the public frontend build, so this variable must contain only a public API URL.

## Verification checklist

1. The deploy log passes dependency installation.
2. The build command completes with exit code 0.
3. Cloudflare uploads files from `dist`.
4. `dev.jibanneupane.com.np` loads the React application.
5. Browser Developer Tools shows requests going to the intended development API domain.
6. Test a login and one non-destructive API request.
7. Confirm no secrets are exposed in browser source or network responses.

## Recommended decision

Use the **preferred Yarn 1 remediation** for the current deployment. It is a dashboard-only configuration change, preserves the existing Yarn v1 lockfile, and does not alter application logic. Later, standardize package management deliberately in a separate maintenance change.

## References

- Cloudflare Pages lists `npm run build` and `dist` as the React (Vite) build configuration: https://developers.cloudflare.com/pages/configuration/build-configuration/
- Cloudflare Pages supports `YARN_VERSION` as a build-image environment variable: https://developers.cloudflare.com/pages/configuration/build-image/
- Cloudflare Pages requires a root directory for monorepos: https://developers.cloudflare.com/pages/configuration/monorepos/
