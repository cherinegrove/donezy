# Donezy

Professional time tracking and project/task management platform for agencies and teams
working with external clients.

## What's here

- **Frontend**: Vite + React 18 + TypeScript, shadcn/ui, Tailwind CSS, TanStack Query
- **Backend**: Supabase (Postgres, Auth, Storage, Edge Functions)
- **Deployment**: static SPA, configured for Railway/Vercel/Netlify

## Local development

Requires Node.js and npm.

```sh
# Clone the repository
git clone https://github.com/cherinegrove/donezy.git
cd donezy

# Install dependencies
npm install

# Start the dev server
npm run dev
```

The app runs at `http://localhost:8080`.

## Supabase

Edge functions live in `supabase/functions/`, migrations in `supabase/migrations/`.
See `API_DOCUMENTATION.md` for the public REST API.

## Scripts

- `npm run dev` — start the dev server
- `npm run build` — production build
- `npm run lint` — run ESLint
- `npm run preview` — preview a production build locally
