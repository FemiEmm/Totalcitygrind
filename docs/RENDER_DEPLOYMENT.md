# Render deployment preparation

The frontend remains at the repository root. Its Netlify base directory and build command stay unchanged. Two independent Node packages are now included in this repository:

| Service | Root directory | Build command | Start command | Health path |
| --- | --- | --- | --- | --- |
| Backender | services/backender | npm ci --omit=dev | npm start | /health |
| Multiplayer | services/game-server | npm ci --include=dev && npm run build | npm start | /health |

Each package includes its own package-lock.json and .node-version (22.19.0). The multiplayer build installs TypeScript even when NODE_ENV is production. Backender does not need a compilation step or a local .env file to start on Render.

## Scope completed

Source and static game catalogues have been copied into the repository. Root and package ignore rules exclude environment files, installed dependencies, private certificates, exports and runtime saves. Only placeholder environment examples are included. Original sibling folders and local accounts have not been moved or deleted.

Production startup requires HTTPS origins, private keys and authenticated multiplayer. Backender refuses file storage in production and requires the Supabase PostgreSQL connection. Both services listen on Render's PORT and bind to 0.0.0.0. The Supabase schema 2 migration has already been reported as applied by the owner.

No packages were installed, builds/tests/checks run, commits made, pushes performed or services deployed during preparation.

## Deploy after pushing

Create Backender first with the table settings. Use services/backender/.env.render.example as the environment checklist. DATABASE_URL must be the private Supabase session-pooler PostgreSQL URI with the database password, not the Supabase HTTPS project URL or publishable key. Use distinct random SERVICE_ROLE_KEY and JWT_SECRET values of at least 32 characters. ANON_KEY is the separate public client key used by this custom Backender API. Keep the JWT secret stable across redeploys.

If a database CA certificate is required, upload it through Render Secret Files and set DATABASE_CA_FILE to its mounted path, for example /etc/secrets/supabase-ca.crt. TLS certificate verification stays enabled. Do not commit certificates or database credentials.

Then create the multiplayer service. Follow services/game-server/.env.render.example. Set BACKEND_URL to the deployed Backender HTTPS URL. Match BACKEND_ANON_KEY with Backender ANON_KEY and BACKEND_SERVICE_ROLE_KEY with its private SERVICE_ROLE_KEY. Keep BACKEND_PROVIDER=backender: Supabase stores the database while Backender still owns the account API. Use one multiplayer instance because presence is currently stored in that process.

Both CLIENT_ORIGINS values currently use https://totalcitygrind.netlify.app. Update them if the actual frontend address changes. Do not include paths or trailing slashes.

Finally set these public variables on Netlify and redeploy the frontend:

- VITE_BACKEND_URL: deployed Backender HTTPS URL.
- VITE_GAME_SERVER_URL: deployed multiplayer HTTPS URL.
- VITE_BACKEND_ANON_KEY: Backender ANON_KEY.

Never give Netlify/browser VITE variables the service key, JWT secret or database connection string.

## Optional Blueprint

render.yaml describes the same two Web Services. For a Blueprint deployment it generates distinct keys, shares the matching keys with the game server and asks for DATABASE_URL. It references Backender's Render-provided external URL. Manual New Web Service setup does not automatically apply the Blueprint: enter the settings above yourself. Choose one deployment method to avoid duplicate services.

The template requests free instances. Review Render's uptime and resource limits before the public launch; the 100-player configuration is a limit, not a measured capacity guarantee. World settlement still uses one shared database transaction lock. Free-plan details: https://render.com/docs/free

Configuration reference: https://render.com/docs/blueprint-spec
Monorepo reference: https://render.com/docs/monorepo-support

## Local development

npm run dev:connected and npm run dev:supabase prefer services/ folders once their dependencies and private environment files are configured. Until then, they use the original sibling folders when available and print that choice. No private files were copied. You can explicitly choose paths with TCG_BACKENDER_DIR and TCG_SERVER_DIR.

For future service changes, edit the copies in services/. Catalog sync scripts now target services/backender. The sibling folders are retained only for the existing local setup; they do not receive future changes automatically. To use the bundled services locally, install dependencies inside each package and configure its ignored local environment files with matching keys. Local test accounts stay in the original data file until deliberately copied; cloud deployment must continue using PostgreSQL.
