<template>
  <div>
    <el-card>
      <template #header>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div style="display: flex; align-items: center; gap: 16px;">
            <span>奖品管理</span>
            <el-select v-model="selectedSessionId" placeholder="选择场次" style="width: 200px" @change="loadSessionPrizes">
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
            <el-button type="primary" @click="showAddDialog" :disabled="!selectedSessionId">添加奖品</el-button>
          </div>
        </div>
      </template>

      <el-alert v-if="!selectedSessionId" type="info" :closable="false" style="margin-bottom: 16px;">
        请先选择场次，然后管理该场次下的奖品
      </el-alert>

      <el-table :data="sessionPrizes" stripe border v-if="selectedSessionId">
        <el-table-column prop="id" label="ID" width="60" />
        <el-table-column prop="name" label="奖品名称" width="200" />
        <el-table-column prop="description" label="描述" />
        <el-table-column prop="quantity" label="数量" width="80" />
        <el-table-column label="剩余" width="80">
          <template #default="{ row }">
            <span :style="{ color: row.remaining > 0 ? '#67c23a' : '#f56c6c' }">{{ row.remaining }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="level" label="等级" width="100">
          <template #default="{ row }">
            <el-tag :type="getLevelType(row.level)">{{ row.level }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="showEditDialog(row)">编辑</el-button>
            <el-popconfirm title="确定从该场次移除此奖品?" @confirm="handleRemove(row.id)">
              <template #reference><el-button size="small" type="danger">移除</el-button></template>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>

      <el-empty v-else description="请选择场次" />
    </el-card>

    <el-card style="margin-top: 20px" v-if="selectedSessionId">
      <template #header>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span>奖品库</span>
          <el-button type="primary" size="small" @click="showPrizeLibDialog">从奖品库添加</el-button>
        </div>
      </template>
      <el-table :data="availablePrizes" stripe border size="small">
        <el-table-column prop="name" label="奖品名称" width="200" />
        <el-table-column prop="level" label="等级" width="100">
          <template #default="{ row }">
            <el-tag :type="getLevelType(row.level)" size="small">{{ row.level }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="count" label="库存" width="80" />
        <el-table-column label="操作" width="120">
          <template #default="{ row }">
            <el-button size="small" type="primary" @click="addToSession(row)">添加到场次</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="dialogVisible" :title="editingId ? '编辑奖品数量' : '添加奖品到场次'" width="500px">
      <el-form :model="form" label-width="80px">
        <el-form-item label="奖品名称" v-if="!editingId">
          <el-input v-model="form.name" placeholder="输入奖品名称" />
        </el-form-item>
        <el-form-item label="奖品等级" v-if="!editingId">
          <el-select v-model="form.level" placeholder="选择等级" style="width: 100%">
            <el-option label="特等奖" value="特等奖" />
            <el-option label="一等奖" value="一等奖" />
            <el-option label="二等奖" value="二等奖" />
            <el-option label="三等奖" value="三等奖" />
            <el-option label="参与奖" value="参与奖" />
          </el-select>
        </el-form-item>
        <el-form-item label="数量">
          <el-input-number v-model="form.quantity" :min="1" :max="1000" />
        </el-form-item>
        <el-form-item label="描述" v-if="!editingId">
          <el-input v-model="form.description" type="textarea" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit">确认</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="prizeLibDialogVisible" title="从奖品库添加" width="600px">
      <el-table :data="prizeLib" stripe border size="small" @selection-change="handleSelectionChange">
        <el-table-column type="selection" width="50" />
        <el-table-column prop="name" label="奖品名称" />
        <el-table-column prop="level" label="等级" width="100">
          <template #default="{ row }">
            <el-tag :type="getLevelType(row.level)" size="small">{{ row.level }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="count" label="库存" width="80" />
      </el-table>
      <div style="margin-top: 16px;">
        <span>统一数量：</span>
        <el-input-number v-model="batchQuantity" :min="1" :max="100" />
      </div>
      <template #footer>
        <el-button @click="prizeLibDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="batchAddToSession" :disabled="selectedPrizes.length === 0">添加选中</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="importDialogVisible" title="批量导入奖品" width="500px">
      <el-alert type="info" :closable="false" style="margin-bottom: 16px;">
        <template #title>
          <div>Excel/CSV 格式要求：</div>
          <div>第一行为表头，包含：名称、描述、数量、等级</div>
          <div>等级可选值：特等奖、一等奖、二等奖、三等奖、参与奖</div>
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
import { ref, onMounted, watch, inject } from 'vue'
import { ElMessage } from 'element-plus'
import { ArrowDown, UploadFilled } from '@element-plus/icons-vue'
import { getSessions } from '../api/sessions'
import { getPrizes, createPrize } from '../api/prizes'
import { getSession, addPrize, removePrize } from '../api/sessions'
import { downloadPrizeTemplate } from '../utils/template'
import * as XLSX from 'xlsx'

const sessions = ref<any[]>([])
const selectedSessionId = ref<number | null>(null)
const sessionPrizes = ref<any[]>([])
const availablePrizes = ref<any[]>([])
const prizeLib = ref<any[]>([])
const selectedPrizes = ref<any[]>([])
const batchQuantity = ref(1)
const sceneId = inject<any>('sceneId')
const isInitialized = inject<any>('isInitialized')

const dialogVisible = ref(false)
const prizeLibDialogVisible = ref(false)
const importDialogVisible = ref(false)
const importFile = ref<File | null>(null)
const editingId = ref<number | null>(null)
const form = ref({ name: '', description: '', quantity: 1, level: '三等奖' })

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

const loadSessions = async () => {
  if (!sceneId.value) return
  sessions.value = await getSessions(sceneId.value)
}

const loadSessionPrizes = async () => {
  if (!selectedSessionId.value) {
    sessionPrizes.value = []
    return
  }
  
  const detail = await getSession(selectedSessionId.value)
  sessionPrizes.value = detail.prizes || []
  
  const allPrizes = await getPrizes(sceneId.value)
  const sessionPrizeIds = sessionPrizes.value.map((p: any) => p.id)
  availablePrizes.value = allPrizes.filter((p: any) => !sessionPrizeIds.includes(p.id))
}

const loadPrizeLib = async () => {
  prizeLib.value = await getPrizes(sceneId.value)
}

const showAddDialog = () => {
  editingId.value = null
  form.value = { name: '', description: '', quantity: 1, level: '三等奖' }
  dialogVisible.value = true
}

const showEditDialog = (row: any) => {
  editingId.value = row.id
  form.value = { name: row.name, description: row.description || '', quantity: row.quantity, level: row.level }
  dialogVisible.value = true
}

const showPrizeLibDialog = () => {
  selectedPrizes.value = []
  batchQuantity.value = 1
  loadPrizeLib()
  prizeLibDialogVisible.value = true
}

const handleSelectionChange = (selection: any[]) => {
  selectedPrizes.value = selection
}

const handleDownloadTemplate = (command: string) => {
  downloadPrizeTemplate(command as 'xlsx' | 'csv')
  ElMessage.success('模板下载成功')
}

const handleSubmit = async () => {
  if (!form.value.name.trim() && !editingId.value) {
    return ElMessage.warning('名称不能为空')
  }
  
  if (editingId.value) {
    await addPrize(selectedSessionId.value!, editingId.value, form.value.quantity)
    ElMessage.success('更新成功')
  } else {
    const prize = await createPrize({ ...form.value, scene_id: sceneId.value })
    await addPrize(selectedSessionId.value!, prize.id, form.value.quantity)
    ElMessage.success('添加成功')
  }
  
  dialogVisible.value = false
  loadSessionPrizes()
}

const addToSession = async (prize: any) => {
  await addPrize(selectedSessionId.value!, prize.id, 1)
  ElMessage.success('添加成功')
  loadSessionPrizes()
}

const batchAddToSession = async () => {
  for (const prize of selectedPrizes.value) {
    await addPrize(selectedSessionId.value!, prize.id, batchQuantity.value)
  }
  ElMessage.success(`成功添加 ${selectedPrizes.value.length} 个奖品`)
  prizeLibDialogVisible.value = false
  loadSessionPrizes()
}

const handleRemove = async (prizeId: number) => {
  await removePrize(selectedSessionId.value!, prizeId)
  ElMessage.success('移除成功')
  loadSessionPrizes()
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
    
    for (const row of data) {
      const name = row.name || row['名称'] || row.Name
      if (name) {
        const prize = await createPrize({
          name: name,
          description: row.description || row['描述'] || '',
          count: row.count || row['数量'] || row.quantity || 1,
          level: row.level || row['等级'] || '三等奖',
          scene_id: sceneId.value
        })
        await addPrize(selectedSessionId.value!, prize.id, row.count || row['数量'] || row.quantity || 1)
        successCount++
      } else {
        skipCount++
      }
    }
    
    ElMessage.success(`导入成功 ${successCount} 个，跳过 ${skipCount} 个`)
    importDialogVisible.value = false
    importFile.value = null
    loadSessionPrizes()
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
    sessionPrizes.value = []
  }
})

watch(isInitialized, () => {
  if (isInitialized.value && sceneId.value) loadSessions()
})

onMounted(() => {
  if (isInitialized.value && sceneId.value) loadSessions()
})
</script>
