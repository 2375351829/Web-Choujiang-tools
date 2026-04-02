<template>
  <el-container class="app-container">
    <el-aside width="200px" class="sidebar">
      <div class="logo">
        <h1>{{ appTitle }}</h1>
      </div>
      <el-menu
        default-active="console"
        class="el-menu-vertical-demo"
        @select="handleMenuSelect"
      >
        <el-menu-item index="console">
          <el-icon><Setting /></el-icon>
          <span>控制台操作</span>
        </el-menu-item>
        <el-menu-item index="animation">
          <el-icon><MagicStick /></el-icon>
          <span>抽奖动画</span>
        </el-menu-item>
        <el-menu-item index="users">
          <el-icon><User /></el-icon>
          <span>人员管理</span>
        </el-menu-item>
        <el-menu-item index="prizes">
          <el-icon><Gift /></el-icon>
          <span>奖品管理</span>
        </el-menu-item>
        <el-menu-item index="combinations">
          <el-icon><Collection /></el-icon>
          <span>抽奖组合配置</span>
        </el-menu-item>
        <el-menu-item index="config">
          <el-icon><Brush /></el-icon>
          <span>系统配置</span>
        </el-menu-item>
      </el-menu>
    </el-aside>
    <el-container>
      <el-header class="header">
        <div class="header-title">{{ currentPageTitle }}</div>
      </el-header>
      <el-main class="main-content">
        <component :is="currentComponent" />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { Setting, User, Gift, Collection, MagicStick, Brush } from '@element-plus/icons-vue';
import ConsolePage from './components/ConsolePage.vue';
import AnimationPage from './components/AnimationPage.vue';
import UsersPage from './components/UsersPage.vue';
import PrizesPage from './components/PrizesPage.vue';
import CombinationsPage from './components/CombinationsPage.vue';
import ConfigPage from './components/ConfigPage.vue';

// 状态管理
const currentPage = ref('console');
let socket = null;

// 应用标题
const appTitle = computed(() => {
  const savedConfig = localStorage.getItem('appConfig');
  if (savedConfig) {
    const config = JSON.parse(savedConfig);
    return config.title || '抽奖管理系统';
  }
  return '抽奖管理系统';
});

// 计算属性
const currentComponent = computed(() => {
  const components = {
    console: ConsolePage,
    animation: AnimationPage,
    users: UsersPage,
    prizes: PrizesPage,
    combinations: CombinationsPage,
    config: ConfigPage
  };
  return components[currentPage.value] || ConsolePage;
});

const currentPageTitle = computed(() => {
  const titles = {
    console: '控制台操作',
    animation: '抽奖动画',
    users: '人员管理',
    prizes: '奖品管理',
    combinations: '抽奖组合配置',
    config: '系统配置管理'
  };
  return titles[currentPage.value] || '控制台操作';
});

// 菜单选择处理
const handleMenuSelect = (key) => {
  currentPage.value = key;
};

// 初始化Socket.io连接
onMounted(() => {
  // 连接到Socket.io服务器
  socket = io('http://localhost:3002');
  
  // 监听连接成功
  socket.on('connect', () => {
    console.log('Socket.io连接成功');
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
</script>

<style scoped>
.app-container {
  height: 100vh;
  display: flex;
  flex-direction: row;
}

.sidebar {
  background-color: #303133;
  color: #fff;
  width: 200px;
  transition: all 0.3s ease;
}

.logo {
  padding: 20px;
  text-align: center;
  border-bottom: 1px solid #409EFF;
}

.logo h1 {
  font-size: 18px;
  margin: 0;
  color: #409EFF;
}

.el-menu-vertical-demo {
  border-right: none;
}

.el-menu-item {
  color: #fff;
}

.el-menu-item.is-active {
  background-color: #409EFF !important;
}

.header {
  background-color: #fff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  padding: 0 20px;
}

.header-title {
  font-size: 18px;
  font-weight: bold;
  color: #303133;
}

.main-content {
  padding: 20px;
  background-color: #f5f7fa;
  flex: 1;
  overflow-y: auto;
}

/* 响应式布局 */
@media screen and (max-width: 768px) {
  .app-container {
    flex-direction: column;
  }
  
  .sidebar {
    width: 100%;
    height: auto;
  }
  
  .logo h1 {
    font-size: 16px;
  }
  
  .el-menu {
    display: flex;
    flex-direction: row;
    overflow-x: auto;
  }
  
  .el-menu-item {
    white-space: nowrap;
  }
  
  .main-content {
    padding: 10px;
  }
}

@media screen and (max-width: 480px) {
  .header {
    padding: 0 10px;
  }
  
  .header-title {
    font-size: 16px;
  }
  
  .main-content {
    padding: 5px;
  }
}

/* 配色方案 */
:deep(body[data-color-scheme="default"]) .el-menu-item.is-active {
  background-color: #409EFF !important;
}

:deep(body[data-color-scheme="blue"]) .el-menu-item.is-active {
  background-color: #1890ff !important;
}

:deep(body[data-color-scheme="green"]) .el-menu-item.is-active {
  background-color: #52c41a !important;
}

:deep(body[data-color-scheme="purple"]) .el-menu-item.is-active {
  background-color: #722ed1 !important;
}

/* 背景图透明度 */
:deep(body) {
  transition: all 0.3s ease;
}

:deep(body[data-color-scheme="default"]) {
  background-color: #f5f7fa;
}

:deep(body[data-color-scheme="blue"]) {
  background-color: #e6f7ff;
}

:deep(body[data-color-scheme="green"]) {
  background-color: #f6ffed;
}

:deep(body[data-color-scheme="purple"]) {
  background-color: #f9f0ff;
}
</style>