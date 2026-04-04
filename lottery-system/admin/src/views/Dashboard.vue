<template>
  <div class="dashboard">
    <el-row :gutter="20">
      <el-col :span="16">
        <el-card header="抽奖控制">
          <el-form :model="form" label-width="100px">
            <el-form-item label="选择场次">
              <el-select v-model="form.session_id" placeholder="选择场次" style="width: 100%" @change="loadSessionDetail">
                <el-option v-for="s in sessions" :key="s.id" :label="s.name" :value="s.id">
                  <span>{{ s.name }}</span>
                  <el-tag size="small" :type="getStatusType(s.status)" style="margin-left: 8px">{{ s.status }}</el-tag>
                </el-option>
              </el-select>
            </el-form-item>

            <el-form-item label="抽奖模式">
              <el-radio-group v-model="form.draw_mode" :disabled="!form.session_id || isRolling">
                <el-radio-button label="single">单人抽奖</el-radio-button>
                <el-radio-button label="batch">批量抽奖</el-radio-button>
                <el-radio-button label="level">按等级抽奖</el-radio-button>
              </el-radio-group>
            </el-form-item>

            <template v-if="form.draw_mode === 'single' || form.draw_mode === 'batch'">
              <el-form-item label="选择奖品">
                <el-select v-model="form.prize_id" placeholder="选择奖品" style="width: 100%" :disabled="!form.session_id || isRolling">
                  <el-option v-for="p in prizes" :key="p.id" :label="`${p.name} (剩余: ${p.remaining}/${p.quantity})`" :value="p.id">
                    <span>{{ p.name }}</span>
                    <el-tag size="small" :type="getLevelType(p.level)" style="margin-left: 8px">{{ p.level }}</el-tag>
                    <el-tag size="small" :type="p.remaining > 0 ? 'success' : 'danger'" style="margin-left: 8px">
                      剩余: {{ p.remaining }}/{{ p.quantity }}
                    </el-tag>
                  </el-option>
                </el-select>
              </el-form-item>
            </template>

            <template v-if="form.draw_mode === 'batch'">
              <el-form-item label="抽取人数">
                <el-input-number v-model="form.draw_count" :min="1" :max="maxDrawCount" :disabled="!form.prize_id || isRolling" />
                <span style="margin-left: 10px; color: #909399;">最多可抽 {{ maxDrawCount }} 人</span>
              </el-form-item>
            </template>

            <template v-if="form.draw_mode === 'level'">
              <el-form-item label="奖品等级">
                <el-select v-model="form.prize_level" placeholder="选择等级" style="width: 100%" :disabled="!form.session_id || isRolling" @change="onLevelChange">
                  <el-option v-for="l in prizeLevels" :key="l.level" :label="`${l.level} (剩余: ${l.remaining}/${l.total_quantity})`" :value="l.level">
                    <span>{{ l.level }}</span>
                    <el-tag size="small" :type="l.remaining > 0 ? 'success' : 'danger'" style="margin-left: 8px">
                      剩余: {{ l.remaining }}/{{ l.total_quantity }}
                    </el-tag>
                  </el-option>
                </el-select>
              </el-form-item>
              <el-form-item label="抽取人数">
                <el-input-number v-model="form.draw_count" :min="1" :max="maxLevelDrawCount" :disabled="!form.prize_level || isRolling" />
                <span style="margin-left: 10px; color: #909399;">最多可抽 {{ maxLevelDrawCount }} 人</span>
              </el-form-item>
            </template>

            <el-form-item label="重复中奖">
              <el-switch 
                v-model="form.allow_repeat" 
                :disabled="!form.session_id || isRolling"
                active-text="允许"
                inactive-text="不允许"
              />
              <span style="margin-left: 10px; color: #909399; font-size: 12px;">开启后同一人可多次中奖</span>
            </el-form-item>

            <el-form-item>
              <el-button 
                v-if="!isRolling"
                type="primary" 
                size="large" 
                :disabled="!canStart" 
                @click="startDraw"
              >
                <el-icon><VideoPlay /></el-icon>
                开始抽奖
              </el-button>
              <el-button 
                v-else
                type="success" 
                size="large" 
                @click="stopDraw"
              >
                <el-icon><VideoPause /></el-icon>
                停止抽奖
              </el-button>
              <el-button size="large" @click="resetDraw" :disabled="!form.session_id">重置场次</el-button>
            </el-form-item>
          </el-form>
        </el-card>

        <el-card header="中奖结果" style="margin-top: 20px" v-if="lastResult">
          <div class="winner-result">
            <div class="prize-info">
              <el-tag :type="getLevelType(lastResult.prize.level)" size="large">{{ lastResult.prize.level }}</el-tag>
              <span class="prize-name">{{ lastResult.prize.name }}</span>
            </div>
            <div class="winners-grid">
              <div v-for="winner in lastResult.winners" :key="winner.id" class="winner-card">
                <el-avatar :size="60">{{ winner.name.charAt(0) }}</el-avatar>
                <div class="winner-name">{{ winner.name }}</div>
                <div class="winner-info">{{ winner.phone }}</div>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>

      <el-col :span="8">
        <el-card header="当前状态">
          <el-descriptions :column="1" border>
            <el-descriptions-item label="连接状态">
              <el-tag :type="isConnected ? 'success' : 'danger'">{{ isConnected ? '已连接' : '未连接' }}</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="抽奖状态">
              <el-tag :type="isRolling ? 'warning' : 'info'">{{ isRolling ? '抽奖进行中...' : '等待开始' }}</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="当前场次">
              {{ currentSession?.name || '未选择' }}
            </el-descriptions-item>
            <el-descriptions-item label="参与人数">
              {{ currentSession?.participants?.length || 0 }} 人
            </el-descriptions-item>
            <el-descriptions-item label="已中奖">
              {{ currentSession?.participants?.filter((p: any) => p.status === '已中奖').length || 0 }} 人
            </el-descriptions-item>
          </el-descriptions>
        </el-card>

        <el-card header="奖品等级概览" style="margin-top: 20px">
          <div v-for="level in prizeLevels" :key="level.level" class="level-item">
            <div class="level-header">
              <el-tag :type="getLevelType(level.level)">{{ level.level }}</el-tag>
              <span class="level-count">{{ level.remaining }}/{{ level.total_quantity }}</span>
            </div>
            <el-progress :percentage="level.total_quantity > 0 ? (level.remaining / level.total_quantity) * 100 : 0" :color="getLevelColor(level.level)" />
          </div>
          <div v-if="prizeLevels.length === 0" style="text-align: center; color: #909399; padding: 20px;">
            请先选择场次
          </div>
        </el-card>

        <el-card header="最近中奖" style="margin-top: 20px">
          <el-table :data="recentWinners" stripe size="small" max-height="300">
            <el-table-column prop="participant_name" label="中奖者" />
            <el-table-column prop="prize_level" label="等级" width="70">
              <template #default="{ row }">
                <el-tag :type="getLevelType(row.prize_level)" size="small">{{ row.prize_level }}</el-tag>
              </template>
            </el-table-column>
          </el-table>
          <div v-if="recentWinners.length === 0" style="text-align: center; color: #909399; padding: 20px;">
            暂无中奖记录
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, inject } from 'vue'
import { io } from 'socket.io-client'
import { ElMessage, ElMessageBox } from 'element-plus'
import { VideoPlay, VideoPause } from '@element-plus/icons-vue'
import { getSessions, getSession, getPrizeLevels, resetSession, drawByLevel } from '../api/sessions'
import { startDraw as apiStartDraw, stopDraw as apiStopDraw } from '../api/console'
import { updateConfig } from '../api/config'

const socket = ref<any>(null)
const isConnected = ref(false)
const isRolling = ref(false)
const sessions = ref<any[]>([])
const prizes = ref<any[]>([])
const prizeLevels = ref<any[]>([])
const recentWinners = ref<any[]>([])
const currentSession = ref<any>(null)
const lastResult = ref<any>(null)
const sceneId = inject<any>('sceneId')
const isInitialized = inject<any>('isInitialized')

const form = ref({
  session_id: null as number | null,
  draw_mode: 'single' as 'single' | 'batch' | 'level',
  prize_id: null as number | null,
  prize_level: null as string | null,
  draw_count: 1,
  allow_repeat: false
})

const maxDrawCount = computed(() => {
  if (!form.value.prize_id) return 1
  const prize = prizes.value.find(p => p.id === form.value.prize_id)
  return prize ? prize.remaining : 1
})

const maxLevelDrawCount = computed(() => {
  if (!form.value.prize_level) return 1
  const level = prizeLevels.value.find(l => l.level === form.value.prize_level)
  return level ? level.remaining : 1
})

const canStart = computed(() => {
  if (!form.value.session_id || isRolling.value) return false
  if (form.value.draw_mode === 'single') return !!form.value.prize_id
  if (form.value.draw_mode === 'batch') return !!form.value.prize_id && form.value.draw_count > 0
  if (form.value.draw_mode === 'level') return !!form.value.prize_level && form.value.draw_count > 0
  return false
})

const getStatusType = (status: string) => {
  const map: Record<string, string> = { '未开始': 'info', '进行中': 'success', '已结束': 'danger' }
  return map[status] || 'info'
}

const getLevelType = (level: string) => {
  const map: Record<string, string> = {
    '特等奖': 'danger',
    '一等奖': 'warning',
    '二等奖': 'success',
    '三等奖': 'info',
    '参与奖': ''
  }
  return map[level] || ''
}

const getLevelColor = (level: string) => {
  const map: Record<string, string> = {
    '特等奖': '#f56c6c',
    '一等奖': '#e6a23c',
    '二等奖': '#67c23a',
    '三等奖': '#409eff',
    '参与奖': '#909399'
  }
  return map[level] || '#409eff'
}

const loadSessions = async () => {
  if (!sceneId.value) return
  sessions.value = await getSessions(sceneId.value)
}

const loadSessionDetail = async () => {
  if (!form.value.session_id) {
    prizes.value = []
    prizeLevels.value = []
    recentWinners.value = []
    currentSession.value = null
    form.value.prize_id = null
    form.value.prize_level = null
    return
  }
  
  const detail = await getSession(form.value.session_id)
  prizes.value = detail.prizes || []
  recentWinners.value = detail.results || []
  currentSession.value = detail
  form.value.prize_id = null
  form.value.prize_level = null
  
  prizeLevels.value = await getPrizeLevels(form.value.session_id)
  
  await updateConfig({ current_session_id: form.value.session_id })
}

const onLevelChange = () => {
  form.value.draw_count = 1
}

const startDraw = async () => {
  if (!canStart.value) return
  
  isRolling.value = true
  lastResult.value = null
  
  try {
    let prizeInfo: any = null
    let prizeId: number | null = null
    
    if (form.value.draw_mode === 'single' || form.value.draw_mode === 'batch') {
      prizeInfo = prizes.value.find(p => p.id === form.value.prize_id)
      prizeId = form.value.prize_id
    } else if (form.value.draw_mode === 'level') {
      const levelPrize = prizes.value.find(p => p.level === form.value.prize_level && p.remaining > 0)
      if (levelPrize) {
        prizeId = levelPrize.id
        prizeInfo = levelPrize
      }
    }
    
    if (!prizeId) {
      ElMessage.error('没有可用的奖品')
      isRolling.value = false
      return
    }
    
    socket.value?.emit('draw:start', {
      session_id: form.value.session_id,
      prize_id: prizeId,
      prize_name: prizeInfo?.name,
      prize_level: prizeInfo?.level
    })
    
  } catch (error: any) {
    ElMessage.error(error.response?.data?.error || '开始抽奖失败')
    isRolling.value = false
  }
}

const stopDraw = async () => {
  if (!form.value.session_id) return
  
  try {
    let prizeId: number | null = null
    let count = 1
    
    if (form.value.draw_mode === 'single') {
      prizeId = form.value.prize_id
      count = 1
    } else if (form.value.draw_mode === 'batch') {
      prizeId = form.value.prize_id
      count = form.value.draw_count
    } else if (form.value.draw_mode === 'level') {
      const levelPrize = prizes.value.find(p => p.level === form.value.prize_level && p.remaining > 0)
      if (levelPrize) {
        prizeId = levelPrize.id
        count = form.value.draw_count
      }
    }
    
    if (!prizeId) {
      ElMessage.error('没有可用的奖品')
      isRolling.value = false
      return
    }
    
    const result = await apiStopDraw(form.value.session_id!, prizeId, count, form.value.allow_repeat)
    
    if (result.success) {
      lastResult.value = result
      ElMessage.success(`成功抽取 ${result.winners.length} 位中奖者！`)
      await loadSessionDetail()
    }
  } catch (error: any) {
    ElMessage.error(error.response?.data?.error || '停止抽奖失败')
  } finally {
    isRolling.value = false
  }
}

const resetDraw = async () => {
  try {
    await ElMessageBox.confirm('确定要重置该场次吗？这将清除所有中奖记录。', '警告', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    await resetSession(form.value.session_id!)
    ElMessage.success('场次已重置')
    lastResult.value = null
    await loadSessionDetail()
  } catch {}
}

watch(maxDrawCount, (val) => {
  if (form.value.draw_count > val) {
    form.value.draw_count = val
  }
})

watch(maxLevelDrawCount, (val) => {
  if (form.value.draw_count > val) {
    form.value.draw_count = val
  }
})

watch(sceneId, () => {
  if (sceneId.value) {
    loadSessions()
    form.value.session_id = null
    prizes.value = []
    prizeLevels.value = []
    recentWinners.value = []
    currentSession.value = null
  }
})

watch(isInitialized, () => {
  if (isInitialized.value && sceneId.value) loadSessions()
})

onMounted(() => {
  if (isInitialized.value && sceneId.value) loadSessions()
  
  socket.value = io('http://localhost:3000', { path: '/socket.io' })
  socket.value.on('connect', () => { isConnected.value = true })
  socket.value.on('disconnect', () => { isConnected.value = false })
  socket.value.on('draw:result', () => {
    loadSessionDetail()
  })
})

onUnmounted(() => {
  if (socket.value) socket.value.disconnect()
})
</script>

<style scoped>
.dashboard {
  padding: 0;
}

.winner-result {
  text-align: center;
}

.prize-info {
  margin-bottom: 20px;
}

.prize-name {
  font-size: 24px;
  font-weight: bold;
  margin-left: 12px;
}

.winners-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  justify-content: center;
}

.winner-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  min-width: 120px;
}

.winner-name {
  color: #fff;
  font-size: 18px;
  font-weight: bold;
  margin-top: 8px;
}

.winner-info {
  color: rgba(255, 255, 255, 0.8);
  font-size: 12px;
  margin-top: 4px;
}

.level-item {
  margin-bottom: 16px;
}

.level-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.level-count {
  font-size: 14px;
  color: #606266;
}
</style>
