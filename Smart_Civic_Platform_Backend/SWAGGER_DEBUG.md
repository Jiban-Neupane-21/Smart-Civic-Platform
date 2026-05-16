# Swagger UI shows no endpoints — diagnosis and fix

## What is happening

Your backend console shows:

- `[swagger] Scanning 7 route file(s): ...`
- `Swagger paths loaded: 38`

That means `src/config/swagger.ts` is finding route files and `swagger-jsdoc` is generating an OpenAPI spec with paths.

However, Swagger UI at `http://localhost:3000/api/docs` may still appear empty if the JSON being loaded is invalid, missing, or not the same spec that was counted.

## Why this happens in this project

In this codebase, Swagger docs are generated from `@swagger` JSDoc comments inside `src/routes/*.ts` files.

Important points:

- `src/config/swagger.ts` only builds the base OpenAPI definition and scans route files.
- The actual route definitions come from comments in `src/routes/*.ts`, not from the Express router mounting itself.
- `swagger-jsdoc` reads those comments and produces `paths`.
- Startup logs count the resulting paths, but Swagger UI loads JSON separately from `/api/docs/swagger.json`.

So the issue is usually one of these:

1. The JSON endpoint is not reachable or returns an empty spec.
2. `swagger-ui-express` is configured to request the wrong JSON URL.
3. `@swagger` comments are not present in the files actually scanned at runtime.
4. The project is running from a wrong build output directory, and `dist/routes/*.js` does not preserve comments.

## How to verify the root cause

1. Open the raw JSON in the browser:
   - `http://localhost:3000/api/docs/swagger.json`
2. Check the response:
   - It must be valid JSON.
   - `paths` should be a non-empty object.
   - The path count should match the console log.
3. If `paths` is empty, the bug is in Swagger generation, not in Swagger UI.
4. If `paths` is populated but the UI is blank, the UI is probably failing to load the JSON or render it.
   - Use browser DevTools → Network to see if `/api/docs/swagger.json` loads successfully.
   - Check the browser console for Swagger UI errors.

## Common project-specific causes

### 1. Running production build without preserved JSDoc comments

If you run the compiled app from `dist/`, `swagger-jsdoc` may scan `dist/routes/*.js` instead of `src/routes/*.ts`.

- TypeScript compilation often strips or alters comments.
- If the compiled route files do not retain the `@swagger` blocks, then `paths` becomes empty.
- The fix is to run in development mode or ensure the build copies/preserves route comments.

### 2. Wrong working directory when starting the server

`src/config/swagger.ts` resolves route paths relative to `process.cwd()`.

- Start the server from the project root: `D:\Smart-Civic-Platform\Smart_Civic_Platform_Backend`
- If you launch from another folder, `src/routes` may not be found.

### 3. Swagger UI configured with the wrong JSON URL

In `src/index.ts`, Swagger UI is mounted with:

```ts
swaggerOptions: {
  persistAuthorization: true,
  displayRequestDuration: true,
  url: "/api/docs/swagger.json",
},
```

That is normally correct, but if the UI page is served from a different base path or proxy, the browser may request the wrong file.

## Practical fix strategy

Follow these steps:

1. Open `/api/docs/swagger.json` directly.
2. Confirm `paths` contains endpoint definitions.
3. If it does not, fix `@swagger` comments in `src/routes/*.ts` or run in dev mode.
4. If it does, clear the browser cache and reload `/api/docs`.
5. If the UI still fails, inspect Network + Console for failed requests or JS errors.

## Bottom line

The most likely issue is that Swagger docs are generated from `src/routes/*.ts` comments and not from the Express routes themselves. Even though the server prints `Swagger paths loaded: 38`, the UI can still fail if the JSON endpoint is not loaded correctly or if the runtime route files do not contain preserved `@swagger` comments.

## Recommended check

- `npm run dev` / `yarn dev` for local docs generation
- `http://localhost:3000/api/docs/swagger.json` should show a non-empty `paths` object
- `http://localhost:3000/api/docs` should then display the endpoints

If you want, I can also help you narrow this down to the exact route or build-mode problem in your current setup.