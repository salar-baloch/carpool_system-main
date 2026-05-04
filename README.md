# CarPool System

Lightweight full-stack Carpool application (React + Express + Prisma). This repo contains a React frontend (Vite) and an Express backend using Prisma for data access. The backend is configured to use SQLite by default for local development (see `backend/prisma/dev.db`).

## Quick overview

- Frontend: Vite + React, Tailwind CSS, Leaflet (maps)
- Backend: Node + Express, Prisma (SQLite by default), JWT auth
- Database: SQLite by default (file at `backend/prisma/dev.db`). Optional: can be pointed at PostgreSQL or another provider by changing `DATABASE_URL`.

## Features

- User authentication (JWT)
- Share rides (create trips)
- Search rides and request to join
- Messaging and notifications for trips
- Document upload and simple admin review flow
- Ratings for completed trips

## What changed from older README

- The backend uses Prisma + SQLite by default (not PostgreSQL). A sample SQLite DB (`dev.db`) and migrations are included under `backend/prisma/`.
- Frontend is a Vite app (dev server default port: 5173). Backend listens on port 3000 by default.

## Preview

A small preview of the most recent UI (simplified mock). The image is stored in the frontend assets so it can be updated along with the UI.

<img width="950" height="442" alt="image" src="https://github.com/user-attachments/assets/03aad053-f7e3-4ead-a398-e9a9c8ae75a7" />


## Requirements

- Node.js (v16+ recommended)
- npm or yarn

## Setup (local development)

1. Clone the repository

```bash
git clone <repo-url>
cd carpool_system-main
```

2. Backend

- Install dependencies

```bash
cd backend
npm install
```

- Create a `.env` in `backend/` (example values below)

```env
PORT=3000
DATABASE_URL="file:./prisma/dev.db"
JWT_SECRET=my_jwt_secret
# Optional (for SMS notifications)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_FROM_NUMBER=
# Admin credentials used by the demo admin login
ADMIN_EMAIL=admin@carpool.local
ADMIN_PASSWORD=Admin@12345
NODE_ENV=development
```

- Initialize the database (if you want to apply migrations or recreate DB)

If you want to run Prisma migrations (development):

```bash
npx prisma migrate dev --name init
```

Or to push the current schema to the database without creating a migration (fast):

```bash
npx prisma db push
```

- Start the backend server

```bash
node index.js
```

Notes:
- The repository includes a working `backend/prisma/dev.db` for quick local testing. If you prefer PostgreSQL, set `DATABASE_URL` accordingly (the migrations folder contains SQL that can be used) and run the appropriate Docker command to start Postgres.

3. Frontend

- Install dependencies and run the dev server

```bash
cd ../frontend
npm install
npm run dev
```

- Open the frontend in your browser (Vite default):

http://localhost:5173

4. Common endpoints (backend)

- POST /register — register a new user
- POST /login — login (returns JWT)
- POST /create-trip — create a ride (authenticated)
- GET /search-rides?from=...&to=...&date=YYYY-MM-DD — search rides (authenticated)
- POST /request-ride — request a spot (authenticated)

Add the Authorization header to requests that require authentication: `Authorization: Bearer <token>`

## Development tips

- If you'd like automatic server reloads while editing the backend, install nodemon globally or as a dev dependency and run `npx nodemon index.js`.
- Use the Prisma Studio UI to inspect data:

```bash
npx prisma studio --schema=prisma/schema.prisma
```

## Contributing

Contributions are welcome. Typical workflow:

1. Fork
2. Create a feature branch
3. Open a PR with a clear description of the change

## Acknowledgments

- React, Vite, Tailwind, Express, Prisma, Leaflet

---

Happy carpooling �

