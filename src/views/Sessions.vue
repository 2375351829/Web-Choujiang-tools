<template>
  <div class="sessions">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>场次管理</span>
          <el-button type="primary" @click="handleCreate">
            <el-icon><Plus /></el-icon>
            创建场次
          </el-button>
        </div>
      </template>

      <el-table :data="sessions" style="width: 100%">
        <el-table-column prop="name" label="场次名称" width="200" />
        <el-table-column prop="description" label="描述" />
        <el-table-column prop="status" label="状态" width="120">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)">
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="创建时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.created_at) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="320" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" size="small" @click="handleEdit(row)">编辑</el-button>
            <el-button type="success" size="small" @click="handleConfig(row)">配置</el-button>
            <el-button type="warning" size="small" @click="handleStatusChange(row)" :disabled="row.status === 2">
              {{ row.status === 0 ? '开始' : row.status === 1 ? '结束' : '' }}
            </el-button>
            <el-popconfirm title="确定要删除这个场次吗？" @confirm="handleDelete(row.id)">
              <template #reference>
                <el-button type="danger" size="small">删除</el-button>
              </template>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑场次' : '创建场次'"
      width="500px"
    >
      <el-form :model="form" label-width="80px">
        <el-form-item label="场次名称">
          <el-input v-model="form.name" placeholder="请输入场次名称" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input
            v-model="form.description"
            type="textarea"
            :rows="3"
            placeholder="请输入描述"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import axios from 'axios'

const API_BASE = 'http://localhost:3000/api'
const router = useRouter()

const sessions = ref<any[]>([])
const dialogVisible = ref(false)
const isEdit = ref(false)

const form = reactive({
  id: null as number | null,
  name: '',
  description: '',
  status: 0
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

const loadSessions = async () => {
  try {
    const res = await axios.get(`${API_BASE}/sessions`)
    sessions.value = res.data
  } catch (error) {
    console.error('加载场次失败:', error)
    ElMessage.error('加载场次失败')
  }
}

const handleCreate = () => {
  isEdit.value = false
  form.id = null
  form.name = ''
  form.description = ''
  form.status = 0
  dialogVisible.value = true
}

const handleEdit = (row: any) => {
  isEdit.value = true
  form.id = row.id
  form.name = row.name
  form.description = row.description
  form.status = row.status
  dialogVisible.value = true
}

const handleSubmit = async () => {
  if (!form.name) {
    ElMessage.warning('请输入场次名称')
    return
  }

  try {
    if (isEdit.value && form.id) {
      await axios.put(`${API_BASE}/sessions/${form.id}`, form)
      ElMessage.success('更新成功')
    } else {
      await axios.post(`${API_BASE}/sessions`, form)
      ElMessage.success('创建成功')
    }
    dialogVisible.value = false
    loadSessions()
  } catch (error: any) {
    ElMessage.error(error.response?.data?.error || '操作失败')
  }
}

const handleConfig = (row: any) => {
  router.push(`/sessions/${row.id}`)
}

const handleStatusChange = async (row: any) => {
  let newStatus = row.status
  if (row.status === 0) {
    newStatus = 1
  } else if (row.status === 1) {
    newStatus = 2
  }

  try {
    await axios.put(`${API_BASE}/sessions/${row.id}`, {
      ...row,
      status: newStatus
    })
    ElMessage.success('状态更新成功')
    loadSessions()
  } catch (error: any) {
    ElMessage.error(error.response?.data?.error || '更新状态失败')
  }
}

const handleDelete = async (id: number) => {
  try {
    await axios.delete(`${API_BASE}/sessions/${id}`)
    ElMessage.success('删除成功')
    loadSessions()
  } catch (error: any) {
    ElMessage.error(error.response?.data?.error || '删除失败')
  }
}

onMounted(() => {
  loadSessions()
})
</script>

<style scoped>
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
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
