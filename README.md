# 🗂️ Visual Database Schema Designer

A visual tool for designing relational database schemas: drag tables onto a canvas, define columns and relationships, and export production-ready DDL for **PostgreSQL, MySQL, or SQLite** — instantly. It also works in reverse: paste in existing SQL and get a visual diagram back.

Built to solve a real problem — designing schemas in a notes app or on paper is error-prone, and most visual tools only support one database dialect.

---

## Table of Contents

- [Features](#-features)
- [Tech Stack](#️-tech-stack)
- [Dialect Support Matrix](#-dialect-support-matrix)
- [Database Schema](#-database-schema)
- [API Reference](#-api-reference)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Design Highlights](#-design-highlights)
- [Roadmap](#️-roadmap)

---

## ✨ Features

| Category | What it does |
|---|---|
| **Visual Canvas** | Drag-and-drop table canvas (JointJS) with full undo/redo history |
| **Relationships** | Draw foreign keys directly between tables via a dedicated Relationship Panel |
| **Indexes** | Add and manage per-table indexes through the Index Panel |
| **Enum Types** | Define custom enum types once, reuse them as column types across tables |
| **DDL Generation** | Generate real, dialect-correct SQL from the diagram — no manual writing |
| **SQL Import** | Paste existing SQL and reconstruct the diagram automatically (reverse engineering) |
| **Accounts** | Register/login with hashed passwords and JWT-based sessions |
| **Multi-Project** | Each user can save and manage multiple independent schema projects |
| **Autosave** | Diagrams persist as JSON in PostgreSQL — not localStorage, so nothing is lost across devices |

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend framework | React 19 + Vite |
| Diagramming engine | JointJS (`@joint/core`) |
| Styling | Tailwind CSS v4 |
| Routing | React Router v7 |
| HTTP client | Axios |
| Backend framework | Node.js + Express 5 |
| Database | PostgreSQL (raw `pg`, no ORM) |
| Auth | JWT + bcrypt |
| Infra | Docker Compose (Postgres) |

---

## 🔀 Dialect Support Matrix

The DDL generator maps every column type correctly per target database — not a simple find-and-replace:

| Logical Type | PostgreSQL | MySQL | SQLite |
|---|---|---|---|
| `uuid` | `uuid` | `CHAR(36)` | `TEXT` |
| `text` | `text` | `TEXT` | `TEXT` |
| `varchar` | `varchar` | `VARCHAR(255)` | `TEXT` |
| `integer` | `integer` | `INT` | `INTEGER` |
| `bigint` | `bigint` | `BIGINT` | `INTEGER` |
| `boolean` | `boolean` | `TINYINT(1)` | `INTEGER` |
| `timestamp` / `timestamptz` | `timestamp` / `timestamptz` | `DATETIME` | `TEXT` |
| `jsonb` / `json` | `jsonb` / `json` | `JSON` | `TEXT` |
| `bytea` | `bytea` | `BLOB` | `BLOB` |
| Enum columns | native `ENUM` type | native `ENUM(...)` | `TEXT` + `CHECK (...)` constraint |

Each dialect also has its own identifier-quoting rule (`"double quotes"` for Postgres, `` `backticks` `` for MySQL, etc.), handled automatically.

---

## 🧬 Database Schema

The app's own backing store (`db/init.sql`):

| Table | Column | Type | Notes |
|---|---|---|---|
| **users** | `id` | `uuid` | Primary key, auto-generated |
| | `email` | `text` | Unique, not null |
| | `password_hash` | `text` | bcrypt hash, never the raw password |
| | `created_at` | `timestamptz` | Default `now()` |
| **projects** | `id` | `uuid` | Primary key |
| | `user_id` | `uuid` | FK → `users.id`, `ON DELETE CASCADE` |
| | `name` | `text` | Not null |
| | `created_at` / `updated_at` | `timestamptz` | `updated_at` auto-refreshes via trigger |
| **project_data** | `project_id` | `uuid` | Primary key, FK → `projects.id`, cascade delete |
| | `diagram_json` | `jsonb` | The full diagram (tables + edges), default `{}` |

An index (`idx_projects_user_id`) speeds up per-user project lookups, and a Postgres trigger (`set_updated_at`) keeps `updated_at` accurate on every row change without relying on the application layer to remember.

---

## 📡 API Reference

| Method | Endpoint | Auth Required | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | No | Create an account (email + password, min 8 chars) |
| `POST` | `/api/auth/login` | No | Log in, returns a JWT |
| `GET` | `/api/auth/me` | Yes | Get the current user's profile |
| `GET` | `/api/projects` | Yes | List all projects owned by the current user |
| `POST` | `/api/projects` | Yes | Create a new project (also creates its empty diagram) |
| `PATCH` | `/api/projects/:id` | Yes | Rename a project |
| `DELETE` | `/api/projects/:id` | Yes | Delete a project |
| `GET` | `/api/projects/:id/data` | Yes | Fetch the saved diagram JSON |
| `PUT` | `/api/projects/:id/data` | Yes | Save/update the diagram JSON |
| `GET` | `/api/health` | No | Health check |

All authenticated routes require an `Authorization: Bearer <token>` header, verified by JWT middleware before the request reaches the route handler.

---

## 📁 Project Structure

```
db-schema-designer/
├── client/                        # React frontend
│   └── src/
│       ├── pages/                 # Login, Register, Dashboard, Editor
│       ├── components/
│       │   └── canvas/            # Canvas, RelationshipPanel, IndexPanel, EnumTypesPanel
│       ├── context/                # AuthContext, ToastContext
│       ├── api/                    # Axios client + projects API
│       └── utils/                  # generateDDL.js, parseSql.js, dialects.js, validateSchema.js
├── server/                        # Express backend
│   └── src/
│       ├── routes/                 # auth.js, projects.js
│       ├── db/                     # Postgres pool config
│       └── middleware/             # requireAuth (JWT guard)
├── db/
│   └── init.sql                    # Schema + trigger (see table above)
└── docker-compose.yml              # Spins up Postgres with init.sql pre-loaded
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Docker (for Postgres) — or your own local Postgres instance

### 1. Clone the repo

```bash
git clone https://github.com/Artisolo-04/db-schema-designer.git
cd db-schema-designer
```

### 2. Start the database

```bash
docker compose up -d
```

Spins up Postgres and runs `db/init.sql` automatically on first boot.

### 3. Set up the backend

```bash
cd server
```

Create `server/.env`:

```
DATABASE_URL=postgresql://schema_designer:schema_designer_pw@localhost:5432/schema_designer
PORT=4000
```

```bash
npm install
npm run dev
```

### 4. Set up the frontend

```bash
cd ../client
npm install
npm run dev
```

Open the URL Vite prints, register an account, and start designing.

---

## 🧠 Design Highlights

**Dialect-aware DDL generation.** Rather than treating SQL as one language, the generator maintains a separate type map and identifier-quoting rule per dialect, and special-cases enums per database (native `ENUM` where supported, `CHECK` constraints where it isn't).

**Bidirectional workflow.** Most schema tools only go diagram → SQL. This one also parses SQL → diagram, useful for visualizing a schema someone else wrote.

**Durable, structured storage.** Diagrams are stored as `jsonb` in Postgres per project — not the browser — so work survives across devices and sessions.

**Transactional project creation.** Creating a project and its initial empty diagram happens inside a single database transaction, so a failure can't leave a project with no diagram row.

---

## 🗺️ Roadmap

- [ ] Export diagram as image/PDF
- [ ] Real-time multi-user collaboration
- [ ] Additional dialects (SQL Server, Oracle)
- [ ] Schema version history per project

---

## Author

**Khelifi Hachem** — [@Artisolo-04](https://github.com/Artisolo-04)


