<template>
  <el-card class="console-card">
    <template #header>
      <div class="card-header">
        <span>控制台操作</span>
      </div>
    </template>
    
    <el-form :model="form" label-width="80px" class="console-form">
      <el-form-item label="场次ID">
        <el-input v-model="form.sessionId" placeholder="请输入场次ID"></el-input>
      </el-form-item>
      <el-form-item label="奖品ID">
        <el-input v-model="form.prizeId" placeholder="请输入奖品ID"></el-input>
      </el-form-item>
      
      <el-form-item>
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
      </el-form-item>
    </el-form>
    
    <el-card class="status-card">
      <template #header>
        <div class="card-header">
          <span>当前状态</span>
        </div>
      </template>
      <el-descriptions :column="1" border>
        <el-descriptions-item label="状态">
          <el-tag :type="isDrawing ? 'success' : 'info'">
            {{ isDrawing ? '抽奖中' : '已停止' }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="当前场次" v-if="currentSessionId">
          {{ currentSessionId }}
        </el-descriptions-item>
      </el-descriptions>
    </el-card>
    
    <el-card class="result-card" v-if="winner">
      <template #header>
        <div class="card-header">
          <span>抽奖结果</span>
        </div>
      </template>
      <el-descriptions :column="1" border>
        <el-descriptions-item label="中奖者">
          <el-tag type="success">{{ winner.name }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="邮箱">{{ winner.email }}</el-descriptions-item>
        <el-descriptions-item label="电话">{{ winner.phone }}</el-descriptions-item>
        <el-descriptions-item label="奖品">{{ prize.name }}</el-descriptions-item>
      </el-descriptions>
    </el-card>
    <el-card class="result-card" v-else>
      <template #header>
        <div class="card-header">
          <span>抽奖结果</span>
        </div>
      </template>
      <div class="empty-result">
        <el-empty description="等待抽奖..."></el-empty>
      </div>
    </el-card>
  </el-card>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { VideoPlay, VideoPause, VideoStop, Refresh } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';

// 状态管理
const form = ref({
  sessionId: '',
  prizeId: ''
});
const isDrawing = ref(false);
const currentSessionId = ref(null);
const winner = ref(null);
const prize = ref({});
let socket = null;

// 初始化Socket.io连接
onMounted(() => {
  // 连接到Socket.io服务器
  socket = io('http://localhost:3002');
  
  // 监听连接成功
  socket.on('connect', () => {
    console.log('Socket.io连接成功');
  });
  
  // 监听控制台状态
  socket.on('console:status', (status) => {
    currentSessionId.value = status.currentSessionId;
    isDrawing.value = status.isDrawing;
  });
  
  // 监听抽奖开始
  socket.on('draw:start', (data) => {
    currentSessionId.value = data.session_id;
    isDrawing.value = true;
    console.log('抽奖开始:', data);
  });
  
  // 监听抽奖暂停
  socket.on('draw:pause', () => {
    isDrawing.value = false;
    console.log('抽奖暂停');
  });
  
  // 监听抽奖停止
  socket.on('draw:stop', () => {
    isDrawing.value = false;
    console.log('抽奖停止');
  });
  
  // 监听抽奖重置
  socket.on('draw:reset', () => {
    currentSessionId.value = null;
    isDrawing.value = false;
    winner.value = null;
    prize.value = {};
    console.log('抽奖重置');
  });
  
  // 监听抽奖结果
  socket.on('draw:result', (data) => {
    winner.value = data.winner;
    prize.value = data.prize;
    console.log('抽奖结果:', data);
  });
  
  // 监听连接错误
  socket.on('connect_error', (error) => {
    console.error('Socket.io连接错误:', error);
  });
});

// 断开Socket.io连接
onUnmounted(() => {
  if (socket) {
    socket.disconnect();
  }
});

// 开始抽奖
const startDraw = async () => {
  if (!form.value.sessionId || !form.value.prizeId) {
    ElMessage.warning('请输入场次ID和奖品ID');
    return;
  }
  
  try {
    const response = await fetch('/api/console/start', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        session_id: form.value.sessionId,
        prize_id: form.value.prizeId
      })
    });
    
    const data = await response.json();
    console.log('开始抽奖:', data);
  } catch (error) {
    console.error('开始抽奖失败:', error);
    ElMessage.error('开始抽奖失败');
  }
};

// 暂停抽奖
const pauseDraw = async () => {
  try {
    const response = await fetch('/api/console/pause', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    console.log('暂停抽奖:', data);
  } catch (error) {
    console.error('暂停抽奖失败:', error);
    ElMessage.error('暂停抽奖失败');
  }
};

// 停止抽奖
const stopDraw = async () => {
  try {
    const response = await fetch('/api/console/stop', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    console.log('停止抽奖:', data);
  } catch (error) {
    console.error('停止抽奖失败:', error);
    ElMessage.error('停止抽奖失败');
  }
};

// 重置抽奖
const resetDraw = async () => {
  try {
    const response = await fetch('/api/console/reset', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    console.log('重置抽奖:', data);
  } catch (error) {
    console.error('重置抽奖失败:', error);
    ElMessage.error('重置抽奖失败');
  }
};
</script>

<style scoped>
.console-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.console-form {
  margin-bottom: 20px;
}

.status-card,
.result-card {
  margin-top: 20px;
}

.empty-result {
  padding: 40px 0;
  text-align: center;
}
</style>