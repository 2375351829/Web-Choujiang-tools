# Frontend Development Reference

## Admin Frontend (admin/)

### Tech Stack
- Vue 3 (Composition API, `<script setup>`)
- Vue Router 4 (base: `/admin`)
- Pinia 2 (state management)
- Element Plus (UI components, Chinese locale)
- Axios (HTTP client)
- Socket.io-client (WebSocket)

### Key Dependencies
```json
{
  "vue": "^3.4",
  "vue-router": "^4.3",
  "pinia": "^2.1",
  "element-plus": "^2.6",
  "@element-plus/icons-vue": "^2.3",
  "axios": "^1.6",
  "socket.io-client": "^4.7"
}
```

### Vite Proxy Config (port 5173)
```javascript
server: {
  port: 5173,
  proxy: {
    '/api': { target: 'http://localhost:3000', changeOrigin: true },
    '/socket.io': { target: 'http://localhost:3000', ws: true },
    '/uploads': { target: 'http://localhost:3000', changeOrigin: true }
  }
}
```

### Page Components Map
| Route | Component | Description |
|-------|-----------|-------------|
| /dashboard | Dashboard.vue | Lottery control panel |
| /participants | Participants.vue | Participant CRUD + import |
| /prizes | Prizes.vue | Prize CRUD |
| /sessions | Sessions.vue | Session list |
| /sessions/:id | SessionDetail.vue | Session detail (tabs: participants/prizes/results) |
| /config | Config.vue | Theme, background, animation settings |

### Element Plus Components Used
- `el-table`, `el-table-column` — Data tables
- `el-form`, `el-form-item` — Forms
- `el-dialog` — Modal dialogs
- `el-select`, `el-option` — Dropdowns
- `el-switch` — Toggle switches
- `el-tag` — Status badges
- `el-button` — Buttons
- `el-card` — Cards
- `el-upload` — File upload
- `el-popconfirm` — Delete confirmation
- `el-descriptions` — Description lists
- `el-message` — Toast notifications

### Status Color Mapping
| Status | Tag Type |
|--------|----------|
| 未中奖 | info (gray) |
| 已中奖 | success (green) |
| 黑名单 | danger (red) |
| 未开始 | info (gray) |
| 进行中 | success (green) |
| 已结束 | warning (yellow) |

---

## Display Frontend (display/)

### Tech Stack
- Vue 3 (Composition API, `<script setup>`)
- Socket.io-client (WebSocket)
- canvas-confetti (celebration effect)
- Pure CSS animations (NO UI framework)

### Key Dependencies
```json
{
  "vue": "^3.4",
  "socket.io-client": "^4.7",
  "canvas-confetti": "^1.9"
}
```

### Vite Proxy Config (port 5174)
```javascript
server: {
  port: 5174,
  proxy: {
    '/api': { target: 'http://localhost:3000', changeOrigin: true },
    '/socket.io': { target: 'http://localhost:3000', ws: true },
    '/uploads': { target: 'http://localhost:3000', changeOrigin: true }
  }
}
```

### Animation Types

#### Grid Animation
- 3x3 CSS Grid layout
- Active cell: blue glow + scale(1.05) + box-shadow
- Winner cell: gold glow + scale(1.1) + larger font

#### List Animation
- Vertical list with overflow hidden
- Active item: blue left border + background highlight
- Winner item: gold left border + bold + larger font

#### Sphere Animation (future)
- 3D CSS transform sphere
- Names distributed on sphere surface
- Continuous rotation during draw

### Responsive Breakpoints
| Breakpoint | Width | Grid Size | Font Scale |
|------------|-------|-----------|------------|
| mobile | <640px | 2x2 | 0.8x |
| tablet | 640-1024px | 3x3 | 1x |
| desktop | 1024-1920px | 3x3 | 1.2x |
| large | >1920px | 4x4 | 1.4x |

### CSS Variables (Theme System)
```css
:root {
  --bg-primary: #0f172a;
  --bg-secondary: #1e293b;
  --text-primary: #f1f5f9;
  --text-secondary: #94a3b8;
  --accent: #3b82f6;
  --success: #22c55e;
  --warning: #f59e0b;
  --danger: #ef4444;
}
```

### 6 Preset Themes
| Theme | --bg-primary | --accent |
|-------|-------------|---------|
| dark | #0f172a | #3b82f6 |
| light | #ffffff | #3b82f6 |
| ocean | #0c4a6e | #06b6d4 |
| forest | #14532d | #22c55e |
| sunset | #7c2d12 | #f97316 |
| purple | #3b0764 | #a855f7 |

### Socket.io Event Handling Pattern
```javascript
// In display App.vue onMounted:
socket.value = io()

socket.value.on('connect', () => { isConnected.value = true })
socket.value.on('disconnect', () => { isConnected.value = false })

socket.value.on('draw:start', () => {
  isDrawing.value = true
  startAnimation()
})

socket.value.on('draw:result', (data) => {
  stopAnimation()
  showWinner(data.winner, data.prize)
  confetti({ particleCount: 200, spread: 90 })
})

socket.value.on('draw:reset', () => {
  resetAnimation()
})

socket.value.on('config:update', (data) => {
  config.value = data.config
})
```
