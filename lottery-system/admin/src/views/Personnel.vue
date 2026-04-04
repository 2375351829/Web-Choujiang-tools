<template>
  <div class="personnel-container">
    <el-card class="filter-card">
      <el-form :inline="true" :model="filters" class="filter-form">
        <el-form-item label="搜索">
          <el-input v-model="filters.search" placeholder="姓名/邮箱/电话" clearable @keyup.enter="loadParticipants" style="width: 200px" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="filters.status" placeholder="全部状态" clearable style="width: 120px">
            <el-option label="正常" value="正常" />
            <el-option label="停用" value="停用" />
            <el-option label="待审核" value="待审核" />
          </el-select>
        </el-form-item>
        <el-form-item label="黑名单">
          <el-select v-model="filters.is_blacklisted" placeholder="全部" clearable style="width: 100px">
            <el-option label="是" :value="1" />
            <el-option label="否" :value="0" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadParticipants">查询</el-button>
          <el-button @click="resetFilters">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card class="table-card">
      <template #header>
        <div class="card-header">
          <span>人员列表 (共 {{ total }} 人)</span>
          <div class="header-actions">
            <el-button @click="handleDownloadTemplate">
              <el-icon><Download /></el-icon> 下载模板
            </el-button>
            <el-button type="success" @click="showImportDialog">
              <el-icon><Upload /></el-icon> 导入
            </el-button>
            <el-button type="warning" @click="handleExport">
              <el-icon><Download /></el-icon> 导出
            </el-button>
            <el-button type="primary" @click="showAddDialog">
              <el-icon><Plus /></el-icon> 添加人员
            </el-button>
          </div>
        </div>
      </template>

      <el-table 
        :data="participants" 
        stripe 
        border 
        @selection-change="handleSelectionChange"
        v-loading="loading"
      >
        <el-table-column type="selection" width="50" />
        <el-table-column prop="rowNum" label="序号" width="70" />
        <el-table-column prop="name" label="姓名" width="120">
          <template #default="{ row }">
            <el-link type="primary" @click="showDetailDialog(row)">{{ row.name }}</el-link>
          </template>
        </el-table-column>
        <el-table-column prop="email" label="邮箱" min-width="180" />
        <el-table-column prop="phone" label="电话" width="130" />
        <el-table-column prop="status" label="状态" width="90">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)" size="small">{{ row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="is_blacklisted" label="黑名单" width="80">
          <template #default="{ row }">
            <el-tag v-if="row.is_blacklisted" type="danger" size="small">是</el-tag>
            <el-tag v-else type="success" size="small">否</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="weight" label="权重" width="70" />
        <el-table-column 
          v-for="field in fieldConfigs" 
          :key="field.field_key"
          :prop="`extended_data.${field.field_key}`"
          :label="field.field_name"
          :min-width="getFieldWidth(field)"
        >
          <template #default="{ row }">
            <template v-if="field.field_type === 'json'">
              <el-popover placement="top" :width="300" trigger="hover" v-if="row.extended_data?.[field.field_key]">
                <pre style="margin: 0; font-size: 12px;">{{ JSON.stringify(row.extended_data?.[field.field_key], null, 2) }}</pre>
                <template #reference>
                  <el-link type="primary">查看</el-link>
                </template>
              </el-popover>
              <span v-else>-</span>
            </template>
            <template v-else>
              {{ row.extended_data?.[field.field_key] || '-' }}
            </template>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="showDetailDialog(row)">详情</el-button>
            <el-button size="small" type="primary" @click="showEditDialog(row)">编辑</el-button>
            <el-popconfirm title="确定删除该人员?" @confirm="handleDelete(row.id)">
              <template #reference>
                <el-button size="small" type="danger">删除</el-button>
              </template>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>

      <div class="batch-actions" v-if="selectedRows.length > 0">
        <span class="selected-count">已选择 {{ selectedRows.length }} 项</span>
        <el-button size="small" @click="handleBatchStatus('正常')">设为正常</el-button>
        <el-button size="small" @click="handleBatchStatus('停用')">设为停用</el-button>
        <el-button size="small" @click="handleBatchStatus('待审核')">设为待审核</el-button>
        <el-popconfirm title="确定删除选中的人员?" @confirm="handleBatchDelete">
          <template #reference>
            <el-button size="small" type="danger">批量删除</el-button>
          </template>
        </el-popconfirm>
      </div>
    </el-card>

    <el-dialog v-model="formDialogVisible" :title="formDialogTitle" width="650px" destroy-on-close>
      <el-form :model="form" :rules="formRules" ref="formRef" label-width="100px">
        <el-divider content-position="left">核心信息</el-divider>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="姓名" prop="name">
              <el-input v-model="form.name" maxlength="50" show-word-limit placeholder="请输入姓名" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="邮箱" prop="email">
              <el-input v-model="form.email" placeholder="请输入邮箱" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="电话" prop="phone">
              <el-input v-model="form.phone" placeholder="请输入电话（含国际区号）" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="状态" prop="status">
              <el-select v-model="form.status" style="width: 100%">
                <el-option label="正常" value="正常" />
                <el-option label="停用" value="停用" />
                <el-option label="待审核" value="待审核" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="黑名单">
              <el-switch v-model="form.is_blacklisted" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="权重" prop="weight">
              <el-input-number v-model="form.weight" :min="1" :max="100" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-divider content-position="left" v-if="fieldConfigs.length > 0">扩展信息</el-divider>
        <el-row :gutter="20" v-for="field in fieldConfigs" :key="field.field_key">
          <el-col :span="24">
            <el-form-item 
              :label="field.field_name" 
              :prop="`extended_data.${field.field_key}`"
              :rules="field.required ? [{ required: true, message: `${field.field_name}不能为空` }] : []"
            >
              <el-input 
                v-if="field.field_type === 'text'" 
                v-model="form.extended_data[field.field_key]" 
                :placeholder="field.placeholder"
              />
              <el-input 
                v-else-if="field.field_type === 'textarea'" 
                v-model="form.extended_data[field.field_key]" 
                type="textarea"
                :rows="3"
                :placeholder="field.placeholder"
              />
              <el-input-number 
                v-else-if="field.field_type === 'number'" 
                v-model="form.extended_data[field.field_key]"
                style="width: 100%"
              />
              <el-date-picker 
                v-else-if="field.field_type === 'date'" 
                v-model="form.extended_data[field.field_key]"
                type="date"
                style="width: 100%"
              />
              <el-select 
                v-else-if="field.field_type === 'select'" 
                v-model="form.extended_data[field.field_key]"
                style="width: 100%"
              >
                <el-option 
                  v-for="opt in (field.options?.options || [])" 
                  :key="opt" 
                  :label="opt" 
                  :value="opt" 
                />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <el-button @click="formDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="submitting">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="detailDialogVisible" title="人员详情" width="700px" destroy-on-close>
      <el-descriptions :column="2" border>
        <el-descriptions-item label="ID">{{ detailData.id }}</el-descriptions-item>
        <el-descriptions-item label="姓名">{{ detailData.name }}</el-descriptions-item>
        <el-descriptions-item label="邮箱">{{ detailData.email || '-' }}</el-descriptions-item>
        <el-descriptions-item label="电话">{{ detailData.phone || '-' }}</el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="getStatusType(detailData.status)">{{ detailData.status }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="黑名单">
          <el-tag :type="detailData.is_blacklisted ? 'danger' : 'success'">
            {{ detailData.is_blacklisted ? '是' : '否' }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="权重">{{ detailData.weight }}</el-descriptions-item>
        <el-descriptions-item label="创建时间">{{ detailData.created_at }}</el-descriptions-item>
      </el-descriptions>

      <el-divider content-position="left" v-if="Object.keys(detailData.extended_data || {}).length > 0">扩展信息</el-divider>
      <el-descriptions :column="2" border v-if="Object.keys(detailData.extended_data || {}).length > 0">
        <el-descriptions-item 
          v-for="field in fieldConfigs" 
          :key="field.field_key"
          :label="field.field_name"
        >
          <template v-if="field.field_type === 'json'">
            <pre>{{ JSON.stringify(detailData.extended_data?.[field.field_key], null, 2) }}</pre>
          </template>
          <template v-else>
            {{ detailData.extended_data?.[field.field_key] || '-' }}
          </template>
        </el-descriptions-item>
      </el-descriptions>

      <template #footer>
        <el-button @click="detailDialogVisible = false">关闭</el-button>
        <el-button type="primary" @click="showEditDialog(detailData); detailDialogVisible = false">编辑</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="importDialogVisible" title="批量导入人员" width="500px">
      <el-alert type="info" :closable="false" style="margin-bottom: 16px;">
        <template #title>
          <div>Excel/CSV 格式要求：</div>
          <div>必填列：name（姓名）</div>
          <div>可选列：email（邮箱）、phone（电话）、status（状态）、weight（权重）</div>
          <div v-if="fieldConfigs.length > 0">
            扩展字段：{{ fieldConfigs.map(f => f.field_name).join('、') }}
          </div>
        </template>
      </el-alert>
      <el-upload
        drag
        :show-file-list="false"
        accept=".xlsx,.xls,.csv"
        :before-upload="handleFileSelect"
      >
        <el-icon style="font-size: 48px; color: #909399;"><UploadFilled /></el-icon>
        <div>点击或拖拽文件到此处上传</div>
        <div style="color: #909399; font-size: 12px;">支持 .xlsx, .xls, .csv 格式</div>
      </el-upload>
      <div v-if="importFile" style="margin-top: 16px;">
        已选择: {{ importFile.name }}
      </div>
      <template #footer>
        <el-button @click="importDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="executeImport" :disabled="!importFile" :loading="importing">开始导入</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, inject } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus, Upload, Download, UploadFilled } from '@element-plus/icons-vue'
import { 
  getParticipants, 
  getParticipant, 
  createParticipant, 
  updateParticipant, 
  deleteParticipant,
  importParticipants,
  exportParticipants,
  batchDeleteParticipants,
  batchUpdateStatus,
  downloadTemplate
} from '../api/participants'
import { getFieldConfigs, type FieldConfig } from '../api/fieldConfigs'
import * as XLSX from 'xlsx'

const sceneId = inject<any>('sceneId')
const isInitialized = inject<any>('isInitialized')

const loading = ref(false)
const submitting = ref(false)
const importing = ref(false)
const participants = ref<any[]>([])
const fieldConfigs = ref<FieldConfig[]>([])
const total = ref(0)
const selectedRows = ref<any[]>([])

const filters = ref({
  search: '',
  status: '',
  is_blacklisted: undefined as number | undefined
})

const formDialogVisible = ref(false)
const detailDialogVisible = ref(false)
const importDialogVisible = ref(false)
const importFile = ref<File | null>(null)
const editingId = ref<number | null>(null)
const formRef = ref<any>(null)

const formDialogTitle = computed(() => editingId.value ? '编辑人员' : '添加人员')

const form = ref({
  name: '',
  email: '',
  phone: '',
  status: '待审核',
  is_blacklisted: false,
  weight: 50,
  extended_data: {} as Record<string, any>
})

const formRules = {
  name: [
    { required: true, message: '姓名不能为空', trigger: 'blur' },
    { max: 50, message: '姓名最大长度为50字符', trigger: 'blur' }
  ],
  email: [
    { type: 'email', message: '邮箱格式不正确', trigger: 'blur' }
  ],
  weight: [
    { type: 'number', min: 1, max: 100, message: '权重范围为1-100', trigger: 'blur' }
  ]
}

const detailData = ref<any>({})

const getStatusType = (status: string) => {
  const map: Record<string, string> = { '正常': 'success', '停用': 'danger', '待审核': 'warning' }
  return map[status] || 'info'
}

const getFieldWidth = (field: FieldConfig) => {
  const widthMap: Record<string, number> = {
    text: 120,
    textarea: 150,
    number: 100,
    date: 120,
    select: 120,
    json: 80
  }
  return widthMap[field.field_type] || 120
}

const loadParticipants = async () => {
  if (!sceneId.value) return
  
  loading.value = true
  try {
    const params: any = { scene_id: sceneId.value, with_extended: 'true' }
    if (filters.value.search) params.search = filters.value.search
    if (filters.value.status) params.status = filters.value.status
    if (filters.value.is_blacklisted !== undefined) params.is_blacklisted = filters.value.is_blacklisted
    
    participants.value = await getParticipants(params)
    total.value = participants.value.length
  } catch (error) {
    console.error('加载人员列表失败:', error)
  } finally {
    loading.value = false
  }
}

const loadFieldConfigs = async () => {
  if (!sceneId.value) return
  
  try {
    fieldConfigs.value = await getFieldConfigs(sceneId.value)
  } catch (error) {
    console.error('加载字段配置失败:', error)
  }
}

const resetFilters = () => {
  filters.value = { search: '', status: '', is_blacklisted: undefined }
  loadParticipants()
}

const handleSelectionChange = (selection: any[]) => {
  selectedRows.value = selection
}

const resetForm = () => {
  form.value = {
    name: '',
    email: '',
    phone: '',
    status: '待审核',
    is_blacklisted: false,
    weight: 50,
    extended_data: {}
  }
  editingId.value = null
}

const showAddDialog = () => {
  resetForm()
  fieldConfigs.value.forEach(field => {
    if (field.default_value) {
      form.value.extended_data[field.field_key] = field.default_value
    }
  })
  formDialogVisible.value = true
}

const showEditDialog = async (row: any) => {
  resetForm()
  editingId.value = row.id
  
  try {
    const detail = await getParticipant(row.id)
    form.value = {
      name: detail.name,
      email: detail.email || '',
      phone: detail.phone || '',
      status: detail.status,
      is_blacklisted: !!detail.is_blacklisted,
      weight: detail.weight,
      extended_data: detail.extended_data || {}
    }
    formDialogVisible.value = true
  } catch (error) {
    ElMessage.error('获取人员详情失败')
  }
}

const showDetailDialog = async (row: any) => {
  try {
    detailData.value = await getParticipant(row.id)
    detailDialogVisible.value = true
  } catch (error) {
    ElMessage.error('获取人员详情失败')
  }
}

const handleSubmit = async () => {
  if (!formRef.value) return
  
  await formRef.value.validate(async (valid: boolean) => {
    if (!valid) return
    
    submitting.value = true
    try {
      const data = {
        ...form.value,
        scene_id: sceneId.value
      }
      
      if (editingId.value) {
        await updateParticipant(editingId.value, data)
        ElMessage.success('更新成功')
      } else {
        await createParticipant(data)
        ElMessage.success('添加成功')
      }
      
      formDialogVisible.value = false
      loadParticipants()
    } catch (error: any) {
      ElMessage.error(error.response?.data?.error || '操作失败')
    } finally {
      submitting.value = false
    }
  })
}

const handleDelete = async (id: number) => {
  try {
    await deleteParticipant(id)
    ElMessage.success('删除成功')
    loadParticipants()
  } catch (error) {
    ElMessage.error('删除失败')
  }
}

const handleBatchDelete = async () => {
  const ids = selectedRows.value.map(r => r.id)
  try {
    await batchDeleteParticipants(ids)
    ElMessage.success(`成功删除 ${ids.length} 条记录`)
    loadParticipants()
  } catch (error) {
    ElMessage.error('批量删除失败')
  }
}

const handleBatchStatus = async (status: string) => {
  const ids = selectedRows.value.map(r => r.id)
  try {
    await batchUpdateStatus(ids, status)
    ElMessage.success(`成功更新 ${ids.length} 条记录状态`)
    loadParticipants()
  } catch (error) {
    ElMessage.error('批量更新失败')
  }
}

const showImportDialog = () => {
  importFile.value = null
  importDialogVisible.value = true
}

const handleFileSelect = (file: File) => {
  importFile.value = file
  return false
}

const executeImport = async () => {
  if (!importFile.value || !sceneId.value) return
  
  importing.value = true
  try {
    const formData = new FormData()
    formData.append('file', importFile.value)
    formData.append('scene_id', sceneId.value.toString())
    
    const result = await importParticipants(formData)
    ElMessage.success(result.message || `导入成功 ${result.successCount} 条`)
    importDialogVisible.value = false
    loadParticipants()
  } catch (error: any) {
    ElMessage.error(error.response?.data?.error || '导入失败')
  } finally {
    importing.value = false
  }
}

const handleDownloadTemplate = () => {
  if (!sceneId.value) {
    ElMessage.warning('请先选择场景')
    return
  }
  downloadTemplate(sceneId.value)
  ElMessage.success('模板下载中...')
}

const handleExport = async () => {
  try {
    const ids = selectedRows.value.length > 0 ? selectedRows.value.map(r => r.id) : undefined
    const data = await exportParticipants({ scene_id: sceneId.value, ids })
    
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '人员数据')
    XLSX.writeFile(wb, `人员数据_${new Date().toISOString().slice(0, 10)}.xlsx`)
    
    ElMessage.success('导出成功')
  } catch (error) {
    ElMessage.error('导出失败')
  }
}

watch(sceneId, () => {
  if (sceneId.value && isInitialized.value) {
    loadFieldConfigs()
    loadParticipants()
  }
})

watch(isInitialized, () => {
  if (isInitialized.value && sceneId.value) {
    loadFieldConfigs()
    loadParticipants()
  }
})

onMounted(() => {
  if (isInitialized.value && sceneId.value) {
    loadFieldConfigs()
    loadParticipants()
  }
})
</script>

<style scoped>
.personnel-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.filter-card {
  margin-bottom: 0;
}

.filter-form {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.batch-actions {
  margin-top: 16px;
  padding: 12px;
  background-color: #f5f7fa;
  border-radius: 4px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.selected-count {
  color: #409EFF;
  font-weight: 500;
}

:deep(.el-divider__text) {
  font-weight: 600;
  color: #303133;
}
</style>
