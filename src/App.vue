<template>
  <div class="app">
    <el-container class="min-h-screen">
      <el-aside width="200px" class="bg-white border-r">
        <div class="logo p-4 text-center font-bold text-xl text-primary">
          抽奖系统
        </div>
        <el-menu
          :default-active="activeMenu"
          class="border-0"
          router
          @select="handleMenuSelect"
        >
          <el-menu-item index="/">
            <template #icon>
              <el-icon><i class="el-icon-s-home"></i></el-icon>
            </template>
            仪表盘
          </el-menu-item>
          <el-menu-item index="/participants">
            <template #icon>
              <el-icon><i class="el-icon-user"></i></el-icon>
            </template>
            人员管理
          </el-menu-item>
          <el-menu-item index="/prizes">
            <template #icon>
              <el-icon><i class="el-icon-gift"></i></el-icon>
            </template>
            奖品管理
          </el-menu-item>
          <el-menu-item index="/sessions">
            <template #icon>
              <el-icon><i class="el-icon-date"></i></el-icon>
            </template>
            场次管理
          </el-menu-item>
          <el-menu-item index="/config">
            <template #icon>
              <el-icon><i class="el-icon-setting"></i></el-icon>
            </template>
            系统配置
          </el-menu-item>
        </el-menu>
      </el-aside>
      <el-container>
        <el-header class="bg-white border-b flex items-center justify-between px-4">
          <h1 class="text-lg font-medium">{{ pageTitle }}</h1>
          <div class="flex items-center gap-4">
            <el-button type="primary" size="small">
              <el-icon><i class="el-icon-refresh"></i></el-icon>
              刷新
            </el-button>
          </div>
        </el-header>
        <el-main class="p-4">
          <router-view v-slot="{ Component }">
            <transition name="fade" mode="out-in">
              <component :is="Component" />
            </transition>
          </router-view>
        </el-main>
      </el-container>
    </el-container>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

const activeMenu = computed(() => {
  return route.path
})

const pageTitle = computed(() => {
  return route.meta.title as string || '抽奖系统'
})

const handleMenuSelect = (key: string, keyPath: string[]) => {
  console.log('Selected menu:', key, keyPath)
}
</script>

<style scoped>
.app {
  height: 100vh;
  overflow: hidden;
}

.el-header {
  height: 60px;
  line-height: 60px;
}

.el-menu {
  border-right: none;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
