<template>
  <div>
    <el-card>
      <template #header>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span>场次管理</span>
          <el-button type="primary" @click="showAddDialog">创建场次</el-button>
        </div>
      </template>

      <el-table :data="sessions" stripe border>
        <el-table-column prop="id" label="ID" width="60" />
        <el-table-column prop="name" label="场次名称" width="200" />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === '进行中' ? 'success' : 'info'">{{ row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="创建时间" width="160" />
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="viewDetail(row.id)">详情</el-button>
            <el-popconfirm title="确定删除?" @confirm="handleDelete(row.id)">
              <template #reference><el-button size="small" type="danger">删除</el-button></template>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="dialogVisible" title="创建场次" width="500px">
      <el-form :model="form" label-width="80px">
        <el-form-item label="名称" required>
          <el-input v-model="form.name" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit">确认</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, inject } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { getSessions, createSession, deleteSession } from '../api/sessions'

const router = useRouter()
const sessions = ref<any[]>([])
const dialogVisible = ref(false)
const form = ref({ name: '', description: '' })
const sceneId = inject<any>('sceneId')
const isInitialized = inject<any>('isInitialized')

const loadData = async () => {
  if (!sceneId.value) return
  sessions.value = await getSessions(sceneId.value)
}

const showAddDialog = () => {
  form.value = { name: '', description: '' }
  dialogVisible.value = true
}

const handleSubmit = async () => {
  if (!form.value.name.trim()) return ElMessage.warning('名称不能为空')
  await createSession({ ...form.value, scene_id: sceneId.value })
  ElMessage.success('创建成功')
  dialogVisible.value = false
  loadData()
}

const handleDelete = async (id: number) => {
  await deleteSession(id)
  ElMessage.success('删除成功')
  loadData()
}

const viewDetail = (id: number) => {
  router.push(`/sessions/${id}`)
}

watch(sceneId, () => {
  if (sceneId.value) loadData()
})

watch(isInitialized, () => {
  if (isInitialized.value && sceneId.value) loadData()
})

onMounted(() => {
  if (isInitialized.value && sceneId.value) loadData()
})
</script>
