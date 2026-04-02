<template>
  <div class="config-page">
    <h2>系统配置管理</h2>
    
    <el-card class="config-card">
      <template #header>
        <div class="card-header">
          <span>基本配置</span>
        </div>
      </template>
      
      <el-form :model="config" label-width="120px">
        <!-- 标题配置 -->
        <el-form-item label="系统标题">
          <el-input v-model="config.title" placeholder="请输入系统标题" />
        </el-form-item>
        
        <!-- 背景图配置 -->
        <el-form-item label="背景图片">
          <el-upload
            class="upload-demo"
            action="/api/upload"
            :on-success="handleImageUpload"
            :show-file-list="false"
            accept="image/*"
          >
            <el-button type="primary">
              <el-icon><Upload /></el-icon>
              上传背景图
            </el-button>
          </el-upload>
          <div v-if="config.backgroundImage" class="image-preview">
            <img :src="config.backgroundImage" alt="背景图" />
            <el-button type="danger" size="small" @click="removeBackgroundImage">
              <el-icon><Delete /></el-icon>
              删除
            </el-button>
          </div>
        </el-form-item>
        
        <!-- 滚动速度配置 -->
        <el-form-item label="滚动速度">
          <el-slider
            v-model="config.scrollSpeed"
            :min="1"
            :max="10"
            :step="1"
            show-input
          />
          <span class="speed-info">{{ getSpeedText(config.scrollSpeed) }}</span>
        </el-form-item>
        
        <!-- 配色方案配置 -->
        <el-form-item label="配色方案">
          <el-radio-group v-model="config.colorScheme">
            <el-radio-button label="default">默认</el-radio-button>
            <el-radio-button label="blue">蓝色</el-radio-button>
            <el-radio-button label="green">绿色</el-radio-button>
            <el-radio-button label="purple">紫色</el-radio-button>
          </el-radio-group>
        </el-form-item>
        
        <!-- 保存按钮 -->
        <el-form-item>
          <el-button type="primary" @click="saveConfig">保存配置</el-button>
          <el-button @click="resetConfig">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { Upload, Delete } from '@element-plus/icons-vue';

// 配置数据
const config = ref({
  title: '抽奖管理系统',
  backgroundImage: '',
  scrollSpeed: 5,
  colorScheme: 'default'
});

// 从本地存储加载配置
onMounted(() => {
  loadConfig();
  applyConfig();
});

// 加载配置
const loadConfig = () => {
  const savedConfig = localStorage.getItem('appConfig');
  if (savedConfig) {
    config.value = { ...config.value, ...JSON.parse(savedConfig) };
  }
};

// 保存配置
const saveConfig = () => {
  localStorage.setItem('appConfig', JSON.stringify(config.value));
  applyConfig();
  ElMessage.success('配置保存成功');
};

// 重置配置
const resetConfig = () => {
  config.value = {
    title: '抽奖管理系统',
    backgroundImage: '',
    scrollSpeed: 5,
    colorScheme: 'default'
  };
  saveConfig();
};

// 处理图片上传
const handleImageUpload = (response) => {
  if (response && response.fileUrl) {
    config.value.backgroundImage = response.fileUrl;
  }
};

// 删除背景图
const removeBackgroundImage = () => {
  config.value.backgroundImage = '';
};

// 获取速度文本
const getSpeedText = (speed) => {
  const texts = {
    1: '极慢',
    2: '很慢',
    3: '慢',
    4: '较慢',
    5: '正常',
    6: '较快',
    7: '快',
    8: '很快',
    9: '极快',
    10: '闪电'
  };
  return texts[speed] || '正常';
};

// 应用配置
const applyConfig = () => {
  // 应用标题
  document.title = config.value.title;
  
  // 应用背景图
  if (config.value.backgroundImage) {
    document.body.style.backgroundImage = `url(${config.value.backgroundImage})`;
    document.body.style.backgroundSize = 'cover';
    document.body.style.backgroundRepeat = 'no-repeat';
  } else {
    document.body.style.backgroundImage = '';
  }
  
  // 应用配色方案
  document.body.setAttribute('data-color-scheme', config.value.colorScheme);
};
</script>

<style scoped>
.config-page {
  padding: 20px;
}

.config-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.image-preview {
  margin-top: 10px;
  position: relative;
  display: inline-block;
}

.image-preview img {
  width: 200px;
  height: 100px;
  object-fit: cover;
  border-radius: 4px;
}

.image-preview .el-button {
  position: absolute;
  bottom: 0;
  right: 0;
  border-radius: 0 0 4px 0;
}

.speed-info {
  margin-left: 10px;
  color: #606266;
}
</style>
