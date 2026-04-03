<template>
  <div class="config">
    <el-card class="config-card">
      <template #header>
        <div class="card-header">
          <span>系统配置</span>
          <el-button type="primary" @click="saveConfig">
            <el-icon><Check /></el-icon>
            保存配置
          </el-button>
        </div>
      </template>

      <el-form :model="config" label-width="140px" label-position="left">
        <el-divider content-position="left">
          <el-icon><Brush /></el-icon>
          主题配置
        </el-divider>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="主题">
              <el-select v-model="config.theme" placeholder="请选择主题">
                <el-option label="默认主题" value="default" />
                <el-option label="红色主题" value="red" />
                <el-option label="蓝色主题" value="blue" />
                <el-option label="绿色主题" value="green" />
                <el-option label="紫色主题" value="purple" />
                <el-option label="金色主题" value="gold" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="主色调">
              <el-color-picker v-model="config.primaryColor" show-alpha />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="次色调">
              <el-color-picker v-model="config.secondaryColor" show-alpha />
            </el-form-item>
          </el-col>
        </el-row>

        <el-divider content-position="left">
          <el-icon><Picture /></el-icon>
          背景配置
        </el-divider>

        <el-form-item label="背景类型">
          <el-radio-group v-model="config.backgroundType">
            <el-radio label="solid">纯色</el-radio>
            <el-radio label="gradient">渐变</el-radio>
            <el-radio label="image">图片</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-row :gutter="20">
          <el-col :span="12" v-if="config.backgroundType === 'solid'">
            <el-form-item label="背景颜色">
              <el-color-picker v-model="config.backgroundColor" show-alpha />
            </el-form-item>
          </el-col>
          <el-col :span="12" v-if="config.backgroundType === 'gradient'">
            <el-form-item label="渐变起始色">
              <el-color-picker v-model="config.gradientStartColor" show-alpha />
            </el-form-item>
          </el-col>
          <el-col :span="12" v-if="config.backgroundType === 'gradient'">
            <el-form-item label="渐变结束色">
              <el-color-picker v-model="config.gradientEndColor" show-alpha />
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="背景图片" v-if="config.backgroundType === 'image'">
          <el-input v-model="config.backgroundImage" placeholder="请输入背景图片URL" />
        </el-form-item>

        <el-divider content-position="left">
          <el-icon><MagicStick /></el-icon>
          动画配置
        </el-divider>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="动画类型">
              <el-select v-model="config.animationType" placeholder="请选择动画类型">
                <el-option label="网格流动" value="grid" />
                <el-option label="粒子效果" value="particles" />
                <el-option label="闪烁星光" value="sparkle" />
                <el-option label="旋转光环" value="rotate" />
                <el-option label="波浪效果" value="wave" />
                <el-option label="无动画" value="none" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="动画速度">
              <el-slider 
                v-model="config.animationSpeed" 
                :min="1" 
                :max="10" 
                :step="1"
                :marks="{ 1: '慢', 5: '中', 10: '快' }"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="特效">
          <el-checkbox-group v-model="config.animationEffects">
            <el-checkbox label="confetti">彩纸</el-checkbox>
            <el-checkbox label="fireworks">烟花</el-checkbox>
            <el-checkbox label="stars">星星</el-checkbox>
            <el-checkbox label="ribbon">彩带</el-checkbox>
          </el-checkbox-group>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card class="preview-card" style="margin-top: 20px;">
      <template #header>
        <div class="card-header">
          <span>预览效果</span>
        </div>
      </template>
      <div class="preview-container" :style="previewStyle">
        <div class="preview-content">
          <div class="preview-title">抽奖系统</div>
          <div class="preview-subtitle">Lucky Draw</div>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Check, Brush, Picture, MagicStick } from '@element-plus/icons-vue'
import axios from 'axios'

const API_BASE = 'http://localhost:3000/api'

const config = reactive({
  theme: 'default',
  primaryColor: '#3B82F6',
  secondaryColor: '#10B981',
  backgroundType: 'gradient',
  backgroundColor: '#ffffff',
  gradientStartColor: '#3B82F6',
  gradientEndColor: '#10B981',
  backgroundImage: '',
  animationType: 'grid',
  animationSpeed: 5,
  animationEffects: ['confetti'] as string[]
})

const previewStyle = computed(() => {
  let backgroundStyle = {}
  if (config.backgroundType === 'solid') {
    backgroundStyle = { backgroundColor: config.backgroundColor }
  } else if (config.backgroundType === 'gradient') {
    backgroundStyle = { 
      background: `linear-gradient(135deg, ${config.gradientStartColor} 0%, ${config.gradientEndColor} 100%)` 
    }
  } else if (config.backgroundType === 'image') {
    backgroundStyle = { 
      backgroundImage: `url(${config.backgroundImage})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center'
    }
  }
  return backgroundStyle
})

const loadConfig = async () => {
  try {
    const res = await axios.get(`${API_BASE}/config`)
    Object.assign(config, res.data)
  } catch (error) {
    console.error('加载配置失败:', error)
    ElMessage.error('加载配置失败')
  }
}

const saveConfig = async () => {
  try {
    await axios.put(`${API_BASE}/config`, config)
    ElMessage.success('配置保存成功')
  } catch (error: any) {
    ElMessage.error(error.response?.data?.error || '保存配置失败')
  }
}

onMounted(() => {
  loadConfig()
})
</script>

<style scoped>
.config {
  padding: 0;
}

.config-card,
.preview-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
}

.preview-container {
  height: 300px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
}

.preview-content {
  text-align: center;
  z-index: 10;
}

.preview-title {
  font-size: 48px;
  font-weight: bold;
  color: white;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
  margin-bottom: 16px;
}

.preview-subtitle {
  font-size: 24px;
  color: rgba(255, 255, 255, 0.9);
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.3);
}
</style>
