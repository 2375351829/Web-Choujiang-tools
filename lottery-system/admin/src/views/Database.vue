<template>
  <div class="database-container">
    <el-row :gutter="20">
      <el-col :span="6">
        <el-card class="table-list-card">
          <template #header>
            <div class="card-header">
              <span>数据表</span>
              <el-button type="primary" size="small" @click="loadTables">
                <el-icon><Refresh /></el-icon>
              </el-button>
            </div>
          </template>
          <el-menu
            :default-active="selectedTable"
            @select="handleTableSelect"
            v-loading="loadingTables"
          >
            <el-menu-item
              v-for="table in tables"
              :key="table"
              :index="table"
            >
              <el-icon><Grid /></el-icon>
              <span>{{ table }}</span>
            </el-menu-item>
          </el-menu>
        </el-card>

        <el-card class="info-card" style="margin-top: 20px;">
          <template #header>
            <span>数据库信息</span>
          </template>
          <el-descriptions :column="1" size="small" v-if="dbInfo.exists">
            <el-descriptions-item label="文件大小">{{ formatSize(dbInfo.size) }}</el-descriptions-item>
            <el-descriptions-item label="修改时间">{{ formatTime(dbInfo.modified) }}</el-descriptions-item>
          </el-descriptions>
          <el-empty v-else description="数据库不存在" :image-size="60" />
        </el-card>

        <el-card class="action-card" style="margin-top: 20px;">
          <template #header>
            <span>数据操作</span>
          </template>
          <div class="action-buttons">
            <el-button type="primary" @click="handleExport" style="width: 100%">
              <el-icon><Download /></el-icon> 导出数据库
            </el-button>
            <el-upload
              :show-file-list="false"
              :before-upload="handleImport"
              accept=".db,.sqlite,.sqlite3"
              style="width: 100%; margin-top: 10px;"
            >
              <el-button type="success" style="width: 100%">
                <el-icon><Upload /></el-icon> 导入数据库
              </el-button>
            </el-upload>
          </div>
        </el-card>
      </el-col>

      <el-col :span="18">
        <el-card class="data-card">
          <template #header>
            <div class="card-header">
              <span>{{ selectedTable ? `${selectedTable} 表数据` : '请选择数据表' }}</span>
              <div class="header-actions" v-if="selectedTable">
                <el-button size="small" @click="loadTableData">
                  <el-icon><Refresh /></el-icon> 刷新
                </el-button>
              </div>
            </div>
          </template>

          <div v-if="selectedTable" v-loading="loadingData">
            <el-table
              :data="tableData.rows"
              stripe
              border
              size="small"
              max-height="400"
              style="width: 100%"
            >
              <el-table-column
                v-for="col in tableData.columns"
                :key="col.name"
                :prop="col.name"
                :label="col.name"
                :min-width="getColumnWidth(col)"
              >
                <template #header>
                  <div class="column-header">
                    <span>{{ col.name }}</span>
                    <el-tag size="small" type="info" v-if="col.pk" style="margin-left: 4px">PK</el-tag>
                  </div>
                </template>
                <template #default="{ row }">
                  <span :class="{ 'null-value': row[col.name] === null }">
                    {{ formatValue(row[col.name]) }}
                  </span>
                </template>
              </el-table-column>
            </el-table>

            <div class="pagination-container" v-if="tableData.total > tableData.pageSize">
              <el-pagination
                v-model:current-page="currentPage"
                :page-size="tableData.pageSize"
                :total="tableData.total"
                layout="total, prev, pager, next"
                @current-change="handlePageChange"
              />
            </div>
          </div>

          <el-empty v-else description="请从左侧选择数据表" />
        </el-card>

        <el-card class="sql-card" style="margin-top: 20px;">
          <template #header>
            <div class="card-header">
              <span>SQL 执行器</span>
              <el-button type="primary" size="small" @click="executeSqlQuery" :loading="executing">
                执行 (Ctrl+Enter)
              </el-button>
            </div>
          </template>

          <el-input
            v-model="sqlQuery"
            type="textarea"
            :rows="5"
            placeholder="输入 SQL 语句，支持 SELECT, INSERT, UPDATE, DELETE 等..."
            @keydown.ctrl.enter="executeSqlQuery"
          />

          <div class="sql-result" v-if="sqlResult">
            <el-divider content-position="left">执行结果</el-divider>
            <el-alert
              :type="sqlResult.type === 'error' ? 'error' : 'success'"
              :closable="false"
              show-icon
            >
              <template #title>
                <span v-if="sqlResult.type === 'select'">
                  查询返回 {{ sqlResult.results?.length || 0 }} 条记录
                </span>
                <span v-else-if="sqlResult.type === 'modify'">
                  {{ sqlResult.message }}
                </span>
                <span v-else-if="sqlResult.type === 'error'">
                  {{ sqlResult.error }}
                </span>
              </template>
            </el-alert>

            <el-table
              v-if="sqlResult.type === 'select' && sqlResult.results?.length > 0"
              :data="sqlResult.results"
              stripe
              border
              size="small"
              max-height="300"
              style="margin-top: 10px;"
            >
              <el-table-column
                v-for="(value, key) in sqlResult.results[0]"
                :key="key"
                :prop="key"
                :label="key"
              >
                <template #default="{ row }">
                  {{ formatValue(row[key]) }}
                </template>
              </el-table-column>
            </el-table>
          </div>
        </el-card>

        <el-card class="schema-card" style="margin-top: 20px;">
          <template #header>
            <div class="card-header">
              <span>表结构</span>
              <el-button size="small" @click="loadSchema">
                <el-icon><Refresh /></el-icon>
              </el-button>
            </div>
          </template>

          <el-collapse v-model="activeSchema" v-if="schema.length > 0">
            <el-collapse-item
              v-for="table in schema"
              :key="table.name"
              :title="table.name"
              :name="table.name"
            >
              <pre class="schema-sql">{{ table.sql }}</pre>
            </el-collapse-item>
          </el-collapse>
          <el-empty v-else description="暂无表结构信息" :image-size="60" />
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Refresh, Grid, Download, Upload } from '@element-plus/icons-vue'
import {
  getTables,
  getTableData,
  executeSql,
  exportDatabase,
  importDatabase,
  getSchema,
  getDatabaseInfo
} from '../api/database'

const tables = ref<string[]>([])
const selectedTable = ref('')
const loadingTables = ref(false)
const loadingData = ref(false)
const executing = ref(false)

const tableData = ref<{
  columns: any[]
  rows: any[]
  total: number
  page: number
  pageSize: number
}>({
  columns: [],
  rows: [],
  total: 0,
  page: 1,
  pageSize: 50
})

const currentPage = ref(1)
const dbInfo = ref<any>({ exists: false })
const schema = ref<any[]>([])
const activeSchema = ref<string[]>([])

const sqlQuery = ref('')
const sqlResult = ref<any>(null)

const formatSize = (bytes: number) => {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
}

const formatTime = (time: string) => {
  return new Date(time).toLocaleString()
}

const formatValue = (value: any) => {
  if (value === null) return 'NULL'
  if (value === undefined) return ''
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

const getColumnWidth = (col: any) => {
  if (col.pk) return 100
  if (col.type?.includes('TEXT') || col.type?.includes('VARCHAR')) return 200
  return 120
}

const loadTables = async () => {
  loadingTables.value = true
  try {
    tables.value = await getTables()
  } catch (error) {
    console.error('加载表列表失败:', error)
  } finally {
    loadingTables.value = false
  }
}

const handleTableSelect = (table: string) => {
  selectedTable.value = table
  currentPage.value = 1
  loadTableData()
}

const loadTableData = async () => {
  if (!selectedTable.value) return
  
  loadingData.value = true
  try {
    const result = await getTableData(selectedTable.value, currentPage.value, 50)
    tableData.value = result
  } catch (error) {
    console.error('加载表数据失败:', error)
  } finally {
    loadingData.value = false
  }
}

const handlePageChange = (page: number) => {
  currentPage.value = page
  loadTableData()
}

const executeSqlQuery = async () => {
  if (!sqlQuery.value.trim()) {
    return ElMessage.warning('请输入SQL语句')
  }
  
  executing.value = true
  sqlResult.value = null
  try {
    const result = await executeSql(sqlQuery.value)
    sqlResult.value = result
    if (result.type === 'modify') {
      ElMessage.success(result.message)
      if (selectedTable.value) {
        loadTableData()
      }
      loadTables()
    }
  } catch (error: any) {
    sqlResult.value = {
      type: 'error',
      error: error.response?.data?.error || error.message || '执行失败'
    }
  } finally {
    executing.value = false
  }
}

const handleExport = async () => {
  try {
    const blob = await exportDatabase()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `lottery-backup-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.db`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
    ElMessage.success('数据库导出成功')
  } catch (error) {
    ElMessage.error('导出失败')
  }
}

const handleImport = async (file: File) => {
  try {
    await ElMessageBox.confirm(
      '导入数据库将覆盖当前数据，是否继续？',
      '警告',
      { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' }
    )
    
    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const arrayBuffer = e.target?.result as ArrayBuffer
        const base64 = btoa(
          new Uint8Array(arrayBuffer).reduce(
            (data, byte) => data + String.fromCharCode(byte),
            ''
          )
        )
        
        const result = await importDatabase(base64)
        ElMessage.success(result.message + '，正在刷新...')
        
        setTimeout(() => {
          loadTables()
          loadDatabaseInfo()
          loadSchema()
          selectedTable.value = ''
        }, 500)
      } catch (error: any) {
        ElMessage.error(error.response?.data?.error || '导入失败')
      }
    }
    reader.readAsArrayBuffer(file)
  } catch {
    // 用户取消
  }
  
  return false
}

const loadDatabaseInfo = async () => {
  try {
    dbInfo.value = await getDatabaseInfo()
  } catch (error) {
    console.error('加载数据库信息失败:', error)
  }
}

const loadSchema = async () => {
  try {
    schema.value = await getSchema()
  } catch (error) {
    console.error('加载表结构失败:', error)
  }
}

onMounted(() => {
  loadTables()
  loadDatabaseInfo()
  loadSchema()
})
</script>

<style scoped>
.database-container {
  padding: 0;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.table-list-card {
  max-height: 300px;
  overflow-y: auto;
}

.table-list-card :deep(.el-card__body) {
  padding: 0;
}

.table-list-card :deep(.el-menu) {
  border-right: none;
}

.info-card :deep(.el-descriptions) {
  margin: 0;
}

.action-buttons {
  display: flex;
  flex-direction: column;
}

.column-header {
  display: flex;
  align-items: center;
}

.null-value {
  color: #909399;
  font-style: italic;
}

.pagination-container {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}

.sql-result {
  margin-top: 16px;
}

.schema-sql {
  background-color: #f5f7fa;
  padding: 12px;
  border-radius: 4px;
  font-size: 12px;
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-all;
  margin: 0;
}

:deep(.el-collapse-item__header) {
  font-weight: 500;
}
</style>
