<template>
  <div class="dashboard">
    <el-row :gutter="20">
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-icon participants">
              <el-icon><User /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.totalParticipants }}</div>
              <div class="stat-label">总人数</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-icon prizes">
              <el-icon><Present /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.totalPrizes }}</div>
              <div class="stat-label">奖品数量</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-icon winners">
              <el-icon><Trophy /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.winners }}</div>
              <div class="stat-label">已中奖</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-icon remaining">
              <el-icon><Box /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.remainingPrizes }}</div>
              <div class="stat-label">剩余奖品</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" class="mt-4">
      <el-col :span="12">
        <el-card class="control-card">
          <template #header>
            <div class="card-header">
              <span>抽奖控制</span>
            </div>
          </template>

          <el-form :model="drawControl" label-width="100px">
            <el-form-item label="选择场次">
              <el-select v-model="drawControl.sessionId" placeholder="请选择场次" style="width: 100%">
                <el-option
                  v-for="session in sessions"
                  :key="session.id"
                  :label="session.name"
                  :value="session.id"
                />
              </el-select>
            </el-form-item>

            <el-form-item label="选择奖品">
              <el-select v-model="drawControl.prizeId" placeholder="请选择奖品" style="width: 100%">
                <el-option
                  v-for="prize in prizes"
                  :key="prize.id"
                  :label="prize.name"
                  :value="prize.id"
                />
              </el-select>
            </el-form-item>

            <div class="control-buttons">
              <el-button
                type="primary"
                size="large"
                :disabled="!drawControl.sessionId || !drawControl.prizeId || isDrawing"
                @click="startDraw"
              >
                <el-icon><VideoPlay /></el-icon>
                开始抽奖
              </el-button>
              <el-button
                type="success"
                size="large"
                :disabled="!isDrawing"
                @click="stopDraw"
              >
                <el-icon><VideoPause /></el-icon>
                停止抽奖
              </el-button>
              <el-button
                type="warning"
                size="large"
                @click="resetDraw"
              >
                <el-icon><RefreshLeft /></el-icon>
                重置
              </el-button>
            </div>
          </el-form>

          <div v-if="currentWinner" class="winner-announcement">
            <el-divider>中奖结果</el-divider>
            <div class="winner-info">
              <div class="winner-name">{{ currentWinner.winner.name }}</div>
              <div class="winner-prize">{{ currentWinner.prize.name }}</div>
            </div>
          </div>
        </el-card>
      </el-col>

      <el-col :span="12">
        <el-card class="result-card">
          <template #header>
            <div class="card-header">
              <span>中奖记录</span>
              <el-button type="text" @click="loadResults">刷新</el-button>
            </div>
          </template>

          <el-table :data="results" style="width: 100%" max-height="400">
            <el-table-column prop="winner.name" label="中奖者" width="120" />
            <el-table-column prop="prize.name" label="奖品" />
            <el-table-column prop="drawn_at" label="中奖时间" width="180">
              <template #default="{ row }">
                {{ formatDate(row.drawn_at) }}
              </template>
            </el-table-column>
          </el-table>

          <el-empty v-if="results.length === 0" description="暂无中奖记录" />
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import { User, Present, Trophy, Box, VideoPlay, VideoPause, RefreshLeft } from '@element-plus/icons-vue'
import axios from 'axios'
import { io, type Socket } from 'socket.io-client'

const API_BASE = 'http://localhost:3000/api'

const stats = reactive({
  totalParticipants: 0,
  totalPrizes: 0,
  winners: 0,
  remainingPrizes: 0
})

const sessions = ref<any[]>([])
const prizes = ref<any[]>([])
const results = ref<any[]>([])
const isDrawing = ref(false)
const currentWinner = ref<any>(null)
let socket: Socket | null = null

const drawControl = reactive({
  sessionId: null as number | null,
  prizeId: null as number | null
})

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleString('zh-CN')
}

const loadStats = async () => {
  try {
    const [participantsRes, prizesRes] = await Promise.all([
      axios.get(`${API_BASE}/participants`),
      axios.get(`${API_BASE}/prizes`)
    ])

    const participants = participantsRes.data
    const prizeList = prizesRes.data

    stats.totalParticipants = participants.length
    stats.totalPrizes = prizeList.reduce((sum: number, p: any) => sum + p.total_quantity, 0)
    stats.winners = participants.filter((p: any) => p.status === '已中奖').length
    stats.remainingPrizes = prizeList.reduce((sum: number, p: any) => sum + p.remaining_quantity, 0)
  } catch (error) {
    console.error('加载统计信息失败:', error)
  }
}

const loadSessions = async () => {
  try {
    const res = await axios.get(`${API_BASE}/sessions`)
    sessions.value = res.data
  } catch (error) {
    console.error('加载场次失败:', error)
  }
}

const loadPrizes = async () => {
  try {
    const res = await axios.get(`${API_BASE}/prizes`)
    prizes.value = res.data
  } catch (error) {
    console.error('加载奖品失败:', error)
  }
}

const loadResults = async () => {
  if (!drawControl.sessionId) return
  try {
    const res = await axios.get(`${API_BASE}/sessions/${drawControl.sessionId}`)
    results.value = res.data.results || []
  } catch (error) {
    console.error('加载中奖记录失败:', error)
  }
}

const startDraw = async () => {
  if (!drawControl.sessionId || !drawControl.prizeId) return

  try {
    await axios.post(`${API_BASE}/console/start`, {
      session_id: drawControl.sessionId,
      prize_id: drawControl.prizeId
    })
    isDrawing.value = true
    currentWinner.value = null
    ElMessage.success('抽奖已开始')
  } catch (error: any) {
    ElMessage.error(error.response?.data?.error || '开始抽奖失败')
  }
}

const stopDraw = async () => {
  try {
    const res = await axios.post(`${API_BASE}/console/stop`)
    if (res.data.success && res.data.data) {
      currentWinner.value = res.data.data
    }
    isDrawing.value = false
    ElMessage.success('抽奖已停止')
    loadStats()
    loadResults()
  } catch (error: any) {
    ElMessage.error(error.response?.data?.error || '停止抽奖失败')
  }
}

const resetDraw = async () => {
  try {
    await axios.post(`${API_BASE}/console/reset`)
    isDrawing.value = false
    currentWinner.value = null
    ElMessage.success('抽奖已重置')
    loadStats()
    loadResults()
  } catch (error: any) {
    ElMessage.error(error.response?.data?.error || '重置抽奖失败')
  }
}

const initSocket = () => {
  socket = io('http://localhost:3000')

  socket.on('connect', () => {
    console.log('WebSocket已连接')
  })

  socket.on('draw:start', () => {
    isDrawing.value = true
  })

  socket.on('draw:stop', () => {
    isDrawing.value = false
  })

  socket.on('draw:result', (data: any) => {
    currentWinner.value = data
    loadStats()
    loadResults()
  })

  socket.on('draw:reset', () => {
    isDrawing.value = false
    currentWinner.value = null
  })
}

onMounted(() => {
  loadStats()
  loadSessions()
  loadPrizes()
  initSocket()
})
</script>

<style scoped>
.dashboard {
  padding: 0;
}

.stat-card {
  margin-bottom: 20px;
}

.stat-content {
  display: flex;
  align-items: center;
  gap: 16px;
}

.stat-icon {
  width: 60px;
  height: 60px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  color: white;
}

.stat-icon.participants {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.stat-icon.prizes {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.stat-icon.winners {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
}

.stat-icon.remaining {
  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
}

.stat-info {
  flex: 1;
}

.stat-value {
  font-size: 28px;
  font-weight: bold;
  color: #303133;
  line-height: 1.2;
}

.stat-label {
  font-size: 14px;
  color: #909399;
  margin-top: 4px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
}

.control-card,
.result-card {
  min-height: 500px;
}

.control-buttons {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  margin-top: 20px;
}

.control-buttons .el-button {
  flex: 1;
  min-width: 120px;
}

.winner-announcement {
  margin-top: 24px;
}

.winner-info {
  text-align: center;
  padding: 20px;
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  border-radius: 12px;
}

.winner-name {
  font-size: 32px;
  font-weight: bold;
  color: #92400e;
  margin-bottom: 8px;
}

.winner-prize {
  font-size: 20px;
  color: #b45309;
}

.mt-4 {
  margin-top: 16px;
}
</style>
