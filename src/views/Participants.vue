<template>
  <div class="participants">
    <el-card class="filter-card">
      <el-form :inline="true" :model="filterForm" class="filter-form">
        <el-form-item label="搜索">
          <el-input v-model="filterForm.search" placeholder="搜索姓名或邮箱" clearable @clear="loadParticipants" />
        </el-form-item>
        <el-form-item label="黑名单">
          <el-select v-model="filterForm.is_blacklisted" placeholder="全部" clearable @change="loadParticipants">
            <el-option label="正常" :value="0" />
            <el-option label="黑名单" :value="1" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadParticipants">
            <el-icon><Search /></el-icon>
            搜索
          </el-button>
          <el-button @click="resetFilter">
            <el-icon><RefreshLeft /></el-icon>
            重置
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card class="table-card">
      <template #header>
        <div class="card-header">
          <span>参与者列表</span>
          <div class="header-buttons">
            <el-upload
              ref="uploadRef"
              :show-file-list="false"
              :on-success="handleImportSuccess"
              :before-upload="beforeUpload"
              action="http://localhost:3000/api/participants/import"
              accept=".xlsx,.xls"
            >
              <el-button type="success">
                <el-icon><Upload /></el-icon>
                批量导入
              </el-button>
            </el-upload>
            <el-button type="primary" @click="openAddDialog">
              <el-icon><Plus /></el-icon>
              添加参与者
            </el-button>
          </div>
        </div>
      </template>

      <el-table :data="participants" style="width: 100%" v-loading="loading">
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
        <el-table-column prop="created_at" label="创建时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.created_at) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="280" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" size="small" @click="openEditDialog(row)">
              <el-icon><Edit /></el-icon>
              编辑
            </el-button>
            <el-button
              :type="row.is_blacklisted ? 'success' : 'warning'"
              size="small"
              @click="toggleBlacklist(row)"
            >
              <el-icon><Warning /></el-icon>
              {{ row.is_blacklisted ? '移出黑名单' : '加入黑名单' }}
            </el-button>
            <el-button type="danger" size="small" @click="handleDelete(row)">
              <el-icon><Delete /></el-icon>
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-empty v-if="participants.length === 0 && !loading" description="暂无参与者" />
    </el-card>

    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑参与者' : '添加参与者'"
      width="500px"
      :close-on-click-modal="false"
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="80px">
        <el-form-item label="姓名" prop="name">
          <el-input v-model="form.name" placeholder="请输入姓名" />
        </el-form-item>
        <el-form-item label="邮箱" prop="email">
          <el-input v-model="form.email" placeholder="请输入邮箱" />
        </el-form-item>
        <el-form-item label="手机号" prop="phone">
          <el-input v-model="form.phone" placeholder="请输入手机号" />
        </el-form-item>
        <el-form-item label="权重" prop="weight">
          <el-input-number v-model="form.weight" :min="1" :max="100" />
        </el-form-item>
        <el-form-item label="黑名单" prop="is_blacklisted">
          <el-switch v-model="form.is_blacklisted" :active-value="1" :inactive-value="0" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="submitLoading">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="importDialogVisible"
      title="导入说明"
      width="500px"
    >
      <div class="import-guide">
        <h4>请按以下格式准备Excel文件：</h4>
        <el-table :data="importSample" style="width: 100%" border>
          <el-table-column prop="name" label="name" />
          <el-table-column prop="email" label="email" />
          <el-table-column prop="phone" label="phone" />
          <el-table-column prop="weight" label="weight" />
        </el-table>
        <p class="mt-4">注意：name为必填项，email重复时会跳过该条记录</p>
      </div>
      <template #footer>
        <el-button @click="importDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { Search, RefreshLeft, Upload, Plus, Edit, Warning, Delete } from '@element-plus/icons-vue'
import axios from 'axios'

const API_BASE = 'http://localhost:3000/api'

const participants = ref<any[]>([])
const loading = ref(false)
const submitLoading = ref(false)
const dialogVisible = ref(false)
const importDialogVisible = ref(false)
const isEdit = ref(false)
const formRef = ref<FormInstance>()

const filterForm = reactive({
  search: '',
  is_blacklisted: undefined as number | undefined
})

const form = reactive({
  id: null as number | null,
  name: '',
  email: '',
  phone: '',
  weight: 1,
  is_blacklisted: 0
})

const rules: FormRules = {
  name: [{ required: true, message: '请输入姓名', trigger: 'blur' }]
}

const importSample = [
  { name: '张三', email: 'zhangsan@example.com', phone: '13800138001', weight: 1 },
  { name: '李四', email: 'lisi@example.com', phone: '13900139001', weight: 2 }
]

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleString('zh-CN')
}

const loadParticipants = async () => {
  loading.value = true
  try {
    const params: any = {}
    if (filterForm.search) params.search = filterForm.search
    if (filterForm.is_blacklisted !== undefined) params.is_blacklisted = filterForm.is_blacklisted

    const res = await axios.get(`${API_BASE}/participants`, { params })
    participants.value = res.data
  } catch (error) {
    ElMessage.error('加载参与者列表失败')
    console.error(error)
  } finally {
    loading.value = false
  }
}

const resetFilter = () => {
  filterForm.search = ''
  filterForm.is_blacklisted = undefined
  loadParticipants()
}

const openAddDialog = () => {
  isEdit.value = false
  Object.assign(form, {
    id: null,
    name: '',
    email: '',
    phone: '',
    weight: 1,
    is_blacklisted: 0
  })
  dialogVisible.value = true
}

const openEditDialog = (row: any) => {
  isEdit.value = true
  Object.assign(form, row)
  dialogVisible.value = true
}

const handleSubmit = async () => {
  if (!formRef.value) return
  
  await formRef.value.validate(async (valid) => {
    if (valid) {
      submitLoading.value = true
      try {
        if (isEdit.value) {
          await axios.put(`${API_BASE}/participants/${form.id}`, form)
          ElMessage.success('更新成功')
        } else {
          await axios.post(`${API_BASE}/participants`, form)
          ElMessage.success('添加成功')
        }
        dialogVisible.value = false
        loadParticipants()
      } catch (error: any) {
        ElMessage.error(error.response?.data?.error || '操作失败')
      } finally {
        submitLoading.value = false
      }
    }
  })
}

const handleDelete = async (row: any) => {
  try {
    await ElMessageBox.confirm('确定要删除该参与者吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    await axios.delete(`${API_BASE}/participants/${row.id}`)
    ElMessage.success('删除成功')
    loadParticipants()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

const toggleBlacklist = async (row: any) => {
  try {
    const newStatus = row.is_blacklisted ? 0 : 1
    const action = newStatus ? '加入' : '移出'
    await ElMessageBox.confirm(`确定要${action}黑名单吗？`, '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    await axios.put(`${API_BASE}/participants/${row.id}/blacklist`, { is_blacklisted: newStatus })
    ElMessage.success(`已${action}黑名单`)
    loadParticipants()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('操作失败')
    }
  }
}

const beforeUpload = (file: File) => {
  const isExcel = file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
                  file.type === 'application/vnd.ms-excel' ||
                  file.name.endsWith('.xlsx') || 
                  file.name.endsWith('.xls')
  if (!isExcel) {
    ElMessage.error('只能上传 Excel 文件！')
    return false
  }
  return true
}

const handleImportSuccess = (response: any) => {
  if (response.success) {
    ElMessage.success(`导入成功：成功 ${response.successCount} 条，跳过 ${response.skipCount} 条`)
    loadParticipants()
  } else {
    ElMessage.error('导入失败')
  }
}

onMounted(() => {
  loadParticipants()
})
</script>

<style scoped>
.participants {
  padding: 0;
}

.filter-card {
  margin-bottom: 20px;
}

.filter-form {
  margin-bottom: 0;
}

.table-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
}

.header-buttons {
  display: flex;
  gap: 12px;
}

.import-guide h4 {
  margin-bottom: 16px;
  color: #303133;
}

.import-guide .mt-4 {
  margin-top: 16px;
  color: #909399;
  font-size: 14px;
}
</style>
