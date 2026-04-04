# Development Checklist

Use this checklist to verify completeness during development.

## Backend (server/)

### Setup
- [ ] `package.json` has `"type": "module"`
- [ ] All dependencies installed (`npm install`)
- [ ] `data/` directory exists
- [ ] `uploads/` directory exists

### Database (src/db/init.js)
- [ ] WAL mode enabled: `PRAGMA journal_mode = WAL`
- [ ] Foreign keys enabled: `PRAGMA foreign_keys = ON`
- [ ] All 7 tables created
- [ ] All 3 triggers created
- [ ] All indexes created
- [ ] Default config row inserted (id=1)

### Routes
- [ ] `/api/participants` — CRUD + blacklist + import
- [ ] `/api/prizes` — CRUD
- [ ] `/api/sessions` — CRUD + participant/prize linking + draw
- [ ] `/api/console` — start/pause/stop/reset
- [ ] `/api/config` — get/update
- [ ] `/api/upload/image` — image upload

### Socket.io
- [ ] Server initialized with CORS config
- [ ] `draw:start` event broadcast
- [ ] `draw:result` event broadcast with winner data
- [ ] `draw:pause` event broadcast
- [ ] `draw:reset` event broadcast
- [ ] `config:update` event broadcast

### Lottery Algorithm
- [ ] Weighted random selection implemented
- [ ] Blacklisted participants excluded
- [ ] Already-won participants excluded (per prize)
- [ ] Stock check before draw
- [ ] Result recorded in session_results

### Static Files
- [ ] `/uploads` directory served
- [ ] `/admin` serves admin/dist/ (production)
- [ ] `/display` serves display/dist/ (production)
- [ ] SPA fallback routes configured

## Admin Frontend (admin/)

### Setup
- [ ] Vue 3 + Vite project initialized
- [ ] Element Plus installed and configured (Chinese locale)
- [ ] Vue Router configured (base: `/admin`)
- [ ] Pinia configured
- [ ] Axios configured (baseURL: `/api`)
- [ ] Vite proxy configured (port 5173)

### Pages
- [ ] Dashboard.vue — lottery control panel
- [ ] Participants.vue — CRUD table + import
- [ ] Prizes.vue — CRUD cards
- [ ] Sessions.vue — session list
- [ ] SessionDetail.vue — tabs (participants/prizes/results)
- [ ] Config.vue — theme/background/animation settings

### Socket.io
- [ ] Socket connected on mount
- [ ] Connection status displayed
- [ ] Draw events handled

### API Integration
- [ ] All CRUD operations working
- [ ] File upload working
- [ ] Error handling with ElMessage

## Display Frontend (display/)

### Setup
- [ ] Vue 3 + Vite project initialized
- [ ] Socket.io-client installed
- [ ] canvas-confetti installed
- [ ] Vite proxy configured (port 5174)

### Features
- [ ] Config loaded from API on mount
- [ ] Participants loaded for current session
- [ ] Socket.io connected with status indicator
- [ ] Grid animation implemented
- [ ] List animation implemented
- [ ] Winner reveal with confetti
- [ ] Winner list accumulated
- [ ] Responsive design (4 breakpoints)
- [ ] Theme CSS variables applied

### Socket.io Events
- [ ] `draw:start` → start animation
- [ ] `draw:pause` → pause animation
- [ ] `draw:result` → stop animation + show winner + confetti
- [ ] `draw:reset` → reset state
- [ ] `config:update` → apply new config

## Integration Testing

### Full Flow
- [ ] Create participants (manual + import)
- [ ] Create prizes
- [ ] Create session
- [ ] Link participants to session
- [ ] Link prizes to session
- [ ] Open display page, verify connection
- [ ] Start draw → display shows animation
- [ ] Stop draw → display shows winner
- [ ] Verify result recorded in database
- [ ] Repeat draw → previous winner excluded
- [ ] Reset → ready for next round

### Edge Cases
- [ ] Draw with no eligible participants → error message
- [ ] Draw with exhausted prize stock → error message
- [ ] Blacklisted participant excluded
- [ ] WebSocket disconnect/reconnect
- [ ] Duplicate participant creation → 409 error
