---
name: lottery-dev
description: "Lottery system full-stack development skill. Use this skill when developing the lottery system based on Node.js + Vue 3 + SQLite. This skill provides complete design documents, code templates, API specifications, and development guidelines for building the lottery system with separated admin and display frontends."
license: Proprietary
---

# Lottery System Development Skill

## Overview

This skill provides **complete reference materials** for developing a full-stack lottery system with the following architecture:

- **Backend**: Node.js + Express.js + SQLite (better-sqlite3) + Socket.io
- **Admin Frontend**: Vue 3 + Element Plus + Pinia (independent project, port 5173)
- **Display Frontend**: Vue 3 + CSS3 Animations + Socket.io (independent project, port 5174)
- **Database**: SQLite 3 with WAL mode, triggers, and foreign key constraints

**CRITICAL**: The admin frontend and display frontend are **completely independent** Vue projects. They communicate with the backend via REST API and WebSocket respectively.

## Quick Reference

| Task | Reference Document |
|------|-------------------|
| Understand requirements and features | Read [01_需求规格说明书.md](../docs/01_需求规格说明书.md) |
| Understand system architecture and tech stack | Read [02_系统架构设计.md](../docs/02_系统架构设计.md) |
| Design or modify database schema | Read [03_数据库设计.md](../docs/03_数据库设计.md) |
| Implement or modify API endpoints | Read [04_API接口设计.md](../docs/04_API接口设计.md) |
| Design or modify UI/UX | Read [05_UI_UX设计.md](../docs/05_UI_UX设计.md) |
| Deploy the system | Read [06_部署方案.md](../docs/06_部署方案.md) |
| Write tests | Read [07_测试方案.md](../docs/07_测试方案.md) |
| **Develop backend (Node.js)** | Read [09_后端开发指南.md](../docs/09_后端开发指南.md) |
| **Develop frontend (Vue 3)** | Read [10_前端开发指南.md](../docs/10_前端开发指南.md) |

## Mandatory Development Rules

### 1. Project Structure

```
lottery-system/
├── server/                  # Backend (Express.js + Socket.io)
│   ├── server.js            # Entry point (MUST use ES modules)
│   ├── package.json         # "type": "module" is REQUIRED
│   ├── src/
│   │   ├── db/init.js       # Database initialization
│   │   ├── routes/          # Express routes
│   │   ├── middleware/       # Express middleware
│   │   ├── services/        # Business logic
│   │   └── utils/           # Utility functions
│   ├── data/lottery.db      # SQLite database file
│   └── uploads/             # Uploaded files
├── admin/                   # Admin frontend (Vue 3 SPA, INDEPENDENT project)
│   ├── src/
│   │   ├── views/           # Page components
│   │   ├── components/      # Shared components
│   │   ├── router/          # Vue Router (base: '/admin')
│   │   ├── stores/          # Pinia stores
│   │   ├── api/             # API request modules
│   │   └── composables/     # Composable functions
│   ├── vite.config.js       # Dev server port: 5173
│   └── package.json
├── display/                 # Display frontend (Vue 3, INDEPENDENT project)
│   ├── src/
│   │   ├── views/           # Display pages
│   │   ├── components/      # Animation components
│   │   └── composables/     # Composable functions
│   ├── vite.config.js       # Dev server port: 5174
│   └── package.json
└── docs/                    # Design documents
```

### 2. Backend Rules

**CRITICAL**: Always use ES modules (`import/export`), NOT CommonJS (`require`).

- `package.json` MUST have `"type": "module"`
- Use `better-sqlite3` for database (synchronous API, NOT `sqlite3`)
- Use `express` Router for route organization
- Use `socket.io` for WebSocket communication
- All SQL queries MUST use parameterized queries (NEVER string concatenation)
- API responses: `{ success: true, data: {...} }` or `{ success: false, error: "..." }`
- List endpoints return arrays directly (no wrapper)

**Key API Endpoints**:

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/participants | List participants (query: status, blacklist, search) |
| POST | /api/participants | Create participant |
| PUT | /api/participants/:id | Update participant |
| DELETE | /api/participants/:id | Delete participant |
| PUT | /api/participants/:id/blacklist | Toggle blacklist |
| POST | /api/participants/import | Batch import (FormData with file) |
| GET | /api/prizes | List prizes |
| POST | /api/prizes | Create prize |
| GET | /api/sessions | List sessions |
| GET | /api/sessions/:id | Session detail (with participants, prizes, results) |
| POST | /api/sessions/:id/participants | Add participants to session |
| POST | /api/sessions/:id/prizes | Add prize to session |
| POST | /api/sessions/:id/draw | Execute lottery draw |
| POST | /api/console/start | Start draw animation (broadcasts via WebSocket) |
| POST | /api/console/stop | Stop draw and execute algorithm (broadcasts result) |
| POST | /api/console/pause | Pause animation |
| POST | /api/console/reset | Reset draw state |
| GET | /api/config | Get system config |
| PUT | /api/config | Update system config |
| POST | /api/upload/image | Upload image (FormData) |

**WebSocket Events**:

| Event | Direction | Data | Description |
|-------|-----------|------|-------------|
| draw:start | Server → Client | { session_id, prize_id, prize_name } | Draw animation starts |
| draw:pause | Server → Client | - | Animation paused |
| draw:stop | Server → Client | - | Animation stopped |
| draw:result | Server → Client | { winner, prize, timestamp } | Draw result |
| draw:reset | Server → Client | - | Draw state reset |
| config:update | Server → Client | { config } | Config changed |

### 3. Frontend Rules

**Admin Frontend (admin/)**:
- Use Vue 3 Composition API (`<script setup>`)
- Use Element Plus for UI components
- Use Pinia for state management
- Use Vue Router with base path `/admin`
- Use Axios for HTTP requests (base URL: `/api`)
- Dev proxy: `/api` → `http://localhost:3000`, `/socket.io` → `http://localhost:3000` (ws: true)

**Display Frontend (display/)**:
- Use Vue 3 Composition API (`<script setup>`)
- NO UI framework (pure CSS for animations)
- Use Socket.io-client for real-time communication
- Dev proxy: same as admin but port 5174
- MUST support responsive design (mobile/tablet/desktop/large screen)
- Animation MUST use CSS transforms and opacity (GPU accelerated)
- Use `canvas-confetti` for winner celebration effect

### 4. Database Rules

- Database file: `server/data/lottery.db`
- MUST enable: `PRAGMA journal_mode = WAL` and `PRAGMA foreign_keys = ON`
- 7 tables: `participants`, `prizes`, `lottery_sessions`, `session_participants`, `session_prizes`, `session_results`, `lottery_config`
- 3 triggers for data integrity (participant status sync, session timestamp)
- Weighted random algorithm: `P(i) = weight_i / SUM(weight_j)`
- MUST exclude blacklisted and already-won participants from draws

### 5. Lottery Algorithm

```
Weighted Random Selection:
1. Filter: exclude blacklisted + already won same prize
2. Check: if no eligible participants, return error
3. Calculate: totalWeight = SUM(weight_i)
4. Random: random = Math.random() * totalWeight
5. Select: iterate and subtract weights, select when random <= 0
6. Fallback: return last participant (floating point safety)
```

## Development Workflow

### Step 1: Read Design Documents
Before writing any code, read the relevant design documents listed in the Quick Reference table above.

### Step 2: Backend Development
Read [09_后端开发指南.md](../docs/09_后端开发指南.md) for complete backend code templates including:
- `server.js` entry point
- `src/db/init.js` database initialization
- All route files with complete implementations
- Socket.io event handling
- File upload handling

### Step 3: Admin Frontend Development
Read [10_前端开发指南.md](../docs/10_前端开发指南.md) for complete frontend code templates including:
- Project setup and configuration
- Vue Router, Pinia, Axios setup
- Complete page components (Dashboard, Participants, etc.)
- Socket.io composable

### Step 4: Display Frontend Development
Read [10_前端开发指南.md](../docs/10_前端开发指南.md) Section 2 for the display frontend including:
- App.vue with Grid/List animations
- Socket.io real-time event handling
- Responsive CSS styles
- Confetti celebration effect

### Step 5: Testing
Read [07_测试方案.md](../docs/07_测试方案.md) for test strategies and test cases.

### Step 6: Deployment
Read [06_部署方案.md](../docs/06_部署方案.md) for deployment configurations.

## Common Pitfalls

- **NEVER** use CommonJS (`require`) in backend — always use ES modules (`import`)
- **NEVER** concatenate SQL strings — always use parameterized queries
- **NEVER** share state between admin and display frontends
- **NEVER** use `sqlite3` package — use `better-sqlite3` (synchronous API)
- **NEVER** forget to set `"type": "module"` in server's `package.json`
- **ALWAYS** proxy `/socket.io` with `ws: true` in Vite config
- **ALWAYS** use `COALESCE` for partial updates in SQL
- **ALWAYS** handle WebSocket reconnection in display frontend
- **ALWAYS** use CSS `transform` and `opacity` for animations (GPU accelerated)
