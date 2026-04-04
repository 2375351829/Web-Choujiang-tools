<template>
  <el-container class="layout-container">
    <el-aside width="200px" class="sidebar">
      <div class="logo">
        <h2>抽奖系统</h2>
      </div>
      <el-menu
        :default-active="activeMenu"
        router
        background-color="#304156"
        text-color="#bfcbd9"
        active-text-color="#409EFF"
      >
        <el-menu-item index="/dashboard">
          <el-icon><Odometer /></el-icon>
          <span>控制台</span>
        </el-menu-item>
        <el-menu-item index="/personnel">
          <el-icon><User /></el-icon>
          <span>人员信息管理</span>
        </el-menu-item>
        <el-menu-item index="/participants">
          <el-icon><User /></el-icon>
          <span>人员管理</span>
        </el-menu-item>
        <el-menu-item index="/prizes">
          <el-icon><Present /></el-icon>
          <span>奖品管理</span>
        </el-menu-item>
        <el-menu-item index="/sessions">
          <el-icon><List /></el-icon>
          <span>场次管理</span>
        </el-menu-item>
        <el-menu-item index="/field-config">
          <el-icon><Setting /></el-icon>
          <span>字段配置</span>
        </el-menu-item>
        <el-menu-item index="/config">
          <el-icon><Setting /></el-icon>
          <span>系统配置</span>
        </el-menu-item>
        <el-menu-item index="/database">
          <el-icon><Coin /></el-icon>
          <span>数据库管理</span>
        </el-menu-item>
      </el-menu>
    </el-aside>
    <el-container>
      <el-header class="header">
        <div class="header-left">
          <SceneSwitcher v-model="currentSceneId" @change="onSceneChange" />
        </div>
        <div class="header-right">
          <el-tag :type="isConnected ? 'success' : 'danger'" size="small">
            {{ isConnected ? '已连接' : '未连接' }}
          </el-tag>
        </div>
      </el-header>
      <el-main class="main">
        <router-view :scene-id="currentSceneId" />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, provide } from 'vue'
import { useRoute } from 'vue-router'
import { io } from 'socket.io-client'
import SceneSwitcher from './components/SceneSwitcher.vue'
import { getConfig } from './api/config'

const route = useRoute()
const activeMenu = computed(() => route.path)
const isConnected = ref(false)
const currentSceneId = ref<number | null>(null)
const isInitialized = ref(false)
let socket: any = null

provide('sceneId', currentSceneId)
provide('isInitialized', isInitialized)

const onSceneChange = (scene: any) => {
  console.log('场景切换:', scene)
}

const loadInitialConfig = async () => {
  try {
    const config = await getConfig()
    if (config.current_scene_id) {
      currentSceneId.value = config.current_scene_id
    }
    isInitialized.value = true
  } catch (error) {
    console.error('加载配置失败:', error)
    isInitialized.value = true
  }
}

onMounted(async () => {
  await loadInitialConfig()
  
  socket = io('http://localhost:3000', { path: '/socket.io' })
  socket.on('connect', () => { isConnected.value = true })
  socket.on('disconnect', () => { isConnected.value = false })
})

onUnmounted(() => {
  if (socket) socket.disconnect()
})
</script>

<style scoped>
.layout-container {
  height: 100vh;
}

.sidebar {
  background-color: #304156;
}

.logo {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 18px;
  font-weight: bold;
  border-bottom: 1px solid #3a4a5e;
}

.logo h2 {
  margin: 0;
  font-size: 18px;
}

.header {
  background-color: #fff;
  border-bottom: 1px solid #e6e6e6;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
}

.header-left {
  display: flex;
  align-items: center;
}

.header-right {
  display: flex;
  align-items: center;
}

.main {
  background-color: #f5f5f5;
  padding: 20px;
}
</style>
