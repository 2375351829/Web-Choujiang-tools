<template>
  <div class="lucky-draw-animation" :class="{ 'fullscreen': isFullscreen }">
    <!-- 背景效果 -->
    <div class="background-effect">
      <div class="particles" v-for="i in 50" :key="i" :style="{ left: Math.random() * 100 + '%', top: Math.random() * 100 + '%', animationDelay: Math.random() * 5 + 's' }"></div>
    </div>
    
    <!-- 抽奖区域 -->
    <div class="draw-container" :class="displayMode">
      <!-- 九宫格模式 -->
      <div v-if="displayMode === 'grid'" class="grid-mode">
        <div 
          v-for="(item, index) in items" 
          :key="index" 
          class="grid-item" 
          :class="{ 'active': isActive(index), 'winner': isWinner(index) }"
        >
          <div class="item-content">
            <img v-if="item.avatar" :src="item.avatar" :alt="item.name" class="avatar">
            <div class="name">{{ item.name }}</div>
          </div>
        </div>
      </div>
      
      <!-- 列表模式 -->
      <div v-else-if="displayMode === 'list'" class="list-mode">
        <div 
          v-for="(item, index) in items" 
          :key="index" 
          class="list-item" 
          :class="{ 'active': isActive(index), 'winner': isWinner(index) }"
        >
          <img v-if="item.avatar" :src="item.avatar" :alt="item.name" class="avatar">
          <div class="name">{{ item.name }}</div>
        </div>
      </div>
      
      <!-- 3D球体模式 -->
      <div v-else-if="displayMode === 'sphere'" class="sphere-mode">
        <div class="sphere">
          <div 
            v-for="(item, index) in items" 
            :key="index" 
            class="sphere-item" 
            :style="getSphereItemStyle(index)"
            :class="{ 'active': isActive(index), 'winner': isWinner(index) }"
          >
            <img v-if="item.avatar" :src="item.avatar" :alt="item.name" class="avatar">
            <div class="name">{{ item.name }}</div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 控制按钮 -->
    <div v-if="showControls" class="controls">
      <el-button type="primary" @click="startDraw" :disabled="isDrawing">
        <el-icon><VideoPlay /></el-icon> 开始
      </el-button>
      <el-button type="warning" @click="pauseDraw" :disabled="!isDrawing">
        <el-icon><VideoPause /></el-icon> 暂停
      </el-button>
      <el-button type="danger" @click="stopDraw" :disabled="!isDrawing">
        <el-icon><VideoStop /></el-icon> 停止
      </el-button>
      <el-button @click="resetDraw">
        <el-icon><Refresh /></el-icon> 重置
      </el-button>
      
      <!-- 模式选择 -->
      <el-select v-model="displayMode" class="mode-select">
        <el-option label="九宫格" value="grid"></el-option>
        <el-option label="列表" value="list"></el-option>
        <el-option label="3D球体" value="sphere"></el-option>
      </el-select>
      
      <!-- 全屏切换 -->
      <el-button @click="toggleFullscreen">
        <el-icon>{{ isFullscreen ? <FullscreenExit /> : <Fullscreen /> }}</el-icon> {{ isFullscreen ? '退出全屏' : '全屏' }}
      </el-button>
    </div>
    
    <!-- 抽奖结果 -->
    <div v-if="winner" class="result-modal">
      <div class="result-content">
        <div class="result-title">恭喜中奖</div>
        <div class="winner-info">
          <img v-if="winner.avatar" :src="winner.avatar" :alt="winner.name" class="winner-avatar">
          <div class="winner-name">{{ winner.name }}</div>
        </div>
        <div class="prize-info" v-if="prize">
          <div class="prize-label">奖品</div>
          <div class="prize-name">{{ prize.name }}</div>
        </div>
        <el-button type="primary" @click="closeResult">关闭</el-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { VideoPlay, VideoPause, VideoStop, Refresh, Fullscreen, FullscreenExit } from '@element-plus/icons-vue';

// Props
const props = defineProps({
  items: {
    type: Array,
    default: () => []
  },
  showControls: {
    type: Boolean,
    default: true
  }
});

// Emits
const emit = defineEmits(['start', 'pause', 'stop', 'reset', 'result']);

// 状态管理
const displayMode = ref('grid');
const isDrawing = ref(false);
const isFullscreen = ref(false);
const currentIndex = ref(0);
const winner = ref(null);
const prize = ref(null);
const animationSpeed = ref(100);
const animationTimer = ref(null);

// 计算属性
const isActive = (index) => {
  return isDrawing.value ? currentIndex.value === index : false;
};

const isWinner = (index) => {
  return winner.value && props.items[index] === winner.value;
};

// 3D球体项目样式
const getSphereItemStyle = (index) => {
  const total = props.items.length;
  const angle = (index / total) * Math.PI * 2;
  const radius = 150;
  const x = Math.cos(angle) * radius;
  const y = Math.sin(angle) * radius;
  
  return {
    transform: `translate(${x}px, ${y}px)`,
    transformOrigin: 'center center'
  };
};

// 开始抽奖
const startDraw = () => {
  if (props.items.length === 0) return;
  
  isDrawing.value = true;
  winner.value = null;
  prize.value = null;
  
  // 逐渐加速
  let speed = 200;
  const speedInterval = setInterval(() => {
    if (speed > 50) {
      speed -= 10;
      animationSpeed.value = speed;
    } else {
      clearInterval(speedInterval);
    }
  }, 100);
  
  // 开始滚动
  runAnimation();
  emit('start');
};

// 运行动画
const runAnimation = () => {
  if (!isDrawing.value) return;
  
  currentIndex.value = (currentIndex.value + 1) % props.items.length;
  
  animationTimer.value = setTimeout(runAnimation, animationSpeed.value);
};

// 暂停抽奖
const pauseDraw = () => {
  isDrawing.value = false;
  if (animationTimer.value) {
    clearTimeout(animationTimer.value);
  }
  emit('pause');
};

// 停止抽奖
const stopDraw = () => {
  isDrawing.value = false;
  if (animationTimer.value) {
    clearTimeout(animationTimer.value);
  }
  
  // 随机选择一个中奖者
  if (props.items.length > 0) {
    const winnerIndex = Math.floor(Math.random() * props.items.length);
    winner.value = props.items[winnerIndex];
    emit('result', { winner: winner.value });
  }
  
  emit('stop');
};

// 重置抽奖
const resetDraw = () => {
  isDrawing.value = false;
  if (animationTimer.value) {
    clearTimeout(animationTimer.value);
  }
  currentIndex.value = 0;
  winner.value = null;
  prize.value = null;
  animationSpeed.value = 100;
  emit('reset');
};

// 关闭结果
const closeResult = () => {
  winner.value = null;
  prize.value = null;
};

// 切换全屏
const toggleFullscreen = () => {
  isFullscreen.value = !isFullscreen.value;
};

// 清理定时器
onUnmounted(() => {
  if (animationTimer.value) {
    clearTimeout(animationTimer.value);
  }
});
</script>

<style scoped>
.lucky-draw-animation {
  position: relative;
  width: 100%;
  height: 100vh;
  overflow: hidden;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  transition: all 0.3s ease;
}

.lucky-draw-animation.fullscreen {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 9999;
}

/* 背景效果 */
.background-effect {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.particles {
  position: absolute;
  width: 4px;
  height: 4px;
  background: rgba(255, 255, 255, 0.6);
  border-radius: 50%;
  animation: float 6s ease-in-out infinite;
}

@keyframes float {
  0%, 100% {
    transform: translateY(0) scale(1);
    opacity: 0.6;
  }
  50% {
    transform: translateY(-20px) scale(1.2);
    opacity: 1;
  }
}

/* 抽奖容器 */
.draw-container {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 10;
}

/* 九宫格模式 */
.grid-mode {
  display: grid;
  grid-template-columns: repeat(3, 120px);
  grid-template-rows: repeat(3, 120px);
  gap: 10px;
}

.grid-item {
  background: rgba(255, 255, 255, 0.9);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.grid-item:hover {
  transform: scale(1.05);
}

.grid-item.active {
  background: #409EFF;
  color: white;
  transform: scale(1.1);
  box-shadow: 0 4px 16px rgba(64, 158, 255, 0.4);
}

.grid-item.winner {
  background: #67C23A;
  color: white;
  animation: winner-pulse 1s ease-in-out infinite;
}

@keyframes winner-pulse {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
}

/* 列表模式 */
.list-mode {
  width: 300px;
  max-height: 400px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

.list-item {
  display: flex;
  align-items: center;
  padding: 12px 20px;
  border-bottom: 1px solid #f0f0f0;
  transition: all 0.3s ease;
}

.list-item:last-child {
  border-bottom: none;
}

.list-item.active {
  background: #409EFF;
  color: white;
  font-weight: bold;
}

.list-item.winner {
  background: #67C23A;
  color: white;
  animation: winner-pulse 1s ease-in-out infinite;
}

/* 3D球体模式 */
.sphere-mode {
  position: relative;
  width: 400px;
  height: 400px;
}

.sphere {
  position: relative;
  width: 100%;
  height: 100%;
  transform-style: preserve-3d;
  animation: rotate 20s linear infinite;
}

@keyframes rotate {
  from {
    transform: rotateY(0deg);
  }
  to {
    transform: rotateY(360deg);
  }
}

.sphere-item {
  position: absolute;
  width: 80px;
  height: 80px;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  backface-visibility: hidden;
}

.sphere-item.active {
  background: #409EFF;
  color: white;
  transform: translate(var(--x), var(--y)) scale(1.2);
  box-shadow: 0 4px 16px rgba(64, 158, 255, 0.4);
}

.sphere-item.winner {
  background: #67C23A;
  color: white;
  animation: winner-pulse 1s ease-in-out infinite;
}

/* 项目内容 */
.item-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  margin-bottom: 8px;
  object-fit: cover;
}

.name {
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 80px;
}

/* 控制按钮 */
.controls {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 10px;
  z-index: 20;
  background: rgba(255, 255, 255, 0.9);
  padding: 10px 20px;
  border-radius: 25px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.mode-select {
  min-width: 120px;
}

/* 结果弹窗 */
.result-modal {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 30;
  animation: fade-in 0.3s ease;
}

@keyframes fade-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.result-content {
  background: white;
  border-radius: 16px;
  padding: 40px;
  text-align: center;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  animation: scale-in 0.3s ease;
}

@keyframes scale-in {
  from {
    transform: scale(0.8);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

.result-title {
  font-size: 24px;
  font-weight: bold;
  color: #303133;
  margin-bottom: 30px;
}

.winner-info {
  margin-bottom: 20px;
}

.winner-avatar {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  margin-bottom: 16px;
  border: 4px solid #67C23A;
}

.winner-name {
  font-size: 20px;
  font-weight: bold;
  color: #303133;
}

.prize-info {
  margin-bottom: 30px;
  padding: 20px;
  background: #f5f7fa;
  border-radius: 8px;
}

.prize-label {
  font-size: 14px;
  color: #909399;
  margin-bottom: 8px;
}

.prize-name {
  font-size: 18px;
  font-weight: bold;
  color: #303133;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .grid-mode {
    grid-template-columns: repeat(3, 80px);
    grid-template-rows: repeat(3, 80px);
    gap: 8px;
  }
  
  .list-mode {
    width: 250px;
    max-height: 350px;
  }
  
  .sphere-mode {
    width: 300px;
    height: 300px;
  }
  
  .sphere-item {
    width: 60px;
    height: 60px;
  }
  
  .controls {
    flex-wrap: wrap;
    justify-content: center;
  }
}
</style>