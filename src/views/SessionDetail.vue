<template>
  <div class="session-detail">
    <el-page-header @back="goBack" :content="session.name">
      <template #extra>
        <el-button type="primary" @click="handleStatusChange" :disabled="session.status === 2">
          {{ session.status === 0 ? '开始' : session.status === 1 ? '结束' : '' }}
        </el-button>
      </template>
    </el-page-header>

    <el-card class="mb-4 mt-4">
      <template #header>
        <div class="card-header">
          <span>场次信息</span>
          <el-button type="primary" size="small" @click="handleEdit">
            <el-icon><Edit /></el-icon>
            编辑
          </el-button>
        </div>
      </template>
      <el-descriptions :column="2" border>
        <el-descriptions-item label="场次名称">{{ session.name }}</el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="getStatusType(session.status)">{{ getStatusText(session.status) }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="描述" :span="2">{{ session.description || '暂无描述' }}</el-descriptions-item>
        <el-descriptions-item label="创建时间">{{ formatDate(session.created_at) }}</el-descriptions-item>
        <el-descriptions-item label="更新时间">{{ formatDate(session.updated_at) }}</el-descriptions-item>
      </el-descriptions>
    </el-card>

    <el-tabs v-model="activeTab" class="detail-tabs">
      <el-tab-pane label="参与者管理" name="participants">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>已关联参与者 ({{ sessionParticipants.length }})</span>
              <el-button type="primary" size="small" @click="openParticipantDialog">
                <el-icon><Plus /></el-icon>
                管理参与者
              </el-button>
            </div>
          </template>
          <el-table :data="sessionParticipants" style="width: 100%" v-loading="loading">
            <el-table-column prop="id" label="ID" width="80" />
            <el-table-column prop="name" label="姓名" min-width="120" />
            <el-table-column prop="email" label="邮箱" min-width="180" />
            <el-table-column prop="phone" label="手机号" min-width="130" />
            <el-table-column prop="weight" label="权重" width="100" />
            <el-table-column label="状态" width="120">
              <template #default="{ row }">
                <el-tag v-if="row.is_blacklisted" type="danger">黑名单</el-tag>
                <el-tag v-else type="success">正常</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="100">
              <template #default="{ row }">
                <el-button type="danger" size="small" link @click="removeParticipant(row.id)">移除</el-button>
              </template>
            </el-table-column>
          </el-table>
          <el-empty v-if="sessionParticipants.length === 0 && !loading" description="暂无参与者" />
        </el-card>
      </el-tab-pane>

      <el-tab-pane label="奖品管理" name="prizes">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>已关联奖品 ({{ sessionPrizes.length }})</span>
              <el-button type="primary" size="small" @click="openPrizeDialog">
                <el-icon><Plus /></el-icon>
                管理奖品
              </el-button>
            </div>
          </template>
          <el-table :data="sessionPrizes" style="width: 100%" v-loading="loading">
            <el-table-column prop="id" label="ID" width="80" />
            <el-table-column prop="image_url" label="图片" width="120">
              <template #default="{ row }">
                <el-image
                  v-if="row.image_url"
                  :src="`http://localhost:3000${row.image_url}`"
                  fit="cover"
                  style="width: 80px; height: 80px; border-radius: 8px"
                  :preview-src-list="[`http://localhost:3000${row.image_url}`]"
                />
                <el-empty v-else description="暂无图片" :image-size="40" />
              </template>
            </el-table-column>
            <el-table-column prop="name" label="奖品名称" min-width="200" />
            <el-table-column prop="description" label="描述" min-width="300" show-overflow-tooltip />
            <el-table-column prop="count" label="总数量" width="100" />
            <el-table-column label="操作" width="100">
              <template #default="{ row }">
                <el-button type="danger" size="small" link @click="removePrize(row.id)">移除</el-button>
              </template>
            </el-table-column>
          </el-table>
          <el-empty v-if="sessionPrizes.length === 0 && !loading" description="暂无奖品" />
        </el-card>
      </el-tab-pane>

      <el-tab-pane label="抽奖结果" name="results">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>抽奖结果 ({{ results.length }})</span>
            </div>
          </template>
          <el-table :data="results" style="width: 100%" v-loading="loading">
            <el-table-column prop="id" label="ID" width="80" />
            <el-table-column label="参与者" width="180">
              <template #default="{ row }">
                {{ row.participant?.name || '-' }}
              </template>
            </el-table-column>
            <el-table-column label="奖品" width="180">
              <template #default="{ row }">
                {{ row.prize?.name || '-' }}
              </template>
            </el-table-column>
            <el-table-column prop="created_at" label="中奖时间" width="180">
              <template #default="{ row }">
                {{ formatDate(row.created_at) }}
              </template>
            </el-table-column>
          </el-table>
          <el-empty v-if="results.length === 0 && !loading" description="暂无抽奖结果" />
        </el-card>
      </el-tab-pane>
    </el-tabs>

    <el-dialog v-model="editDialogVisible" title="编辑场次" width="500px">
      <el-form :model="editForm" label-width="80px">
        <el-form-item label="场次名称">
          <el-input v-model="editForm.name" placeholder="请输入场次名称" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input
            v-model="editForm.description"
            type="textarea"
            :rows="3"
            placeholder="请输入描述"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleEditSubmit" :loading="submitLoading">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="participantDialogVisible" title="管理参与者" width="600px">
      <el-checkbox-group v-model="selectedParticipantIds">
        <el-checkbox
          v-for="participant in allParticipants"
          :key="participant.id"
          :label="participant.id"
          style="display: block; margin: 8px 0"
        >
          {{ participant.name }}
          <span v-if="participant.email" class="text-gray-500 text-sm ml-2">({{ participant.email }})</span>
        </el-checkbox>
      </el-checkbox-group>
      <template #footer>
        <el-button @click="participantDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleParticipantSubmit" :loading="submitLoading">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="prizeDialogVisible" title="管理奖品" width="600px">
      <el-checkbox-group v-model="selectedPrizeIds">
        <el-checkbox
          v-for="prize in allPrizes"
          :key="prize.id"
          :label="prize.id"
          style="display: block; margin: 8px 0"
        >
          {{ prize.name }}
          <span class="text-gray-500 text-sm ml-2">(总数量: {{ prize.count }})</span>
        </el-checkbox>
      </el-checkbox-group>
      <template #footer>
        <el-button @click="prizeDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handlePrizeSubmit" :loading="submitLoading">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Edit, Plus } from '@element-plus/icons-vue'
import axios from 'axios'

const API_BASE = 'http://localhost:3000/api'

const route = useRoute()
const router = useRouter()
const sessionId = Number(route.params.id)

const session = ref<any>({
  name: '',
  description: '',
  status: 0,
  created_at: '',
  updated_at: ''
})
const sessionParticipants = ref<any[]>([])
const sessionPrizes = ref<any[]>([])
const allParticipants = ref<any[]>([])
const allPrizes = ref<any[]>([])
const results = ref<any[]>([])
const loading = ref(false)
const submitLoading = ref(false)
const activeTab = ref('participants')
const editDialogVisible = ref(false)
const participantDialogVisible = ref(false)
const prizeDialogVisible = ref(false)
const selectedParticipantIds = ref<number[]>([])
const selectedPrizeIds = ref<number[]>([])

const editForm = reactive({
  name: '',
  description: ''
})

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleString('zh-CN')
}

const getStatusType = (status: number) => {
  const types: Record<number, any> = {
    0: 'info',
    1: 'warning',
    2: 'success'
  }
  return types[status] || 'info'
}

const getStatusText = (status: number) => {
  const texts: Record<number, string> = {
    0: '未开始',
    1: '进行中',
    2: '已结束'
  }
  return texts[status] || '未知'
}

const goBack = () => {
  router.push('/sessions')
}

const loadSession = async () => {
  loading.value = true
  try {
    const res = await axios.get(`${API_BASE}/sessions/${sessionId}`)
    session.value = res.data
    sessionParticipants.value = res.data.participants || []
    sessionPrizes.value = res.data.prizes || []
    results.value = res.data.results || []
  } catch (error) {
    ElMessage.error('加载场次详情失败')
    console.error(error)
  } finally {
    loading.value = false
  }
}

const loadAllParticipants = async () => {
  try {
    const res = await axios.get(`${API_BASE}/participants`)
    allParticipants.value = res.data
  } catch (error) {
    console.error('加载参与者失败:', error)
  }
}

const loadAllPrizes = async () => {
  try {
    const res = await axios.get(`${API_BASE}/prizes`)
    allPrizes.value = res.data
  } catch (error) {
    console.error('加载奖品失败:', error)
  }
}

const handleEdit = () => {
  editForm.name = session.value.name
  editForm.description = session.value.description
  editDialogVisible.value = true
}

const handleEditSubmit = async () => {
  if (!editForm.name) {
    ElMessage.warning('请输入场次名称')
    return
  }
  submitLoading.value = true
  try {
    await axios.put(`${API_BASE}/sessions/${sessionId}`, editForm)
    ElMessage.success('更新成功')
    editDialogVisible.value = false
    loadSession()
  } catch (error: any) {
    ElMessage.error(error.response?.data?.error || '更新失败')
  } finally {
    submitLoading.value = false
  }
}

const handleStatusChange = async () => {
  let newStatus = session.value.status
  if (session.value.status === 0) {
    newStatus = 1
  } else if (session.value.status === 1) {
    newStatus = 2
  }
  try {
    await axios.put(`${API_BASE}/sessions/${sessionId}`, {
      ...session.value,
      status: newStatus
    })
    ElMessage.success('状态更新成功')
    loadSession()
  } catch (error: any) {
    ElMessage.error(error.response?.data?.error || '更新状态失败')
  }
}

const openParticipantDialog = () => {
  selectedParticipantIds.value = sessionParticipants.value.map((p: any) => p.id)
  loadAllParticipants()
  participantDialogVisible.value = true
}

const handleParticipantSubmit = async () => {
  submitLoading.value = true
  try {
    await axios.post(`${API_BASE}/sessions/${sessionId}/participants`, {
      participant_ids: selectedParticipantIds.value
    })
    ElMessage.success('保存成功')
    participantDialogVisible.value = false
    loadSession()
  } catch (error: any) {
    ElMessage.error(error.response?.data?.error || '保存失败')
  } finally {
    submitLoading.value = false
  }
}

const removeParticipant = async (participantId: number) => {
  try {
    await ElMessageBox.confirm('确定要移除该参与者吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    const newIds = selectedParticipantIds.value.filter(id => id !== participantId)
    await axios.post(`${API_BASE}/sessions/${sessionId}/participants`, {
      participant_ids: newIds
    })
    ElMessage.success('移除成功')
    loadSession()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('移除失败')
    }
  }
}

const openPrizeDialog = () => {
  selectedPrizeIds.value = sessionPrizes.value.map((p: any) => p.id)
  loadAllPrizes()
  prizeDialogVisible.value = true
}

const handlePrizeSubmit = async () => {
  submitLoading.value = true
  try {
    await axios.post(`${API_BASE}/sessions/${sessionId}/prizes`, {
      prize_ids: selectedPrizeIds.value
    })
    ElMessage.success('保存成功')
    prizeDialogVisible.value = false
    loadSession()
  } catch (error: any) {
    ElMessage.error(error.response?.data?.error || '保存失败')
  } finally {
    submitLoading.value = false
  }
}

const removePrize = async (prizeId: number) => {
  try {
    await ElMessageBox.confirm('确定要移除该奖品吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    const newIds = selectedPrizeIds.value.filter(id => id !== prizeId)
    await axios.post(`${API_BASE}/sessions/${sessionId}/prizes`, {
      prize_ids: newIds
    })
    ElMessage.success('移除成功')
    loadSession()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('移除失败')
    }
  }
}

onMounted(() => {
  loadSession()
})
</script>

<style scoped>
.session-detail {
  padding: 20px;
}

.mb-4 {
  margin-bottom: 16px;
}

.mt-4 {
  margin-top: 16px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
}

.detail-tabs {
  margin-top: 20px;
}

.text-gray-500 {
  color: #909399;
}

.text-sm {
  font-size: 12px;
}

.ml-2 {
  margin-left: 8px;
}
</style>
