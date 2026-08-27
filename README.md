# Savley Global Property

A responsive real estate portal built with Express, vanilla JavaScript, Tailwind CDN, and a local JSON data store.

## Run locally

1. Install Node.js 18+.
2. In this folder, run `npm install`.
3. Start the server with `npm start` (or `npm run dev` for Node watch mode).
4. Open `http://localhost:3000`.

The app creates and updates `data/store.json` automatically. Uploaded images are stored in `public/uploads/`.

## Supabase setup

1. Run `supabase-schema.sql` in the Supabase SQL Editor.
2. Set `SUPABASE_URL` and `SUPABASE_SECRET_KEY` in `.env` locally or in your hosting provider.
3. Use the Supabase publishable key only for browser-side integrations. Never expose the secret key or commit `.env`.

When the Supabase variables are configured, listings and user accounts use Supabase. Without them, local development falls back to `data/store.json`.

## Test the flows

- Browse the seeded listings on the home page.
- Click **Sign in**, switch to **Create an account**, and register with an 8+ character password. Accounts are stored with bcrypt password hashes.
- Configure `ADMIN_EMAIL=Savleyglobalproperty@gmai.com`, `ADMIN_PASSWORD`, and `JWT_SECRET` in a local `.env` file before signing in to the admin portal. Publish with an image URL or a local image upload; the new card appears immediately.
- A normal user token receives `403 Admin access required` if it calls the property creation route.

For production, set all three environment variables with strong, private values. The server generates a temporary JWT secret when `JWT_SECRET` is missing, which logs out users whenever the process restarts.

## Publish with Render

1. Push the tracked project files to GitHub. Do not commit `node_modules/`, `.env`, `data/store.json`, or uploaded media; these paths are covered by `.gitignore`.
2. Create a Render Web Service from the GitHub repository.
3. Use `npm install` as the build command and `npm start` as the start command.
4. Add `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and a long random `JWT_SECRET` as Render environment variables.
5. Deploy and open the URL Render provides.

## API

- `GET /api/properties` - public property listing
- `POST /api/auth/signup` - create a user account
- `POST /api/auth/login` - user or admin login
- `POST /api/properties` - admin-only multipart property creation (`title`, `price`, `description`, `imageUrl`, or `imageFile`)
- `DELETE /api/properties/:id` - admin-only property deletion
