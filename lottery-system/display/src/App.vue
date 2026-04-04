<template>
  <div class="lottery-display" :style="bgStyle">
    <div class="particles-bg">
      <div v-for="i in 50" :key="i" class="particle" :style="getParticleStyle(i)"></div>
    </div>

    <div class="connection-status" :class="{ connected: isConnected }">
      {{ isConnected ? '🟢 已连接' : '🔴 未连接' }}
    </div>

    <header class="header">
      <h1 class="title">{{ config.title || '幸运抽奖' }}</h1>
      <div class="session-info" v-if="currentSession">
        <span class="session-tag">{{ currentSession.name }}</span>
      </div>
    </header>

    <main class="main-content">
      <transition name="slide-fade" mode="out-in">
        <div v-if="drawState === 'idle'" class="idle-state" key="idle">
          <div class="ready-hint">
            <div class="hint-icon">🎯</div>
            <div class="hint-text">等待开始抽奖...</div>
            <div class="hint-sub">请管理员在控制台点击"开始抽奖"</div>
          </div>
          
          <div class="layout-grid" :style="layoutGridStyle">
            <template v-for="item in sortedLayoutItems" :key="item.id">
              <div 
                v-if="item.id === 'stats' && item.visible" 
                class="layout-item stats-item"
                :style="{ gridColumn: `span ${Math.min(getLayoutColSpan(item.id), computedCols)}`, minHeight: `${getLayoutMinHeight(item.id)}px` }"
              >
                <div class="stats-row">
                  <div class="stat-card">
                    <div class="stat-value">{{ participants.length }}</div>
                    <div class="stat-label">参与人数</div>
                  </div>
                  <div class="stat-card">
                    <div class="stat-value">{{ totalPrizes }}</div>
                    <div class="stat-label">奖品总数</div>
                  </div>
                  <div class="stat-card">
                    <div class="stat-value">{{ winners.length }}</div>
                    <div class="stat-label">已中奖</div>
                  </div>
                </div>
              </div>
              
              <div 
                v-if="item.id === 'participants' && item.visible && config.show_participants && participants.length > 0" 
                class="layout-item participants-item"
                :style="{ gridColumn: `span ${Math.min(getLayoutColSpan(item.id), computedCols)}`, minHeight: `${getLayoutMinHeight(item.id)}px` }"
              >
                <div class="participants-section">
                  <div class="section-title">
                    <span class="title-icon">👥</span>
                    <span>参与者名单</span>
                    <span class="participant-count">共 {{ participants.length }} 人</span>
                  </div>
                  <div class="participants-waterfall" ref="waterfallRef">
                    <div class="waterfall-track" :style="waterfallStyle">
                      <div v-for="(p, idx) in displayParticipants" :key="'a-'+idx" class="participant-item">
                        <span class="participant-avatar">{{ p.name.charAt(0) }}</span>
                        <span class="participant-name">{{ p.name }}</span>
                        <span class="participant-status" v-if="p.status === '已中奖'">🏆</span>
                      </div>
                    </div>
                    <div class="waterfall-track track-second" :style="waterfallStyle2" v-if="participants.length > 20">
                      <div v-for="(p, idx) in displayParticipants2" :key="'b-'+idx" class="participant-item">
                        <span class="participant-avatar">{{ p.name.charAt(0) }}</span>
                        <span class="participant-name">{{ p.name }}</span>
                        <span class="participant-status" v-if="p.status === '已中奖'">🏆</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div 
                v-if="item.id === 'prizes' && item.visible && config.show_prizes" 
                class="layout-item prizes-item"
                :style="{ gridColumn: `span ${Math.min(getLayoutColSpan(item.id), computedCols)}`, minHeight: `${getLayoutMinHeight(item.id)}px` }"
              >
                <div class="prizes-section">
                  <div class="section-title">
                    <span class="title-icon">🎁</span>
                    <span>奖品列表</span>
                    <span class="prize-count" v-if="sessionPrizes.length > 0">共 {{ sessionPrizes.length }} 种</span>
                  </div>
                  <div v-if="!config.current_session_id" class="empty-hint">
                    <span>请在管理后台选择当前场次</span>
                  </div>
                  <div v-else-if="sessionPrizes.length === 0" class="empty-hint">
                    <span>当前场次暂无奖品，请在管理后台添加</span>
                  </div>
                  <div v-else class="prizes-grid">
                    <div v-for="(prize, idx) in sessionPrizes" :key="idx" class="prize-card" :class="getLevelClass(prize.level)">
                      <div class="prize-image" v-if="prize.image_url">
                        <img :src="getImageUrl(prize.image_url)" alt="奖品图片" />
                      </div>
                      <div class="prize-image prize-placeholder" v-else>
                        <span>🎁</span>
                      </div>
                      <div class="prize-content">
                        <div class="prize-level-tag" :class="getLevelClass(prize.level)">{{ prize.level }}</div>
                        <div class="prize-title">{{ prize.name }}</div>
                        <div class="prize-quantity">
                          <span class="remaining">{{ prize.remaining }}</span>
                          <span class="total">/ {{ prize.quantity }}</span>
                          <span class="unit">剩余</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </template>
          </div>
        </div>

        <div v-else-if="drawState === 'rolling'" class="rolling-state" key="rolling">
          <div class="prize-info">
            <span class="prize-level" :class="getLevelClass(currentPrize?.level)">{{ currentPrize?.level || '抽奖中' }}</span>
            <span class="prize-name">{{ currentPrize?.name || '奖品' }}</span>
          </div>
          
          <div class="rolling-container">
            <div class="rolling-box">
              <div class="rolling-names" :style="rollingStyle">
                <div v-for="(name, idx) in rollingNames" :key="idx" class="rolling-name">
                  {{ name }}
                </div>
              </div>
            </div>
            <div class="rolling-indicator">
              <div class="indicator-line left"></div>
              <div class="indicator-arrow">▼</div>
              <div class="indicator-line right"></div>
            </div>
          </div>

          <div class="rolling-hint">
            <span class="pulse-dot"></span>
            <span>抽奖进行中，等待停止...</span>
          </div>
        </div>

        <div v-else-if="drawState === 'result'" class="result-state" key="result">
          <div class="result-header">
            <span class="congrats-text">🎉 恭喜中奖 🎉</span>
          </div>
          
          <div class="prize-badge" :class="getLevelClass(currentPrize?.level)">
            <span class="badge-level">{{ currentPrize?.level }}</span>
            <span class="badge-name">{{ currentPrize?.name }}</span>
          </div>

          <div class="winners-showcase">
            <div v-for="(winner, idx) in currentWinners" :key="idx" 
                 class="winner-card" 
                 :style="{ animationDelay: `${idx * 0.15}s` }">
              <div class="winner-avatar">
                {{ winner.name.charAt(0) }}
              </div>
              <div class="winner-info">
                <div class="winner-name">{{ winner.name }}</div>
                <div class="winner-phone">{{ maskPhone(winner.phone) }}</div>
              </div>
              <div class="winner-rank">第 {{ idx + 1 }} 位</div>
            </div>
          </div>
        </div>
      </transition>
    </main>

    <footer class="footer">
      <div class="winner-history" v-if="winners.length > 0 && isLayoutVisible('winners') && config.show_winner">
        <div class="history-title">🏆 中奖记录</div>
        <div class="history-list">
          <div v-for="(w, i) in winners.slice(0, 10)" :key="i" class="history-item">
            <span class="history-name">{{ w.name }}</span>
            <span class="history-prize" :class="getLevelClass(w.level)">{{ w.level }}</span>
          </div>
        </div>
      </div>
    </footer>

    <canvas ref="confettiCanvas" class="confetti-canvas"></canvas>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { io } from 'socket.io-client'
import confetti from 'canvas-confetti'

const socket = ref<any>(null)
const isConnected = ref(false)
const drawState = ref<'idle' | 'rolling' | 'result'>('idle')
const participants = ref<any[]>([])
const winners = ref<any[]>([])
const currentPrize = ref<any>(null)
const currentWinners = ref<any[]>([])
const currentSession = ref<any>(null)
const confettiCanvas = ref<HTMLCanvasElement | null>(null)

const config = ref({
  title: '幸运抽奖',
  current_scene_id: null as number | null,
  background_type: 'gradient',
  background_color: '#0f172a',
  background_image: '',
  background_size: 'cover',
  gradient_start: '#667eea',
  gradient_end: '#764ba2',
  gradient_degree: 135,
  animation_type: 'slot',
  show_participants: true,
  show_prizes: true,
  show_winner: true,
  carousel_speed: 3000,
  current_session_id: null as number | null,
  theme: 'dark',
  layout_config: '{}'
})

const defaultLayout = [
  { id: 'stats', visible: true, order: 0, colSpan: 1, minHeight: 120 },
  { id: 'participants', visible: true, order: 1, colSpan: 1, minHeight: 300 },
  { id: 'prizes', visible: true, order: 2, colSpan: 1, minHeight: 300 },
  { id: 'winners', visible: true, order: 3, colSpan: 1, minHeight: 200 }
]

const layoutItems = ref<any[]>([...defaultLayout])

const layoutSettings = ref({
  mode: 'auto',
  gap: 20,
  responsive: true,
  breakpoints: {
    sm: 640,
    md: 1024,
    lg: 1280,
    xl: 1920
  }
})

const screenWidth = ref(window.innerWidth)

const getLayoutOrder = (id: string) => {
  const item = layoutItems.value.find(i => i.id === id)
  return item ? item.order : 999
}

const isLayoutVisible = (id: string) => {
  const item = layoutItems.value.find(i => i.id === id)
  return item ? item.visible : true
}

const getLayoutColSpan = (id: string) => {
  const item = layoutItems.value.find(i => i.id === id)
  return item ? item.colSpan || 1 : 1
}

const getLayoutMinHeight = (id: string) => {
  const item = layoutItems.value.find(i => i.id === id)
  return item ? item.minHeight || 200 : 200
}

const sortedLayoutItems = computed(() => {
  return [...layoutItems.value].sort((a, b) => a.order - b.order)
})

const computedCols = computed(() => {
  const mode = layoutSettings.value.mode
  if (mode === 'single') return 1
  if (mode === 'double') return 2
  if (mode === 'triple') return 3
  
  if (layoutSettings.value.responsive) {
    const width = screenWidth.value
    if (width < 640) return 1
    if (width < 1024) return 2
    if (width < 1920) return 3
    return 4
  }
  return 3
})

const layoutGridStyle = computed(() => {
  return {
    display: 'grid',
    gridTemplateColumns: `repeat(${computedCols.value}, 1fr)`,
    gap: `${layoutSettings.value.gap}px`,
    width: '100%'
  }
})

const handleResize = () => {
  screenWidth.value = window.innerWidth
}

const rollingOffset = ref(0)
const rollingNames = ref<string[]>([])
let rollingTimer: number | null = null

const waterfallOffset = ref(0)
const waterfallOffset2 = ref(0)
let waterfallTimer: number | null = null
const waterfallRef = ref<HTMLElement | null>(null)

const displayParticipants = computed(() => {
  const list = [...participants.value]
  while (list.length < 30) {
    list.push(...participants.value)
  }
  return list
})

const displayParticipants2 = computed(() => {
  const list = [...participants.value].reverse()
  while (list.length < 30) {
    list.push(...list)
  }
  return list
})

const waterfallStyle = computed(() => ({
  transform: `translateY(-${waterfallOffset.value}px)`
}))

const waterfallStyle2 = computed(() => ({
  transform: `translateY(${waterfallOffset2.value}px)`
}))

const totalPrizes = computed(() => {
  if (!currentSession.value?.prizes) return 0
  return currentSession.value.prizes.reduce((sum: number, p: any) => sum + p.quantity, 0)
})

const sessionPrizes = computed(() => {
  if (!currentSession.value?.prizes) return []
  return currentSession.value.prizes || []
})

const bgStyle = computed(() => {
  const c = config.value
  if (c.background_type === 'gradient') {
    return { background: `linear-gradient(${c.gradient_degree}deg, ${c.gradient_start}, ${c.gradient_end})` }
  }
  if (c.background_type === 'color') {
    return { background: c.background_color }
  }
  if (c.background_type === 'image' && c.background_image) {
    return {
      backgroundImage: `url(${getImageUrl(c.background_image)})`,
      backgroundSize: c.background_size || 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat'
    }
  }
  return { background: '#0f172a' }
})

const getImageUrl = (path: string) => {
  if (!path) return ''
  if (path.startsWith('http')) return path
  return `http://localhost:3000${path}`
}

const rollingStyle = computed(() => ({
  transform: `translateY(-${rollingOffset.value}px)`
}))

const getParticleStyle = (i: number) => {
  const size = Math.random() * 4 + 2
  return {
    width: `${size}px`,
    height: `${size}px`,
    left: `${Math.random() * 100}%`,
    top: `${Math.random() * 100}%`,
    animationDelay: `${Math.random() * 5}s`,
    animationDuration: `${Math.random() * 10 + 10}s`
  }
}

const getLevelClass = (level: string) => {
  if (!level) return ''
  const map: Record<string, string> = {
    '特等奖': 'level-special',
    '一等奖': 'level-first',
    '二等奖': 'level-second',
    '三等奖': 'level-third',
    '参与奖': 'level-participation'
  }
  return map[level] || ''
}

const maskPhone = (phone: string) => {
  if (!phone) return ''
  return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
}

const startRolling = () => {
  if (participants.value.length === 0) return
  
  stopWaterfall()
  
  const names = participants.value
    .filter(p => p.status !== '已中奖' && !p.is_blacklisted)
    .map(p => p.name)
  
  if (names.length === 0) {
    rollingNames.value = participants.value.map(p => p.name)
  } else {
    rollingNames.value = names
  }
  
  while (rollingNames.value.length < 20) {
    rollingNames.value = [...rollingNames.value, ...rollingNames.value]
  }
  
  rollingOffset.value = 0
  
  const roll = () => {
    rollingOffset.value += 60
    if (rollingOffset.value >= rollingNames.value.length * 60) {
      rollingOffset.value = 0
    }
    rollingTimer = window.setTimeout(roll, 50)
  }
  roll()
}

const startWaterfall = () => {
  if (participants.value.length === 0) return
  
  const speed = config.value.carousel_speed || 3000
  const itemHeight = 40
  const totalHeight = participants.value.length * itemHeight
  
  const animate = () => {
    waterfallOffset.value += 1
    if (waterfallOffset.value >= totalHeight) {
      waterfallOffset.value = 0
    }
    
    waterfallOffset2.value += 0.8
    if (waterfallOffset2.value >= totalHeight) {
      waterfallOffset2.value = 0
    }
    
    waterfallTimer = requestAnimationFrame(animate)
  }
  
  waterfallTimer = requestAnimationFrame(animate)
}

const stopWaterfall = () => {
  if (waterfallTimer) {
    cancelAnimationFrame(waterfallTimer)
    waterfallTimer = null
  }
}

const stopRolling = (winnerNames: string[]) => {
  if (rollingTimer) {
    clearTimeout(rollingTimer)
    rollingTimer = null
  }
  
  currentWinners.value = winnerNames.map(name => {
    const p = participants.value.find(p => p.name === name)
    return p || { name, phone: '' }
  })
  
  drawState.value = 'result'
  
  nextTick(() => {
    fireConfetti()
  })
}

const fireConfetti = () => {
  const duration = 3000
  const end = Date.now() + duration
  
  const frame = () => {
    confetti({
      particleCount: 3,
      angle: 60,
      spread: 55,
      origin: { x: 0, y: 0.6 },
      colors: ['#fbbf24', '#f59e0b', '#d97706']
    })
    confetti({
      particleCount: 3,
      angle: 120,
      spread: 55,
      origin: { x: 1, y: 0.6 },
      colors: ['#fbbf24', '#f59e0b', '#d97706']
    })
    
    if (Date.now() < end) {
      requestAnimationFrame(frame)
    }
  }
  frame()
}

const resetDraw = () => {
  if (rollingTimer) {
    clearTimeout(rollingTimer)
    rollingTimer = null
  }
  drawState.value = 'idle'
  currentPrize.value = null
  currentWinners.value = []
  rollingOffset.value = 0
  
  if (config.value.show_participants) {
    startWaterfall()
  }
}

const loadSessionData = async () => {
  if (!config.value.current_session_id) return
  
  try {
    const res = await fetch(`/api/sessions/${config.value.current_session_id}`)
    if (res.ok) {
      const data = await res.json()
      currentSession.value = data
      participants.value = data.participants || []
      winners.value = (data.results || []).map((r: any) => ({
        name: r.participant_name,
        level: r.prize_level,
        prize: r.prize_name
      }))
    }
  } catch (e) {
    console.error('加载场次数据失败:', e)
  }
}

const loadConfig = async () => {
  try {
    const res = await fetch('/api/config')
    if (res.ok) {
      const data = await res.json()
      config.value = { ...config.value, ...data }
      
      if (data.layout_config) {
        try {
          const layout = JSON.parse(data.layout_config)
          if (layout.settings) {
            layoutSettings.value = { ...layoutSettings.value, ...layout.settings }
          }
          if (layout.items && Array.isArray(layout.items)) {
            layoutItems.value = layout.items.map((item: any) => ({
              ...defaultLayout.find(d => d.id === item.id) || {},
              ...item
            }))
          }
        } catch (e) {
          console.error('解析布局配置失败:', e)
        }
      }
    }
  } catch (e) {
    console.error('加载配置失败:', e)
  }
}

onMounted(async () => {
  await loadConfig()
  await loadSessionData()
  
  if (config.value.show_participants && participants.value.length > 0) {
    startWaterfall()
  }
  
  window.addEventListener('resize', handleResize)
  
  socket.value = io(window.location.origin, {
    path: '/socket.io'
  })
  
  socket.value.on('connect', () => {
    isConnected.value = true
    console.log('Socket 已连接')
  })
  
  socket.value.on('disconnect', () => {
    isConnected.value = false
    console.log('Socket 已断开')
  })
  
  socket.value.on('config:updated', (data: any) => {
    console.log('收到配置更新:', data)
    const prevShowParticipants = config.value.show_participants
    const prevSessionId = config.value.current_session_id
    const prevSceneId = config.value.current_scene_id
    
    config.value = { ...config.value, ...data }
    
    if (data.layout_config) {
      try {
        const layout = JSON.parse(data.layout_config)
        if (layout.settings) {
          layoutSettings.value = { ...layoutSettings.value, ...layout.settings }
        }
        if (layout.items && Array.isArray(layout.items)) {
          layoutItems.value = layout.items.map((item: any) => ({
            ...defaultLayout.find(d => d.id === item.id) || {},
            ...item
          }))
        }
      } catch (e) {
        console.error('解析布局配置失败:', e)
      }
    }
    
    if (data.show_participants !== undefined && data.show_participants !== prevShowParticipants) {
      if (data.show_participants && drawState.value === 'idle') {
        startWaterfall()
      } else {
        stopWaterfall()
      }
    }
    
    if (data.current_session_id !== prevSessionId || data.current_scene_id !== prevSceneId) {
      loadSessionData().then(() => {
        if (config.value.show_participants && drawState.value === 'idle') {
          startWaterfall()
        }
      })
    }
  })
  
  socket.value.on('draw:start', (data: any) => {
    console.log('收到抽奖开始事件:', data)
    currentPrize.value = {
      name: data.prize_name,
      level: data.prize_level
    }
    drawState.value = 'rolling'
    startRolling()
  })
  
  socket.value.on('draw:result', (data: any) => {
    console.log('收到抽奖结果事件:', data)
    const winnerNames = data.winners?.map((w: any) => w.name) || [data.winner?.name]
    currentPrize.value = data.prize
    stopRolling(winnerNames)
    
    winnerNames.forEach((name: string) => {
      if (!winners.value.find(w => w.name === name)) {
        winners.value.unshift({
          name,
          level: data.prize?.level,
          prize: data.prize?.name
        })
      }
    })
    
    participants.value = participants.value.map(p => {
      if (winnerNames.includes(p.name)) {
        return { ...p, status: '已中奖' }
      }
      return p
    })
  })
  
  socket.value.on('draw:reset', () => {
    resetDraw()
    loadSessionData()
  })
  
  socket.value.emit('display:join', { sessionId: config.value.current_session_id })
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  if (rollingTimer) clearTimeout(rollingTimer)
  if (waterfallTimer) cancelAnimationFrame(waterfallTimer)
  if (socket.value) socket.value.disconnect()
})
</script>

<style scoped>
.lottery-display {
  min-height: 100vh;
  color: #f1f5f9;
  font-family: 'Microsoft YaHei', 'PingFang SC', sans-serif;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
}

.particles-bg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  overflow: hidden;
}

.particle {
  position: absolute;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  animation: float 15s infinite ease-in-out;
}

@keyframes float {
  0%, 100% { transform: translateY(0) translateX(0); opacity: 0.3; }
  25% { transform: translateY(-20px) translateX(10px); opacity: 0.6; }
  50% { transform: translateY(-10px) translateX(-10px); opacity: 0.4; }
  75% { transform: translateY(-30px) translateX(5px); opacity: 0.5; }
}

.connection-status {
  position: fixed;
  top: 20px;
  right: 20px;
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 14px;
  background: rgba(239, 68, 68, 0.2);
  color: #fca5a5;
  backdrop-filter: blur(10px);
  z-index: 100;
}

.connection-status.connected {
  background: rgba(34, 197, 94, 0.2);
  color: #86efac;
}

.header {
  text-align: center;
  padding: 30px 20px 10px;
  position: relative;
  z-index: 10;
}

.title {
  font-size: clamp(32px, 6vw, 64px);
  font-weight: bold;
  background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 50%, #fbbf24 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  text-shadow: 0 4px 30px rgba(251, 191, 36, 0.3);
  margin: 0;
  letter-spacing: 8px;
}

.session-info {
  margin-top: 10px;
}

.session-tag {
  display: inline-block;
  padding: 8px 20px;
  background: linear-gradient(135deg, #f59e0b, #d97706);
  border-radius: 20px;
  font-size: 16px;
  font-weight: bold;
  color: #fff;
}

.main-content {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  position: relative;
  z-index: 10;
}

.idle-state {
  text-align: center;
}

.layout-grid {
  width: 100%;
  max-width: 1600px;
  margin: 0 auto;
}

.layout-item {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  padding: 20px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  overflow: hidden;
}

.stats-item {
  display: flex;
  align-items: center;
  justify-content: center;
}

.stats-item .stats-row {
  display: flex;
  justify-content: space-around;
  width: 100%;
}

.participants-item,
.prizes-item {
  overflow-y: auto;
}

.ready-hint {
  margin-bottom: 40px;
}

.hint-icon {
  font-size: 80px;
  margin-bottom: 20px;
  animation: bounce 2s infinite;
}

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-15px); }
}

.hint-text {
  font-size: 28px;
  font-weight: bold;
  color: #e2e8f0;
  margin-bottom: 10px;
}

.hint-sub {
  font-size: 16px;
  color: #94a3b8;
}

.stats-row {
  display: flex;
  gap: 30px;
  justify-content: center;
}

.stat-card {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  padding: 20px 40px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.stat-value {
  font-size: 48px;
  font-weight: bold;
  color: #fbbf24;
}

.stat-label {
  font-size: 14px;
  color: #94a3b8;
  margin-top: 5px;
}

.participants-section {
  margin-top: 40px;
  max-width: 800px;
  margin-left: auto;
  margin-right: auto;
}

.section-title {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  font-size: 20px;
  font-weight: bold;
  color: #fbbf24;
  margin-bottom: 20px;
}

.title-icon {
  font-size: 24px;
}

.participant-count {
  font-size: 14px;
  color: #94a3b8;
  font-weight: normal;
}

.participants-waterfall {
  display: flex;
  gap: 20px;
  height: 200px;
  overflow: hidden;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 16px;
  padding: 15px;
  position: relative;
}

.participants-waterfall::before,
.participants-waterfall::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  height: 40px;
  pointer-events: none;
  z-index: 10;
}

.participants-waterfall::before {
  top: 0;
  background: linear-gradient(to bottom, rgba(0, 0, 0, 0.2), transparent);
}

.participants-waterfall::after {
  bottom: 0;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.2), transparent);
}

.waterfall-track {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.track-second {
  direction: rtl;
}

.participant-item {
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(5px);
  border-radius: 10px;
  padding: 8px 15px;
  height: 32px;
  white-space: nowrap;
}

.participant-avatar {
  width: 28px;
  height: 28px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: bold;
  color: #fff;
  flex-shrink: 0;
}

.participant-name {
  font-size: 14px;
  color: #e2e8f0;
  overflow: hidden;
  text-overflow: ellipsis;
}

.participant-status {
  font-size: 14px;
  margin-left: auto;
}

.prizes-section {
  margin-top: 40px;
  max-width: 900px;
  margin-left: auto;
  margin-right: auto;
}

.empty-hint {
  text-align: center;
  padding: 40px 20px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  color: #94a3b8;
  font-size: 16px;
}

.prize-count {
  font-size: 14px;
  color: #94a3b8;
  font-weight: normal;
}

.prizes-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 20px;
  padding: 10px;
}

.prize-card {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  overflow: hidden;
  border: 2px solid rgba(255, 255, 255, 0.1);
  transition: transform 0.3s, box-shadow 0.3s;
}

.prize-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
}

.prize-card.level-special { border-color: rgba(239, 68, 68, 0.5); }
.prize-card.level-first { border-color: rgba(251, 191, 36, 0.5); }
.prize-card.level-second { border-color: rgba(59, 130, 246, 0.5); }
.prize-card.level-third { border-color: rgba(16, 185, 129, 0.5); }

.prize-image {
  height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.2);
  overflow: hidden;
}

.prize-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.prize-placeholder {
  font-size: 48px;
}

.prize-content {
  padding: 15px;
}

.prize-level-tag {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: bold;
  margin-bottom: 8px;
}

.prize-level-tag.level-special { background: linear-gradient(135deg, #ef4444, #dc2626); }
.prize-level-tag.level-first { background: linear-gradient(135deg, #f59e0b, #d97706); }
.prize-level-tag.level-second { background: linear-gradient(135deg, #3b82f6, #2563eb); }
.prize-level-tag.level-third { background: linear-gradient(135deg, #10b981, #059669); }
.prize-level-tag.level-participation { background: linear-gradient(135deg, #6b7280, #4b5563); }

.prize-title {
  font-size: 18px;
  font-weight: bold;
  color: #f1f5f9;
  margin-bottom: 8px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.prize-quantity {
  font-size: 14px;
  color: #94a3b8;
}

.prize-quantity .remaining {
  font-size: 20px;
  font-weight: bold;
  color: #fbbf24;
}

.prize-quantity .total {
  color: #64748b;
}

.prize-quantity .unit {
  margin-left: 5px;
  color: #64748b;
}

.rolling-state {
  text-align: center;
  width: 100%;
  max-width: 600px;
}

.prize-info {
  margin-bottom: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 15px;
}

.prize-level {
  padding: 8px 20px;
  border-radius: 20px;
  font-size: 18px;
  font-weight: bold;
}

.prize-level.level-special { background: linear-gradient(135deg, #ef4444, #dc2626); }
.prize-level.level-first { background: linear-gradient(135deg, #f59e0b, #d97706); }
.prize-level.level-second { background: linear-gradient(135deg, #3b82f6, #2563eb); }
.prize-level.level-third { background: linear-gradient(135deg, #10b981, #059669); }
.prize-level.level-participation { background: linear-gradient(135deg, #6b7280, #4b5563); }

.prize-name {
  font-size: 24px;
  font-weight: bold;
  color: #f1f5f9;
}

.rolling-container {
  position: relative;
  margin: 20px auto;
  width: 300px;
  height: 180px;
  overflow: hidden;
}

.rolling-box {
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 16px;
  overflow: hidden;
  border: 2px solid rgba(251, 191, 36, 0.3);
}

.rolling-names {
  transition: transform 0.05s linear;
}

.rolling-name {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  font-weight: bold;
  color: #f1f5f9;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.rolling-indicator {
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  pointer-events: none;
}

.indicator-line {
  flex: 1;
  height: 3px;
  background: linear-gradient(90deg, transparent, #fbbf24);
}

.indicator-line.right {
  background: linear-gradient(90deg, #fbbf24, transparent);
}

.indicator-arrow {
  color: #fbbf24;
  font-size: 24px;
  animation: pulse 0.5s infinite;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.2); }
}

.rolling-hint {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: #fbbf24;
  font-size: 18px;
  margin-top: 20px;
}

.pulse-dot {
  width: 10px;
  height: 10px;
  background: #fbbf24;
  border-radius: 50%;
  animation: pulseDot 1s infinite;
}

@keyframes pulseDot {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

.result-state {
  text-align: center;
  width: 100%;
  max-width: 800px;
}

.result-header {
  margin-bottom: 20px;
}

.congrats-text {
  font-size: 36px;
  font-weight: bold;
  color: #fbbf24;
  text-shadow: 0 0 30px rgba(251, 191, 36, 0.5);
  animation: glow 1s ease-in-out infinite alternate;
}

@keyframes glow {
  from { text-shadow: 0 0 20px rgba(251, 191, 36, 0.5); }
  to { text-shadow: 0 0 40px rgba(251, 191, 36, 0.8), 0 0 60px rgba(251, 191, 36, 0.4); }
}

.prize-badge {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  padding: 15px 40px;
  border-radius: 20px;
  margin-bottom: 30px;
  animation: scaleIn 0.5s ease;
}

@keyframes scaleIn {
  from { transform: scale(0); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

.prize-badge.level-special { background: linear-gradient(135deg, #ef4444, #dc2626); }
.prize-badge.level-first { background: linear-gradient(135deg, #f59e0b, #d97706); }
.prize-badge.level-second { background: linear-gradient(135deg, #3b82f6, #2563eb); }
.prize-badge.level-third { background: linear-gradient(135deg, #10b981, #059669); }

.badge-level {
  font-size: 20px;
  font-weight: bold;
  color: rgba(255, 255, 255, 0.9);
}

.badge-name {
  font-size: 28px;
  font-weight: bold;
  color: #fff;
}

.winners-showcase {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  justify-content: center;
}

.winner-card {
  display: flex;
  align-items: center;
  gap: 15px;
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.2), rgba(245, 158, 11, 0.1));
  border: 2px solid rgba(251, 191, 36, 0.3);
  border-radius: 16px;
  padding: 15px 25px;
  animation: slideIn 0.5s ease forwards;
  opacity: 0;
  transform: translateY(20px);
}

@keyframes slideIn {
  to { opacity: 1; transform: translateY(0); }
}

.winner-avatar {
  width: 60px;
  height: 60px;
  background: linear-gradient(135deg, #fbbf24, #f59e0b);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  font-weight: bold;
  color: #1f2937;
}

.winner-info {
  text-align: left;
}

.winner-name {
  font-size: 24px;
  font-weight: bold;
  color: #fbbf24;
}

.winner-phone {
  font-size: 14px;
  color: #94a3b8;
  margin-top: 4px;
}

.winner-rank {
  font-size: 14px;
  color: #fbbf24;
  background: rgba(251, 191, 36, 0.2);
  padding: 4px 12px;
  border-radius: 10px;
}

.footer {
  padding: 20px;
  position: relative;
  z-index: 10;
}

.winner-history {
  background: rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  padding: 15px 20px;
  max-width: 600px;
  margin: 0 auto;
}

.history-title {
  font-size: 16px;
  font-weight: bold;
  color: #fbbf24;
  margin-bottom: 10px;
}

.history-list {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.history-item {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(255, 255, 255, 0.1);
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 14px;
}

.history-name {
  color: #e2e8f0;
}

.history-prize {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
}

.history-prize.level-special { background: #ef4444; }
.history-prize.level-first { background: #f59e0b; }
.history-prize.level-second { background: #3b82f6; }
.history-prize.level-third { background: #10b981; }

.confetti-canvas {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 1000;
}

.slide-fade-enter-active {
  transition: all 0.3s ease;
}

.slide-fade-leave-active {
  transition: all 0.2s ease;
}

.slide-fade-enter-from {
  transform: translateY(20px);
  opacity: 0;
}

.slide-fade-leave-to {
  transform: translateY(-20px);
  opacity: 0;
}
</style>
