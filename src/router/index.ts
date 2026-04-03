import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Dashboard',
    component: () => import('../views/Dashboard.vue'),
    meta: { title: '仪表盘' }
  },
  {
    path: '/participants',
    name: 'Participants',
    component: () => import('../views/Participants.vue'),
    meta: { title: '人员管理' }
  },
  {
    path: '/prizes',
    name: 'Prizes',
    component: () => import('../views/Prizes.vue'),
    meta: { title: '奖品管理' }
  },
  {
    path: '/sessions',
    name: 'Sessions',
    component: () => import('../views/Sessions.vue'),
    meta: { title: '场次管理' }
  },
  {
    path: '/sessions/:id',
    name: 'SessionDetail',
    component: () => import('../views/SessionDetail.vue'),
    meta: { title: '场次详情' }
  },
  {
    path: '/config',
    name: 'Config',
    component: () => import('../views/Config.vue'),
    meta: { title: '系统配置' }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  document.title = `${to.meta.title} - 抽奖系统管理后台`
  next()
})

export default router
