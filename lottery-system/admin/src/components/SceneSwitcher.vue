<template>
  <div class="scene-switcher">
    <el-dropdown @command="handleSwitch" trigger="click">
      <el-button type="primary" class="scene-btn">
        <span class="scene-icon">{{ currentScene?.icon || '🎁' }}</span>
        <span class="scene-name">{{ currentScene?.name || '选择场景' }}</span>
        <el-icon class="el-icon--right"><ArrowDown /></el-icon>
      </el-button>
      <template #dropdown>
        <el-dropdown-menu>
          <el-dropdown-item 
            v-for="scene in scenes" 
            :key="scene.id" 
            :command="scene.id"
            :class="{ 'is-active': scene.id === currentSceneId }"
          >
            <div class="scene-option">
              <span class="scene-icon">{{ scene.icon }}</span>
              <div class="scene-info">
                <div class="scene-title">{{ scene.name }}</div>
                <div class="scene-desc">{{ scene.description }}</div>
              </div>
              <el-icon v-if="scene.id === currentSceneId" class="check-icon"><Check /></el-icon>
            </div>
          </el-dropdown-item>
          <el-dropdown-item divided @click="showManageDialog">
            <el-icon><Setting /></el-icon>
            管理场景
          </el-dropdown-item>
        </el-dropdown-menu>
      </template>
    </el-dropdown>

    <el-dialog v-model="manageDialogVisible" title="场景管理" width="700px">
      <div class="scene-grid">
        <div 
          v-for="scene in scenes" 
          :key="scene.id" 
          class="scene-card"
          :class="{ active: scene.id === currentSceneId }"
          @click="handleSwitch(scene.id)"
        >
          <div class="card-icon">{{ scene.icon }}</div>
          <div class="card-name">{{ scene.name }}</div>
          <div class="card-desc">{{ scene.description }}</div>
          <div class="card-actions" @click.stop>
            <el-button size="small" text @click="editScene(scene)">编辑</el-button>
            <el-button size="small" text type="danger" @click="handleDelete(scene)" v-if="!scene.is_default">删除</el-button>
          </div>
        </div>
        <div class="scene-card add-card" @click="showAddDialog">
          <el-icon :size="32"><Plus /></el-icon>
          <div>添加场景</div>
        </div>
      </div>
    </el-dialog>

    <el-dialog v-model="editDialogVisible" :title="editingScene ? '编辑场景' : '添加场景'" width="500px">
      <el-form :model="sceneForm" label-width="80px">
        <el-form-item label="场景名称">
          <el-input v-model="sceneForm.name" placeholder="如：校园抽奖" />
        </el-form-item>
        <el-form-item label="场景代码">
          <el-input v-model="sceneForm.code" placeholder="如：campus" :disabled="!!editingScene" />
        </el-form-item>
        <el-form-item label="图标">
          <el-input v-model="sceneForm.icon" placeholder="如：🏫" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="sceneForm.description" type="textarea" />
        </el-form-item>
        <el-form-item label="标题">
          <el-input v-model="sceneForm.title" placeholder="展示页面标题" />
        </el-form-item>
        <el-form-item label="渐变起始色">
          <el-color-picker v-model="sceneForm.gradient_start" />
        </el-form-item>
        <el-form-item label="渐变结束色">
          <el-color-picker v-model="sceneForm.gradient_end" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSave">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowDown, Check, Setting, Plus } from '@element-plus/icons-vue'
import { getScenes, switchScene, createScene, updateScene, deleteScene } from '../api/scenes'
import { getConfig, updateConfig } from '../api/config'

const props = defineProps<{
  modelValue?: number
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: number): void
  (e: 'change', scene: any): void
}>()

const scenes = ref<any[]>([])
const currentSceneId = ref<number | null>(null)
const manageDialogVisible = ref(false)
const editDialogVisible = ref(false)
const editingScene = ref<any>(null)
const sceneForm = ref({
  name: '',
  code: '',
  icon: '🎁',
  description: '',
  title: '',
  gradient_start: '#667eea',
  gradient_end: '#764ba2'
})

const currentScene = computed(() => {
  return scenes.value.find(s => s.id === currentSceneId.value)
})

const loadScenes = async () => {
  scenes.value = await getScenes()
}

const loadCurrentScene = async () => {
  const config = await getConfig()
  if (config.current_scene_id) {
    currentSceneId.value = config.current_scene_id
  }
}

const handleSwitch = async (sceneId: number) => {
  try {
    await switchScene(sceneId)
    currentSceneId.value = sceneId
    emit('update:modelValue', sceneId)
    emit('change', currentScene.value)
    ElMessage.success(`已切换到 ${currentScene.value?.name}`)
  } catch (error) {
    ElMessage.error('切换场景失败')
  }
}

const showManageDialog = () => {
  manageDialogVisible.value = true
}

const showAddDialog = () => {
  editingScene.value = null
  sceneForm.value = {
    name: '',
    code: '',
    icon: '🎁',
    description: '',
    title: '',
    gradient_start: '#667eea',
    gradient_end: '#764ba2'
  }
  editDialogVisible.value = true
}

const editScene = (scene: any) => {
  editingScene.value = scene
  sceneForm.value = {
    name: scene.name,
    code: scene.code,
    icon: scene.icon,
    description: scene.description || '',
    title: scene.title || '',
    gradient_start: scene.gradient_start || '#667eea',
    gradient_end: scene.gradient_end || '#764ba2'
  }
  editDialogVisible.value = true
}

const handleSave = async () => {
  if (!sceneForm.value.name || !sceneForm.value.code) {
    return ElMessage.warning('场景名称和代码不能为空')
  }

  try {
    if (editingScene.value) {
      await updateScene(editingScene.value.id, sceneForm.value)
      ElMessage.success('更新成功')
    } else {
      await createScene(sceneForm.value)
      ElMessage.success('添加成功')
    }
    editDialogVisible.value = false
    loadScenes()
  } catch (error) {
    ElMessage.error('保存失败')
  }
}

const handleDelete = async (scene: any) => {
  try {
    await ElMessageBox.confirm(`确定删除场景"${scene.name}"吗？`, '警告', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    await deleteScene(scene.id)
    ElMessage.success('删除成功')
    loadScenes()
  } catch {}
}

watch(() => props.modelValue, (val) => {
  if (val) {
    currentSceneId.value = val
  }
})

onMounted(() => {
  loadScenes()
  loadCurrentScene()
})
</script>

<style scoped>
.scene-switcher {
  display: inline-block;
}

.scene-btn {
  display: flex;
  align-items: center;
  gap: 8px;
}

.scene-icon {
  font-size: 18px;
}

.scene-name {
  font-weight: 500;
}

.scene-option {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 4px 0;
  width: 280px;
}

.scene-option .scene-icon {
  font-size: 24px;
}

.scene-info {
  flex: 1;
}

.scene-title {
  font-weight: 500;
}

.scene-desc {
  font-size: 12px;
  color: #909399;
}

.check-icon {
  color: #409eff;
}

.scene-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.scene-card {
  border: 2px solid #e4e7ed;
  border-radius: 12px;
  padding: 20px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s;
}

.scene-card:hover {
  border-color: #409eff;
  background: #f5f7fa;
}

.scene-card.active {
  border-color: #409eff;
  background: #ecf5ff;
}

.card-icon {
  font-size: 36px;
  margin-bottom: 8px;
}

.card-name {
  font-weight: bold;
  margin-bottom: 4px;
}

.card-desc {
  font-size: 12px;
  color: #909399;
  margin-bottom: 8px;
}

.card-actions {
  display: flex;
  justify-content: center;
  gap: 8px;
}

.add-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #909399;
}

.add-card:hover {
  color: #409eff;
}
</style>
