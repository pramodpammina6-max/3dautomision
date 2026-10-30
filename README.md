# 3dautomision
<<<<<<< HEAD

A workspace for the 3D floor-plan automation application. Open the **3dautomision** root folder in VS Code.

## Folder structure

```text
3dautomision/
├── apps/
│   ├── clientserver/       # Next.js + React UI and existing app API routes
│   │   └── src/
│   │       ├── app/        # pages and route handlers
│   │       ├── common/     # shared UI, stores, server utilities
│   │       └── features/   # floorplan, 3D, furniture, XR, auth, etc.
│   └── backend/            # separate Node.js HTTP backend (port 4000)
│       └── src/server.mjs
├── packages/floorplan-schema/ # shared floor-plan schema package
├── .vscode/
├── package.json
├── pnpm-workspace.yaml
└── .env.example
```

## Requirements

- Node.js 20.9 or newer
- pnpm (via Corepack)
- MongoDB local or MongoDB Atlas for the existing application

## Run in VS Code (Windows PowerShell)

1. Extract this ZIP and open the `3dautomision` folder in VS Code (**File → Open Folder**).
2. In a terminal at the root, run:

   ```powershell
   corepack enable
   pnpm install
   ```

3. Copy `.env.example` to `apps/clientserver/.env.local` and edit the values. Set a strong `JWT_SECRET`; set `MONGODB_URI` to a running MongoDB instance. `OPENAI_API_KEY` can remain empty for demo-mode AI features.
4. Open a **first terminal** and start the separate backend:

   ```powershell
   pnpm --filter backend dev
   ```

   It listens on `http://localhost:4000`. Test it by opening `http://localhost:4000/api/health`.
5. Open a **second terminal** and start the clientserver app:

   ```powershell
   pnpm --filter clientserver dev
   ```

   Open `http://localhost:3000`.
6. Test the connection from the Next.js server to the separate backend at `http://localhost:3000/api/backend-health`.

## Important current architecture note

The original project is built as a Next.js full-stack application. To preserve its existing authentication, project CRUD, AI floor-plan generation and furnishing features, those existing API handlers remain inside `apps/clientserver/src/app/api/` for now. The separate `apps/backend` service is added and connected through the `/api/backend-health` bridge as a working integration example. The full feature API has **not** yet been migrated into the standalone backend; doing that requires moving each route and adapting its Next.js cookie/session handling before removing the original handlers.

## Useful commands

```powershell
pnpm --filter clientserver dev
pnpm --filter clientserver build
pnpm --filter clientserver typecheck
pnpm --filter backend dev
```
=======
3D Automation Project using Next.js and Three.js
>>>>>>> 299d99b827b31cd8fcf749763be26dbb336b8057
