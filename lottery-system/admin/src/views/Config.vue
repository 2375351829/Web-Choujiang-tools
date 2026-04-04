<template>
  <div class="config-page">
    <div class="config-left">
      <el-card header="系统配置" class="config-card">
        <el-form :model="config" label-width="100px" size="small">
          <el-form-item label="活动标题">
            <el-input v-model="config.title" @input="debouncedSync" />
          </el-form-item>
          
          <el-form-item label="当前场次">
            <el-select v-model="config.current_session_id" placeholder="选择当前场次" style="width: 100%" clearable @change="debouncedSync">
              <el-option v-for="s in sessions" :key="s.id" :label="s.name" :value="s.id">
                <span>{{ s.name }}</span>
                <el-tag size="small" :type="getStatusType(s.status)" style="margin-left: 8px">{{ s.status }}</el-tag>
              </el-option>
            </el-select>
          </el-form-item>

          <el-divider content-position="left">主题设置</el-divider>
          
          <el-form-item label="主题">
            <el-select v-model="config.theme" style="width: 100%" @change="debouncedSync">
              <el-option label="暗黑" value="dark" />
              <el-option label="明亮" value="light" />
              <el-option label="海洋" value="ocean" />
              <el-option label="森林" value="forest" />
              <el-option label="日落" value="sunset" />
              <el-option label="紫色" value="purple" />
            </el-select>
          </el-form-item>

          <el-divider content-position="left">背景设置</el-divider>
          
          <el-form-item label="背景类型">
            <el-select v-model="config.background_type" @change="debouncedSync">
              <el-option label="渐变色" value="gradient" />
              <el-option label="纯色" value="color" />
              <el-option label="图片" value="image" />
            </el-select>
          </el-form-item>
          <el-form-item v-if="config.background_type === 'gradient'" label="渐变起始色">
            <el-color-picker v-model="config.gradient_start" @change="debouncedSync" />
          </el-form-item>
          <el-form-item v-if="config.background_type === 'gradient'" label="渐变结束色">
            <el-color-picker v-model="config.gradient_end" @change="debouncedSync" />
          </el-form-item>
          <el-form-item v-if="config.background_type === 'gradient'" label="渐变角度">
            <el-input-number v-model="config.gradient_degree" :min="0" :max="360" @change="debouncedSync" />
          </el-form-item>
          <el-form-item v-if="config.background_type === 'color'" label="背景颜色">
            <el-color-picker v-model="config.background_color" @change="debouncedSync" />
          </el-form-item>
          <el-form-item v-if="config.background_type === 'image'" label="背景图片">
            <el-upload
              :action="uploadUrl"
              :show-file-list="false"
              :on-success="handleUploadSuccess"
              :before-upload="beforeUpload"
              accept="image/*"
            >
              <el-button size="small" type="primary">上传图片</el-button>
            </el-upload>
          </el-form-item>

          <el-divider content-position="left">动画设置</el-divider>
          
          <el-form-item label="动画类型">
            <el-select v-model="config.animation_type" style="width: 100%" @change="debouncedSync">
              <el-option label="老虎机滚动" value="slot" />
              <el-option label="网格动画" value="grid" />
              <el-option label="列表动画" value="list" />
            </el-select>
          </el-form-item>
          <el-form-item label="轮播速度(ms)">
            <el-input-number v-model="config.carousel_speed" :min="1000" :max="10000" :step="500" @change="debouncedSync" />
          </el-form-item>

          <el-divider content-position="left">显示设置</el-divider>
          
          <el-form-item label="显示参与者">
            <el-switch v-model="config.show_participants" @change="debouncedSync" />
          </el-form-item>
          <el-form-item label="显示奖品">
            <el-switch v-model="config.show_prizes" @change="debouncedSync" />
          </el-form-item>
          <el-form-item label="显示中奖者">
            <el-switch v-model="config.show_winner" @change="debouncedSync" />
          </el-form-item>
          
          <el-form-item>
            <el-button type="primary" @click="handleSave">保存配置</el-button>
            <el-button type="success" @click="syncToDisplay">同步到展示端</el-button>
          </el-form-item>
        </el-form>
      </el-card>

      <el-card header="布局配置" class="config-card layout-card">
        <div class="layout-settings">
          <el-form label-width="80px" size="small">
            <el-form-item label="布局模式">
              <el-select v-model="layoutSettings.mode" style="width: 100%" @change="handleLayoutModeChange">
                <el-option label="单列布局" value="single" />
                <el-option label="双列布局" value="double" />
                <el-option label="三列布局" value="triple" />
                <el-option label="自适应" value="auto" />
              </el-select>
            </el-form-item>
            <el-form-item label="模块间距">
              <el-slider v-model="layoutSettings.gap" :min="0" :max="40" :step="5" @change="handleLayoutChange" />
            </el-form-item>
            <el-form-item label="响应式" v-if="layoutSettings.mode === 'auto'">
              <el-switch v-model="layoutSettings.responsive" @change="handleLayoutChange" />
            </el-form-item>
          </el-form>
        </div>
        
        <el-divider content-position="left">模块配置</el-divider>
        
        <div class="layout-info">
          <el-alert type="info" :closable="false" show-icon>
            拖拽调整顺序，点击设置列宽
          </el-alert>
        </div>
        
        <div class="layout-items">
          <div 
            v-for="(item, index) in layoutItems" 
            :key="item.id"
            class="layout-item"
            :class="{ active: item.visible, 'full-width': item.colSpan >= maxCols }"
            draggable="true"
            @dragstart="handleDragStart($event, index)"
            @dragover.prevent
            @drop="handleDrop($event, index)"
            @dragenter.prevent
            @click="showItemConfig(item)"
          >
            <div class="layout-item-header">
              <span class="drag-handle">☰</span>
              <span class="layout-item-icon">{{ item.icon }}</span>
              <span class="layout-item-name">{{ item.name }}</span>
              <el-tag size="small" type="info" v-if="item.colSpan > 1">{{ item.colSpan }}列</el-tag>
            </div>
            <div class="layout-item-actions">
              <el-switch v-model="item.visible" size="small" @change="handleLayoutChange" @click.stop />
            </div>
          </div>
        </div>
        
        <el-dialog v-model="itemConfigVisible" :title="currentItem?.name + ' 配置'" width="360px">
          <el-form label-width="80px" v-if="currentItem">
            <el-form-item label="占用列数">
              <el-slider v-model="currentItem.colSpan" :min="1" :max="maxCols" :step="1" show-stops @change="handleLayoutChange" />
            </el-form-item>
            <el-form-item label="最小高度">
              <el-input-number v-model="currentItem.minHeight" :min="100" :max="600" :step="50" @change="handleLayoutChange" />
            </el-form-item>
          </el-form>
          <template #footer>
            <el-button @click="itemConfigVisible = false">关闭</el-button>
          </template>
        </el-dialog>
      </el-card>
    </div>

    <div class="config-right">
      <div class="preview-header">
        <span class="preview-title">实时预览</span>
        <div class="preview-actions">
          <el-button size="small" @click="refreshPreview">刷新预览</el-button>
          <el-button size="small" type="primary" @click="openInNewTab">新窗口打开</el-button>
        </div>
      </div>
      <div class="preview-container">
        <iframe 
          ref="previewFrame"
          :src="displayUrl" 
          class="preview-iframe"
          frameborder="0"
          allowfullscreen
        ></iframe>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import { io } from 'socket.io-client'
import { getConfig, updateConfig } from '../api/config'
import { getSessions } from '../api/sessions'

const socket = ref<any>(null)
const previewFrame = ref<HTMLIFrameElement | null>(null)
const uploadUrl = 'http://localhost:3000/api/upload'
const displayUrl = 'http://localhost:5174'

const config = ref({
  title: '抽奖活动',
  background_type: 'gradient',
  background_color: '#0f172a',
  background_image: '',
  background_size: 'cover',
  gradient_start: '#667eea',
  gradient_end: '#764ba2',
  gradient_degree: 135,
  animation_type: 'slot',
  show_participants: true,
  show_prizes: true,
  show_winner: true,
  carousel_speed: 3000,
  current_session_id: null as number | null,
  theme: 'dark',
  layout_config: '{}'
})

const sessions = ref<any[]>([])

const layoutSettings = ref({
  mode: 'auto',
  gap: 20,
  responsive: true,
  breakpoints: {
    sm: 640,
    md: 1024,
    lg: 1280,
    xl: 1920
  }
})

const defaultLayoutItems = [
  { id: 'stats', name: '统计卡片', icon: '📊', visible: true, order: 0, colSpan: 1, minHeight: 120 },
  { id: 'participants', name: '参与者名单', icon: '👥', visible: true, order: 1, colSpan: 1, minHeight: 300 },
  { id: 'prizes', name: '奖品列表', icon: '🎁', visible: true, order: 2, colSpan: 1, minHeight: 300 },
  { id: 'winners', name: '中奖记录', icon: '🏆', visible: true, order: 3, colSpan: 1, minHeight: 200 }
]

const layoutItems = ref<any[]>([...defaultLayoutItems])

const maxCols = computed(() => {
  const mode = layoutSettings.value.mode
  if (mode === 'single') return 1
  if (mode === 'double') return 2
  if (mode === 'triple') return 3
  return 4
})

const itemConfigVisible = ref(false)
const currentItem = ref<any>(null)

const showItemConfig = (item: any) => {
  currentItem.value = item
  itemConfigVisible.value = true
}

const getStatusType = (status: string) => {
  const map: Record<string, string> = { '未开始': 'info', '进行中': 'success', '已结束': 'danger' }
  return map[status] || 'info'
}

const beforeUpload = (file: File) => {
  const isImage = file.type.startsWith('image/')
  const isLt10M = file.size / 1024 / 1024 < 10
  
  if (!isImage) {
    ElMessage.error('只能上传图片文件!')
    return false
  }
  if (!isLt10M) {
    ElMessage.error('图片大小不能超过 10MB!')
    return false
  }
  return true
}

const handleUploadSuccess = (response: any) => {
  if (response.success) {
    config.value.background_image = response.file_url
    ElMessage.success('图片上传成功')
    syncToDisplay()
  } else {
    ElMessage.error('上传失败')
  }
}

const loadConfig = async () => {
  try {
    const data = await getConfig()
    config.value = { 
      ...config.value, 
      ...data,
      show_participants: !!data.show_participants,
      show_prizes: !!data.show_prizes,
      show_winner: !!data.show_winner
    }
    
    if (data.layout_config) {
      try {
        const layout = JSON.parse(data.layout_config)
        if (layout.settings) {
          layoutSettings.value = { ...layoutSettings.value, ...layout.settings }
        }
        if (layout.items && Array.isArray(layout.items)) {
          layoutItems.value = layout.items.map((item: any) => ({
            ...defaultLayoutItems.find(d => d.id === item.id) || {},
            ...item
          }))
        }
      } catch (e) {
        console.error('解析布局配置失败:', e)
      }
    }
  } catch (e) {}
}

const loadSessions = async () => {
  sessions.value = await getSessions()
}

let syncTimeout: number | null = null
const debouncedSync = () => {
  if (syncTimeout) clearTimeout(syncTimeout)
  syncTimeout = window.setTimeout(() => {
    syncToDisplay()
  }, 500)
}

const syncToDisplay = () => {
  if (socket.value) {
    const configData = {
      ...config.value,
      layout_config: JSON.stringify({ 
        settings: layoutSettings.value,
        items: layoutItems.value 
      })
    }
    socket.value.emit('config:update', configData)
  }
}

const handleSave = async () => {
  const configData = {
    ...config.value,
    layout_config: JSON.stringify({ 
      settings: layoutSettings.value,
      items: layoutItems.value 
    })
  }
  await updateConfig(configData)
  ElMessage.success('保存成功')
  syncToDisplay()
}

const refreshPreview = () => {
  if (previewFrame.value) {
    previewFrame.value.src = previewFrame.value.src
  }
}

const openInNewTab = () => {
  window.open(displayUrl, '_blank')
}

let draggedIndex: number | null = null

const handleDragStart = (e: DragEvent, index: number) => {
  draggedIndex = index
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move'
  }
}

const handleDrop = (e: DragEvent, index: number) => {
  if (draggedIndex !== null && draggedIndex !== index) {
    const items = [...layoutItems.value]
    const [removed] = items.splice(draggedIndex, 1)
    items.splice(index, 0, removed)
    layoutItems.value = items.map((item, i) => ({ ...item, order: i }))
    handleLayoutChange()
  }
  draggedIndex = null
}

const handleLayoutModeChange = () => {
  layoutItems.value.forEach(item => {
    if (item.colSpan > maxCols.value) {
      item.colSpan = maxCols.value
    }
  })
  handleLayoutChange()
}

const handleLayoutChange = () => {
  syncToDisplay()
}

onMounted(() => {
  loadConfig()
  loadSessions()
  
  socket.value = io('http://localhost:3000', {
    path: '/socket.io'
  })
})

onUnmounted(() => {
  if (socket.value) socket.value.disconnect()
  if (syncTimeout) clearTimeout(syncTimeout)
})
</script>

<style scoped>
.config-page {
  display: flex;
  gap: 20px;
  height: calc(100vh - 100px);
}

.config-left {
  width: 420px;
  flex-shrink: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding-bottom: 20px;
}

.config-card {
  flex-shrink: 0;
}

.layout-card {
  flex-shrink: 0;
}

.layout-card :deep(.el-card__body) {
  max-height: 500px;
  overflow-y: auto;
}

.layout-settings {
  margin-bottom: 15px;
}

.layout-info {
  margin-bottom: 15px;
}

.layout-items {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.layout-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 15px;
  background: #f5f7fa;
  border-radius: 8px;
  cursor: move;
  transition: all 0.3s;
  border: 2px solid transparent;
}

.layout-item:hover {
  background: #ecf5ff;
}

.layout-item.active {
  border-color: #409eff;
  background: #ecf5ff;
}

.layout-item.full-width {
  background: linear-gradient(135deg, #f5f7fa 0%, #e4e7ed 100%);
}

.layout-item-header {
  display: flex;
  align-items: center;
  gap: 10px;
}

.drag-handle {
  color: #909399;
  cursor: grab;
}

.layout-item-icon {
  font-size: 18px;
}

.layout-item-name {
  font-size: 14px;
  color: #303133;
}

.config-right {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 15px;
  background: #fff;
  border-radius: 8px 8px 0 0;
  border: 1px solid #ebeef5;
  border-bottom: none;
}

.preview-title {
  font-size: 16px;
  font-weight: bold;
  color: #303133;
}

.preview-actions {
  display: flex;
  gap: 10px;
}

.preview-container {
  flex: 1;
  background: #fff;
  border-radius: 0 0 8px 8px;
  border: 1px solid #ebeef5;
  overflow: hidden;
}

.preview-iframe {
  width: 100%;
  height: 100%;
  border: none;
}
</style>
