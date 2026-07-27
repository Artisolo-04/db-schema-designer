# 🗂️ Visual Database Schema Designer

Design your database schema visually — drag tables onto a canvas, define
columns, draw foreign keys, and get live-generated SQL. No more sketching
ER diagrams on paper before writing a single `CREATE TABLE`.

This started as a personal project to actually understand how a full-stack
app like this fits together (canvas rendering, auth, persistence, SQL
generation) — built with a lot of AI-assisted ("vibe") coding, but with
every part read, tested, and understood along the way.

## ✨ Features

- **Drag-and-drop canvas** — build tables visually with JointJS, including
  zoom, pan, a minimap, and full undo/redo
- **Relationship drawing** — connect tables with foreign keys directly on
  the canvas, including support for self-referencing relationships
- **Live SQL preview** — see the generated DDL update as you design, with
  syntax highlighting
- **Multi-dialect export** — generate DDL for PostgreSQL, MySQL, or SQLite
- **SQL import** — paste in existing SQL and have it reverse-engineered
  onto the canvas
- **Column & index tooling** — type picker, enum types panel, index panel
- **Accounts & projects** — sign up, log in, and save multiple schema
  projects tied to your account
- **Persistent storage** — each project's diagram is saved server-side as
  JSON

## 🛠️ Tech Stack

**Frontend**
- React 19 + Vite
- JointJS for the canvas/diagramming engine
- Tailwind CSS 4
- React Router, Axios

**Backend**
- Node.js + Express 5
- PostgreSQL (via `pg`)
- JWT auth with bcrypt-hashed passwords

**Infra**
- Docker Compose for local PostgreSQL

## 📁 Project Structure

```
db-schema-designer/
├── client/               # React + Vite frontend
│   └── src/
│       ├── components/
│       │   └── canvas/   # JointJS canvas, table nodes, relationship picker, panels
│       ├── pages/        # Login, Register, Dashboard, Editor
│       ├── api/          # Axios client + auth/projects API calls
│       ├── context/      # Auth + Toast context providers
│       └── utils/        # DDL generation, SQL parsing, dialects, validation
├── server/               # Express backend
│   └── src/
│       ├── routes/       # auth.js, projects.js
│       ├── middleware/   # JWT auth guard
│       ├── db/           # Postgres pool
│       └── utils/        # JWT sign/verify
├── db/
│   └── init.sql          # Schema: users, projects, project_data
└── docker-compose.yml    # Local Postgres container
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Docker (for the local Postgres container) — or your own Postgres instance

### 1. Clone the repo

```bash
git clone https://github.com/Artisolo-04/db-schema-designer.git
cd db-schema-designer
```

### 2. Start the database

```bash
cp .env.example .env
docker compose up -d
```

This spins up Postgres and automatically applies `db/init.sql` (creates
the `users`, `projects`, and `project_data` tables).

### 3. Configure and run the server

The server needs its own `.env` file inside `/server` (not committed —
create it yourself):

```bash
cd server
```

Create `server/.env`:

```env
PORT=4000
DATABASE_URL=postgresql://schema_designer:schema_designer_pw@localhost:5432/schema_designer
JWT_SECRET=replace-with-a-long-random-string
JWT_EXPIRES_IN=7d
```

Then install and run:

```bash
npm install
npm run dev
```

The API will be available at `http://localhost:4000/api`.

### 4. Configure and run the client

```bash
cd ../client
npm install
npm run dev
```

By default the client talks to `http://localhost:4000/api`. To point it
elsewhere, create `client/.env`:

```env
VITE_API_URL=http://localhost:4000/api
```

Open `http://localhost:5173` and you're in.

## 🔌 API Overview

| Method | Endpoint                  | Description                          |
|--------|-----------------------------|---------------------------------------|
| POST   | `/api/auth/register`       | Create an account                     |
| POST   | `/api/auth/login`          | Log in, receive a JWT                 |
| GET    | `/api/auth/me`             | Get the current user's profile        |
| GET    | `/api/projects`            | List the user's projects              |
| POST   | `/api/projects`            | Create a new project                  |
| PATCH  | `/api/projects/:id`        | Rename a project                      |
| DELETE | `/api/projects/:id`        | Delete a project                      |
| GET    | `/api/projects/:id/data`   | Load a project's diagram JSON         |
| PUT    | `/api/projects/:id/data`   | Save a project's diagram JSON         |

All `/api/projects` routes require a `Bearer` token from login/register.

## 🧭 Status

Actively developed. The core loop — build a schema visually, save it, come
back to it, export the SQL — works end to end. Things I'm looking at next:

- [ ] Add screenshots / demo GIF
- [ ] Tests for DDL generation across dialects
- [ ] Deployed live demo
- [ ] Export diagram as image (PNG/SVG)

## 📄 License

Not yet licensed — feel free to open an issue if you'd like to use this
and I'll add one (MIT is likely).

## 👤 Author

Built by [Artisolo-04](https://github.com/Artisolo-04) — feedback and
issues welcome.
