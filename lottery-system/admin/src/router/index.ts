import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  { path: '/', redirect: '/dashboard' },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: () => import('../views/Dashboard.vue'),
    meta: { title: '控制台' }
  },
  {
    path: '/personnel',
    name: 'Personnel',
    component: () => import('../views/Personnel.vue'),
    meta: { title: '人员信息管理' }
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
    path: '/field-config',
    name: 'FieldConfig',
    component: () => import('../views/FieldConfig.vue'),
    meta: { title: '字段配置' }
  },
  {
    path: '/config',
    name: 'Config',
    component: () => import('../views/Config.vue'),
    meta: { title: '系统配置' }
  },
  {
    path: '/database',
    name: 'Database',
    component: () => import('../views/Database.vue'),
    meta: { title: '数据库管理' }
  }
]

const router = createRouter({
  history: createWebHistory('/admin'),
  routes
})

export default router
