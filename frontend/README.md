# Frontend (React + Vite)

This folder contains the frontend for the Carpool System project — a React app built with Vite.

## Quick start

1. Open a terminal (Windows: use cmd.exe or PowerShell). Prefer cmd.exe if you have PowerShell execution policy restrictions.
2. Install dependencies (from project root or run with --prefix):

   ```cmd
   cd /d "frontend"
   npm install
   ```

3. Start the dev server:

   ```cmd
   npm run dev
   ```

## Useful scripts (in `package.json`)

- `npm run dev` — start Vite dev server (HMR)
- `npm run build` — build production bundle
- `npm run preview` — preview the production build locally
- `npm run lint` — run ESLint across the frontend source

## Troubleshooting (Windows)

- If PowerShell reports `npm.ps1 cannot be loaded because running scripts is disabled`, run the commands in `cmd.exe` or call `npm.cmd` directly:

  ```powershell
  & "$env:ProgramFiles\nodejs\npm.cmd" install
  & "$env:ProgramFiles\nodejs\npm.cmd" run dev
  ```

- If you need to change PowerShell's execution policy (only if you understand the security implications):

  ```powershell
  Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned -Force
  ```

## Notes

- The app uses third-party APIs (OpenStreetMap Nominatim) for place suggestions and Leaflet for maps. When running locally expect network calls to those services.
- The frontend expects the backend API to be available (defaults in fetch/axios calls point to `http://localhost:3000`). If your backend runs on a different port, update API URLs in the frontend accordingly.

If you see any lint/runtime errors when you run `npm run lint` or `npm run dev`, paste the output here and I will fix the reported issues.

Happy hacking!
