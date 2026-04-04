<template>
  <div>
    <el-page-header @back="goBack" content="场次详情" style="margin-bottom: 20px" />

    <el-card style="margin-bottom: 20px">
      <template #header>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span>基本信息</span>
          <div>
            <el-tag :type="getStatusType(session.status)" size="large">{{ session.status }}</el-tag>
            <el-button type="warning" size="small" style="margin-left: 10px" @click="handleReset" :disabled="session.status === '未开始'">重置场次</el-button>
          </div>
        </div>
      </template>
      <el-descriptions :column="3" border>
        <el-descriptions-item label="场次名称">{{ session.name }}</el-descriptions-item>
        <el-descriptions-item label="描述">{{ session.description || '无' }}</el-descriptions-item>
        <el-descriptions-item label="创建时间">{{ formatTime(session.created_at) }}</el-descriptions-item>
      </el-descriptions>
    </el-card>

    <el-row :gutter="20">
      <el-col :span="8">
        <el-card header="参与人员">
          <template #extra>
            <el-button type="primary" size="small" @click="showAddParticipantDialog">添加人员</el-button>
          </template>
          <el-table :data="participants" stripe size="small" max-height="400">
            <el-table-column prop="name" label="姓名" />
            <el-table-column prop="weight" label="权重" width="60" />
            <el-table-column prop="status" label="状态" width="80">
              <template #default="{ row }">
                <el-tag :type="row.status === '已中奖' ? 'success' : 'info'" size="small">{{ row.status }}</el-tag>
              </template>
            </el-table-column>
          </el-table>
          <div style="margin-top: 10px; color: #909399; font-size: 12px;">
            共 {{ participants.length }} 人，已中奖 {{ participants.filter(p => p.status === '已中奖').length }} 人
          </div>
        </el-card>
      </el-col>

      <el-col :span="8">
        <el-card header="奖品列表">
          <template #extra>
            <el-button type="primary" size="small" @click="showAddPrizeDialog">添加奖品</el-button>
          </template>
          <el-table :data="sessionPrizes" stripe size="small" max-height="400">
            <el-table-column prop="name" label="奖品" />
            <el-table-column prop="level" label="等级" width="80">
              <template #default="{ row }">
                <el-tag :type="getLevelType(row.level)" size="small">{{ row.level }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="数量" width="100">
              <template #default="{ row }">
                <span :style="{ color: row.remaining > 0 ? '#67c23a' : '#f56c6c' }">
                  {{ row.remaining }}/{{ row.quantity }}
                </span>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>

      <el-col :span="8">
        <el-card header="中奖记录">
          <el-table :data="results" stripe size="small" max-height="450">
            <el-table-column prop="participant_name" label="中奖者" />
            <el-table-column prop="prize_name" label="奖品" />
            <el-table-column prop="drawn_at" label="时间" width="140">
              <template #default="{ row }">
                {{ formatTime(row.drawn_at) }}
              </template>
            </el-table-column>
          </el-table>
          <div v-if="results.length === 0" style="text-align: center; color: #909399; padding: 20px;">
            暂无中奖记录
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-dialog v-model="addParticipantDialogVisible" title="添加人员" width="600px">
      <el-transfer
        v-model="selectedParticipants"
        :data="allParticipants"
        :titles="['可选人员', '已选人员']"
        :props="{ key: 'id', label: 'name' }"
      />
      <template #footer>
        <el-button @click="addParticipantDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleAddParticipants">确认</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="addPrizeDialogVisible" title="添加奖品" width="500px">
      <el-form :model="prizeForm" label-width="80px">
        <el-form-item label="奖品">
          <el-select v-model="prizeForm.prize_id" placeholder="选择奖品" style="width: 100%">
            <el-option v-for="p in allPrizes" :key="p.id" :label="p.name" :value="p.id">
              <span>{{ p.name }}</span>
              <el-tag size="small" :type="getLevelType(p.level)" style="margin-left: 8px">{{ p.level }}</el-tag>
            </el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="数量">
          <el-input-number v-model="prizeForm.quantity" :min="1" :max="100" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="addPrizeDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleAddPrize">确认</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getSession, addParticipants, addPrize, resetSession } from '../api/sessions'
import { getParticipants } from '../api/participants'
import { getPrizes } from '../api/prizes'

const route = useRoute()
const router = useRouter()
const sessionId = Number(route.params.id)

const session = ref<any>({})
const participants = ref<any[]>([])
const sessionPrizes = ref<any[]>([])
const results = ref<any[]>([])

const addParticipantDialogVisible = ref(false)
const addPrizeDialogVisible = ref(false)
const selectedParticipants = ref<number[]>([])
const allParticipants = ref<any[]>([])
const allPrizes = ref<any[]>([])
const prizeForm = ref({ prize_id: null as number | null, quantity: 1 })

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

const formatTime = (time: string) => {
  if (!time) return ''
  const date = new Date(time)
  return date.toLocaleString('zh-CN')
}

const loadSessionDetail = async () => {
  const detail = await getSession(sessionId)
  session.value = detail
  participants.value = detail.participants || []
  sessionPrizes.value = detail.prizes || []
  results.value = detail.results || []
}

const showAddParticipantDialog = async () => {
  const all = await getParticipants()
  allParticipants.value = all.filter((p: any) => !participants.value.find((pp: any) => pp.id === p.id))
  selectedParticipants.value = []
  addParticipantDialogVisible.value = true
}

const handleAddParticipants = async () => {
  if (selectedParticipants.value.length === 0) return ElMessage.warning('请选择人员')
  await addParticipants(sessionId, [...participants.value.map(p => p.id), ...selectedParticipants.value])
  ElMessage.success('添加成功')
  addParticipantDialogVisible.value = false
  loadSessionDetail()
}

const showAddPrizeDialog = async () => {
  allPrizes.value = await getPrizes()
  prizeForm.value = { prize_id: null, quantity: 1 }
  addPrizeDialogVisible.value = true
}

const handleAddPrize = async () => {
  if (!prizeForm.value.prize_id) return ElMessage.warning('请选择奖品')
  await addPrize(sessionId, prizeForm.value.prize_id, prizeForm.value.quantity)
  ElMessage.success('添加成功')
  addPrizeDialogVisible.value = false
  loadSessionDetail()
}

const handleReset = async () => {
  try {
    await ElMessageBox.confirm('确定要重置该场次吗？这将清除所有中奖记录。', '警告', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    await resetSession(sessionId)
    ElMessage.success('场次已重置')
    loadSessionDetail()
  } catch {}
}

const goBack = () => {
  router.push('/sessions')
}

onMounted(() => loadSessionDetail())
</script>
