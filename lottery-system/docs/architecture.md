# 系统架构文档

## 概述

抽奖系统采用前后端分离架构，由三个主要模块组成：

1. **Backend** - 后端 API 服务
2. **Admin** - 管理后台前端
3. **Display** - 抽奖展示前端

此外还包含一个可选的 **Monitor** 服务监控工具。

## 系统架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                        用户界面层                                │
├─────────────────────────┬───────────────────────────────────────┤
│      Admin (管理后台)    │           Display (展示端)            │
│   Vue 3 + Element Plus  │        Vue 3 + Canvas Confetti       │
│   Port: 5173            │           Port: 5174                  │
└────────────┬────────────┴──────────────────┬────────────────────┘
             │                               │
             │    HTTP/REST + Socket.IO      │
             │                               │
┌────────────┴───────────────────────────────┴────────────────────┐
│                     Backend (后端服务)                          │
│                  Express + Socket.IO                           │
│                      Port: 3000                                │
├────────────────────────────────────────────────────────────────┤
│  Routes:                                                       │
│  ├── /api/scenes        场景管理                                │
│  ├── /api/participants  人员管理                                │
│  ├── /api/prizes        奖品管理                                │
│  ├── /api/sessions      场次管理                                │
│  ├── /api/console       抽奖控制                                │
│  ├── /api/config        系统配置                                │
│  ├── /api/upload        文件上传                                │
│  ├── /api/field-configs 字段配置                                │
│  └── /api/database      数据库管理                              │
├────────────────────────────────────────────────────────────────┤
│  Socket.IO Events:                                             │
│  ├── draw:start         开始抽奖                                │
│  ├── draw:result        抽奖结果                                │
│  ├── draw:pause         暂停抽奖                                │
│  ├── draw:reset         重置抽奖                                │
│  └── config:updated     配置更新                                │
└────────────────────────────┬───────────────────────────────────┘
                             │
┌────────────────────────────┴───────────────────────────────────┐
│                      数据持久层                                 │
│                     SQLite (sql.js)                            │
│                     database.db                                │
└────────────────────────────────────────────────────────────────┘
```

## 模块详解

### 1. Backend 后端服务

后端服务是整个系统的核心，提供 RESTful API 和 WebSocket 实时通信。

#### 技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| Express | 4.18 | Web 框架 |
| Socket.IO | 4.8 | 实时通信 |
| SQL.js | 1.14 | SQLite 数据库 |
| Multer | 1.4 | 文件上传 |
| CORS | 2.8 | 跨域支持 |

#### 目录结构

```
backend/
├── index.js              # 应用入口
├── config.json           # 系统配置
├── database.db           # SQLite 数据库文件
├── models/
│   └── database.js       # 数据库模型与初始化
├── routes/
│   ├── scenes.js         # 场景管理路由
│   ├── participants.js   # 人员管理路由
│   ├── prizes.js         # 奖品管理路由
│   ├── sessions.js       # 场次管理路由
│   ├── console.js        # 抽奖控制路由
│   ├── config.js         # 系统配置路由
│   ├── upload.js         # 文件上传路由
│   ├── fieldConfigs.js   # 字段配置路由
│   └── database.js       # 数据库管理路由
├── utils/
│   └── socket.js         # Socket.IO 工具
└── uploads/              # 上传文件存储
```

#### 核心功能

**数据库初始化流程**

```
启动应用
    │
    ▼
initDatabase()
    │
    ├── 加载/创建 SQLite 数据库
    │
    ├── 创建数据表
    │   ├── scenes (场景)
    │   ├── participants (人员)
    │   ├── prizes (奖品)
    │   ├── sessions (场次)
    │   ├── draw_results (抽奖结果)
    │   └── lottery_config (系统配置)
    │
    ├── 执行数据迁移
    │
    ├── 插入默认场景
    │
    ├── 插入默认字段配置
    │
    └── 插入测试数据（首次运行）
```

**Socket.IO 事件流**

```
┌──────────────┐                    ┌──────────────┐                    ┌──────────────┐
│    Admin     │                    │   Backend    │                    │   Display    │
└──────┬───────┘                    └──────┬───────┘                    └──────┬───────┘
       │                                   │                                   │
       │  POST /api/console/start          │                                   │
       │──────────────────────────────────>│                                   │
       │                                   │                                   │
       │                                   │  draw:start (broadcast)           │
       │                                   │──────────────────────────────────>│
       │                                   │                                   │
       │                                   │  [Display 播放滚动动画]            │
       │                                   │                                   │
       │  POST /api/console/stop           │                                   │
       │──────────────────────────────────>│                                   │
       │                                   │                                   │
       │                                   │  draw:result (broadcast)          │
       │                                   │──────────────────────────────────>│
       │                                   │                                   │
       │                                   │  [Display 显示中奖结果]            │
       │                                   │                                   │
```

### 2. Admin 管理后台

管理后台提供完整的后台管理功能，采用 Vue 3 + TypeScript 开发。

#### 技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| Vue | 3.5 | 前端框架 |
| TypeScript | 5.6 | 类型安全 |
| Vite | 6.0 | 构建工具 |
| Element Plus | 2.8 | UI 组件库 |
| Pinia | 3.0 | 状态管理 |
| Vue Router | 4.4 | 路由管理 |
| Tailwind CSS | 3.4 | 样式框架 |
| Socket.IO Client | 4.8 | 实时通信 |
| Axios | 1.7 | HTTP 客户端 |
| XLSX | 0.18 | Excel 导入导出 |

#### 目录结构

```
admin/
├── index.html            # HTML 入口
├── vite.config.ts        # Vite 配置
├── tailwind.config.js    # Tailwind 配置
├── tsconfig.json         # TypeScript 配置
├── src/
│   ├── main.ts           # 应用入口
│   ├── App.vue           # 根组件
│   ├── style.css         # 全局样式
│   ├── api/              # API 接口
│   │   ├── request.ts    # Axios 封装
│   │   ├── config.ts     # 配置 API
│   │   ├── scenes.ts     # 场景 API
│   │   ├── participants.ts # 人员 API
│   │   ├── prizes.ts     # 奖品 API
│   │   ├── sessions.ts   # 场次 API
│   │   ├── console.ts    # 控制台 API
│   │   ├── fieldConfigs.ts # 字段配置 API
│   │   └── database.ts   # 数据库 API
│   ├── components/       # 公共组件
│   │   └── SceneSwitcher.vue # 场景切换组件
│   ├── router/           # 路由配置
│   │   └── index.ts
│   ├── utils/            # 工具函数
│   │   └── template.ts
│   └── views/            # 页面组件
│       ├── Dashboard.vue     # 控制台
│       ├── Personnel.vue     # 人员信息管理
│       ├── Participants.vue  # 人员管理
│       ├── Prizes.vue        # 奖品管理
│       ├── Sessions.vue      # 场次管理
│       ├── SessionDetail.vue # 场次详情
│       ├── FieldConfig.vue   # 字段配置
│       ├── Config.vue        # 系统配置
│       └── Database.vue      # 数据库管理
```

#### 页面功能

| 页面 | 路由 | 功能描述 |
|------|------|----------|
| 控制台 | /dashboard | 抽奖控制、实时状态、快捷操作 |
| 人员信息管理 | /personnel | 跨场景人员信息查看与管理 |
| 人员管理 | /participants | 当前场景人员管理 |
| 奖品管理 | /prizes | 当前场景奖品管理 |
| 场次管理 | /sessions | 场次列表与创建 |
| 场次详情 | /sessions/:id | 场次配置、抽奖操作 |
| 字段配置 | /field-config | 自定义字段配置 |
| 系统配置 | /config | 主题、背景、动画配置 |
| 数据库管理 | /database | 数据库导入导出 |

### 3. Display 展示端

展示端用于大屏展示抽奖过程和结果，提供炫酷的动画效果。

#### 技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| Vue | 3.5 | 前端框架 |
| TypeScript | 5.6 | 类型安全 |
| Vite | 6.0 | 构建工具 |
| Tailwind CSS | 3.4 | 样式框架 |
| Socket.IO Client | 4.8 | 实时通信 |
| Canvas Confetti | 1.9 | 动画特效 |

#### 状态流转

```
┌─────────┐     draw:start      ┌──────────┐     draw:result     ┌─────────┐
│  idle   │ ─────────────────>  │ rolling  │ ─────────────────>  │ result  │
│ (等待)  │                     │ (滚动)   │                     │ (结果)  │
└─────────┘                     └──────────┘                     └─────────┘
     ▲                                                                │
     │                      draw:reset                                │
     └────────────────────────────────────────────────────────────────┘
```

#### 展示内容

- **统计信息** - 参与人数、奖品总数、已中奖人数
- **参与者名单** - 瀑布流滚动展示
- **奖品列表** - 奖品卡片展示，显示剩余数量
- **抽奖动画** - 名字滚动效果
- **中奖结果** - 中奖者展示 + 彩带特效
- **中奖记录** - 历史中奖记录

### 4. Monitor 监控工具

Python 编写的服务监控工具，提供图形化界面管理所有服务。

#### 功能特性

- 服务状态监控
- 一键启动/停止/重启
- 日志实时查看
- 日志搜索与导出
- 自动刷新状态

## 数据流

### 抽奖流程

```
1. 管理员选择场次
        │
        ▼
2. 配置参与人员和奖品
        │
        ▼
3. 点击"开始抽奖"
        │
        ├──> 后端广播 draw:start 事件
        │
        └──> 展示端开始滚动动画
                │
                ▼
4. 点击"停止抽奖"
        │
        ├──> 后端执行抽奖算法
        │        │
        │        ├── 过滤黑名单人员
        │        ├── 排除已中奖者（可配置）
        │        ├── 按权重随机选择
        │        └── 记录抽奖结果
        │
        ├──> 后端广播 draw:result 事件
        │
        └──> 展示端显示中奖结果 + 动画
```

### 场景切换流程

```
1. 管理员切换场景
        │
        ▼
2. 后端更新 lottery_config.current_scene_id
        │
        ▼
3. 后端广播 config:updated 事件
        │
        ▼
4. 前端更新显示内容
        │
        ├── 管理后台刷新数据
        └── 展示端更新主题和内容
```

## 安全考虑

### CORS 配置

后端配置了严格的 CORS 白名单：

```javascript
const allowedOrigins = [
  'http://localhost:5173',  // Admin
  'http://localhost:5174',  // Display
  'http://localhost:5175'   // 备用
]
```

### 文件上传

- 使用 Multer 处理文件上传
- 上传目录独立存放
- 文件类型验证（建议添加）

### 数据验证

- API 层参数验证
- 数据库约束保护

## 扩展性

### 添加新场景

1. 在数据库 scenes 表插入新场景
2. 配置场景专属字段（可选）
3. 添加场景预设数据（可选）

### 添加新 API

1. 在 `backend/routes/` 创建路由文件
2. 在 `backend/index.js` 导入并注册路由
3. 在前端 `admin/src/api/` 添加对应接口

### 自定义动画

展示端支持多种动画类型：

- `slot` - 老虎机滚动
- `grid` - 网格切换
- 可扩展自定义动画
