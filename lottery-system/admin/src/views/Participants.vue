<template>
  <div>
    <el-card>
      <template #header>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div style="display: flex; align-items: center; gap: 16px;">
            <span>人员管理</span>
            <el-select v-model="selectedSessionId" placeholder="选择场次" style="width: 200px" @change="loadSessionParticipants">
              <el-option v-for="s in sessions" :key="s.id" :label="s.name" :value="s.id">
                <span>{{ s.name }}</span>
                <el-tag size="small" :type="getStatusType(s.status)" style="margin-left: 8px">{{ s.status }}</el-tag>
              </el-option>
            </el-select>
          </div>
          <div style="display: flex; gap: 8px;">
            <el-dropdown @command="handleDownloadTemplate">
              <el-button>
                下载模板 <el-icon class="el-icon--right"><ArrowDown /></el-icon>
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="xlsx">Excel 模板 (.xlsx)</el-dropdown-item>
                  <el-dropdown-item command="csv">CSV 模板 (.csv)</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
            <el-upload
              :show-file-list="false"
              accept=".xlsx,.xls,.csv"
              :before-upload="handleImport"
            >
              <el-button type="success" :disabled="!selectedSessionId">批量导入</el-button>
            </el-upload>
            <el-button type="primary" @click="showAddDialog" :disabled="!selectedSessionId">添加人员</el-button>
          </div>
        </div>
      </template>

      <el-alert v-if="!selectedSessionId" type="info" :closable="false" style="margin-bottom: 16px;">
        请先选择场次，然后管理该场次下的人员
      </el-alert>

      <template v-if="selectedSessionId">
        <el-form :inline="true" style="margin-bottom: 16px;">
          <el-form-item label="状态">
            <el-select v-model="filters.status" placeholder="全部" clearable @change="filterParticipants">
              <el-option label="未中奖" value="未中奖" />
              <el-option label="已中奖" value="已中奖" />
            </el-select>
          </el-form-item>
          <el-form-item label="搜索">
            <el-input v-model="filters.search" placeholder="姓名/邮箱/电话" clearable @keyup.enter="filterParticipants" />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="filterParticipants">查询</el-button>
          </el-form-item>
        </el-form>

        <el-table :data="filteredParticipants" stripe border>
          <el-table-column prop="rowNum" label="序号" width="60" />
          <el-table-column prop="name" label="姓名" width="120" />
          <el-table-column prop="email" label="邮箱" />
          <el-table-column prop="phone" label="电话" />
          <el-table-column prop="status" label="状态" width="90">
            <template #default="{ row }">
              <el-tag :type="row.status === '已中奖' ? 'success' : 'info'" size="small">{{ row.status }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="is_blacklisted" label="黑名单" width="90">
            <template #default="{ row }">
              <el-switch :model-value="!!row.is_blacklisted" @change="(val: boolean) => toggleBlacklist(row.id, val)" />
            </template>
          </el-table-column>
          <el-table-column prop="weight" label="权重" width="70" />
          <el-table-column label="操作" width="150" fixed="right">
            <template #default="{ row }">
              <el-button size="small" @click="showEditDialog(row)">编辑</el-button>
              <el-popconfirm title="确定从该场次移除?" @confirm="handleRemove(row.id)">
                <template #reference><el-button size="small" type="danger">移除</el-button></template>
              </el-popconfirm>
            </template>
          </el-table-column>
        </el-table>
      </template>

      <el-empty v-else description="请选择场次" />
    </el-card>

    <el-card style="margin-top: 20px" v-if="selectedSessionId">
      <template #header>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span>人员库</span>
          <el-button type="primary" size="small" @click="showParticipantLibDialog">从人员库添加</el-button>
        </div>
      </template>
      <el-table :data="availableParticipants" stripe border size="small" max-height="300">
        <el-table-column prop="name" label="姓名" width="120" />
        <el-table-column prop="email" label="邮箱" />
        <el-table-column prop="phone" label="电话" width="130" />
        <el-table-column label="操作" width="120">
          <template #default="{ row }">
            <el-button size="small" type="primary" @click="addToSession(row)">添加到场次</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="dialogVisible" :title="editingId ? '编辑人员' : '添加人员到场次'" width="500px">
      <el-form :model="form" label-width="80px">
        <el-form-item label="姓名" required v-if="!editingId">
          <el-input v-model="form.name" />
        </el-form-item>
        <el-form-item label="邮箱" v-if="!editingId">
          <el-input v-model="form.email" />
        </el-form-item>
        <el-form-item label="电话" v-if="!editingId">
          <el-input v-model="form.phone" />
        </el-form-item>
        <el-form-item label="权重">
          <el-input-number v-model="form.weight" :min="0" :max="100" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit">确认</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="participantLibDialogVisible" title="从人员库添加" width="700px">
      <el-table :data="participantLib" stripe border size="small" @selection-change="handleSelectionChange" max-height="400">
        <el-table-column type="selection" width="50" />
        <el-table-column prop="name" label="姓名" width="120" />
        <el-table-column prop="email" label="邮箱" />
        <el-table-column prop="phone" label="电话" width="130" />
        <el-table-column prop="status" label="状态" width="80">
          <template #default="{ row }">
            <el-tag :type="row.status === '已中奖' ? 'success' : 'info'" size="small">{{ row.status }}</el-tag>
          </template>
        </el-table-column>
      </el-table>
      <template #footer>
        <el-button @click="participantLibDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="batchAddToSession" :disabled="selectedParticipants.length === 0">
          添加选中 ({{ selectedParticipants.length }}人)
        </el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="importDialogVisible" title="批量导入人员" width="500px">
      <el-alert type="info" :closable="false" style="margin-bottom: 16px;">
        <template #title>
          <div>Excel/CSV 格式要求：</div>
          <div>第一行为表头，包含：name（姓名）、email（邮箱）、phone（电话）、weight（权重）</div>
          <div>其中 name 必填，其他可选</div>
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
        <el-button type="primary" @click="executeImport" :disabled="!importFile">开始导入</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, inject } from 'vue'
import { ElMessage } from 'element-plus'
import { ArrowDown, UploadFilled } from '@element-plus/icons-vue'
import { getSessions, getSession, addParticipants } from '../api/sessions'
import { getParticipants, createParticipant, updateParticipant, updateBlacklist } from '../api/participants'
import { downloadParticipantTemplate } from '../utils/template'
import * as XLSX from 'xlsx'

const sessions = ref<any[]>([])
const selectedSessionId = ref<number | null>(null)
const sessionParticipants = ref<any[]>([])
const availableParticipants = ref<any[]>([])
const participantLib = ref<any[]>([])
const selectedParticipants = ref<any[]>([])
const filters = ref({ status: '', search: '' })
const sceneId = inject<any>('sceneId')
const isInitialized = inject<any>('isInitialized')

const dialogVisible = ref(false)
const participantLibDialogVisible = ref(false)
const importDialogVisible = ref(false)
const importFile = ref<File | null>(null)
const editingId = ref<number | null>(null)
const form = ref({ name: '', email: '', phone: '', weight: 1 })

const getStatusType = (status: string) => {
  const map: Record<string, string> = { '未开始': 'info', '进行中': 'success', '已结束': 'danger' }
  return map[status] || 'info'
}

const filteredParticipants = computed(() => {
  let result = sessionParticipants.value
  if (filters.value.status) {
    result = result.filter(p => p.status === filters.value.status)
  }
  if (filters.value.search) {
    const search = filters.value.search.toLowerCase()
    result = result.filter(p => 
      p.name?.toLowerCase().includes(search) ||
      p.email?.toLowerCase().includes(search) ||
      p.phone?.includes(search)
    )
  }
  return result
})

const loadSessions = async () => {
  if (!sceneId.value) return
  sessions.value = await getSessions(sceneId.value)
}

const loadSessionParticipants = async () => {
  if (!selectedSessionId.value) {
    sessionParticipants.value = []
    availableParticipants.value = []
    return
  }
  
  const detail = await getSession(selectedSessionId.value)
  sessionParticipants.value = detail.participants || []
  
  const allParticipants = await getParticipants({ scene_id: sceneId.value })
  const sessionParticipantIds = sessionParticipants.value.map((p: any) => p.id)
  availableParticipants.value = allParticipants.filter((p: any) => !sessionParticipantIds.includes(p.id))
}

const loadParticipantLib = async () => {
  participantLib.value = await getParticipants({ scene_id: sceneId.value })
}

const filterParticipants = () => {}

const showAddDialog = () => {
  editingId.value = null
  form.value = { name: '', email: '', phone: '', weight: 1 }
  dialogVisible.value = true
}

const showEditDialog = (row: any) => {
  editingId.value = row.id
  form.value = { name: row.name, email: row.email, phone: row.phone, weight: row.weight }
  dialogVisible.value = true
}

const showParticipantLibDialog = () => {
  selectedParticipants.value = []
  loadParticipantLib()
  participantLibDialogVisible.value = true
}

const handleSelectionChange = (selection: any[]) => {
  selectedParticipants.value = selection
}

const handleDownloadTemplate = (command: string) => {
  downloadParticipantTemplate(command as 'xlsx' | 'csv')
  ElMessage.success('模板下载成功')
}

const handleSubmit = async () => {
  if (!form.value.name.trim() && !editingId.value) {
    return ElMessage.warning('姓名不能为空')
  }
  
  if (editingId.value) {
    await updateParticipant(editingId.value, form.value)
    ElMessage.success('更新成功')
  } else {
    const participant = await createParticipant({ ...form.value, scene_id: sceneId.value })
    await addParticipants(selectedSessionId.value!, [participant.id])
    ElMessage.success('添加成功')
  }
  
  dialogVisible.value = false
  loadSessionParticipants()
}

const addToSession = async (participant: any) => {
  await addParticipants(selectedSessionId.value!, [...sessionParticipants.value.map(p => p.id), participant.id])
  ElMessage.success('添加成功')
  loadSessionParticipants()
}

const batchAddToSession = async () => {
  const allIds = [...sessionParticipants.value.map(p => p.id), ...selectedParticipants.value.map(p => p.id)]
  await addParticipants(selectedSessionId.value!, allIds)
  ElMessage.success(`成功添加 ${selectedParticipants.value.length} 人`)
  participantLibDialogVisible.value = false
  loadSessionParticipants()
}

const handleRemove = async (participantId: number) => {
  const newIds = sessionParticipants.value.filter(p => p.id !== participantId).map(p => p.id)
  await addParticipants(selectedSessionId.value!, newIds)
  ElMessage.success('移除成功')
  loadSessionParticipants()
}

const toggleBlacklist = async (id: number, val: boolean) => {
  await updateBlacklist(id, val ? 1 : 0)
  loadSessionParticipants()
}

const handleImport = (file: File) => {
  importFile.value = file
  importDialogVisible.value = true
  return false
}

const handleFileSelect = (file: File) => {
  importFile.value = file
  return false
}

const executeImport = async () => {
  if (!importFile.value || !selectedSessionId.value) return
  
  try {
    const data = await readExcel(importFile.value)
    let successCount = 0
    let skipCount = 0
    const newIds = [...sessionParticipants.value.map(p => p.id)]
    
    for (const row of data) {
      const name = row.name || row['姓名'] || row.Name
      if (name) {
        const participant = await createParticipant({
          name: name,
          email: row.email || row['邮箱'] || '',
          phone: row.phone || row['电话'] || '',
          weight: row.weight || row['权重'] || 1,
          scene_id: sceneId.value
        })
        newIds.push(participant.id)
        successCount++
      } else {
        skipCount++
      }
    }
    
    await addParticipants(selectedSessionId.value!, newIds)
    
    ElMessage.success(`导入成功 ${successCount} 人，跳过 ${skipCount} 人`)
    importDialogVisible.value = false
    importFile.value = null
    loadSessionParticipants()
  } catch (error) {
    ElMessage.error('导入失败，请检查文件格式')
  }
}

const readExcel = (file: File): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        const json = XLSX.utils.sheet_to_json(worksheet)
        resolve(json as any[])
      } catch (err) {
        reject(err)
      }
    }
    reader.onerror = reject
    reader.readAsArrayBuffer(file)
  })
}

watch(sceneId, () => {
  if (sceneId.value) {
    loadSessions()
    selectedSessionId.value = null
    sessionParticipants.value = []
  }
})

watch(isInitialized, () => {
  if (isInitialized.value && sceneId.value) loadSessions()
})

onMounted(() => {
  if (isInitialized.value && sceneId.value) loadSessions()
})
</script>
