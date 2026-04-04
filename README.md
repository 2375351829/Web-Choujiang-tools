# 🎁 抽奖系统 (Lottery System)

一个功能完整、界面精美的现代化抽奖系统，支持多场景、多场次、实时展示等功能。

## ✨ 功能特性

### 核心功能
- 🎯 **多场景支持** - 预置校园、公司年会、社区活动、社团活动、班级活动、教职工、通用等多种场景
- 👥 **人员管理** - 支持人员导入、状态管理、黑名单、权重设置
- 🎁 **奖品管理** - 多等级奖品设置，支持图片上传
- 📋 **场次管理** - 灵活的场次配置，支持场次间数据隔离
- 🎰 **实时抽奖** - Socket.IO 实时通信，展示端同步动画效果
- 📊 **数据统计** - 抽奖结果记录与导出

### 技术特性
- 🚀 Vue 3 + TypeScript + Vite 现代化前端架构
- 🔌 Express + Socket.IO 实时通信后端
- 💾 SQLite 轻量级数据库，无需额外安装
- 🎨 Element Plus 美观的 UI 组件库
- 🎊 Canvas Confetti 抽奖动画特效
- 📱 响应式设计，适配多种屏幕尺寸

## 📁 项目结构

```
lottery-system/
├── admin/                 # 管理后台 (Vue 3 + Element Plus)
│   ├── src/
│   │   ├── api/          # API 接口
│   │   ├── components/   # 公共组件
│   │   ├── router/       # 路由配置
│   │   ├── views/        # 页面组件
│   │   └── utils/        # 工具函数
│   └── package.json
├── backend/               # 后端服务 (Express + Socket.IO)
│   ├── models/           # 数据模型
│   ├── routes/           # API 路由
│   ├── utils/            # 工具函数
│   ├── uploads/          # 上传文件目录
│   └── package.json
├── display/               # 展示端 (Vue 3)
│   ├── src/
│   │   ├── App.vue       # 主组件
│   │   └── main.ts       # 入口文件
│   └── package.json
├── monitor/               # 服务监控工具 (Python)
│   ├── monitor.py        # 监控脚本
│   └── monitor_config.json
└── docs/                  # 文档目录
    ├── architecture.md    # 架构文档
    ├── api.md            # API 文档
    ├── database.md       # 数据库文档
    └── deployment.md     # 部署文档
```

## 🚀 快速开始

### 环境要求

- Node.js >= 18.0.0
- npm >= 9.0.0
- Python >= 3.8 (可选，用于监控工具)

### 安装依赖

```bash
# 安装后端依赖
cd backend
npm install

# 安装管理后台依赖
cd ../admin
npm install

# 安装展示端依赖
cd ../display
npm install
```

### 启动服务

#### 方式一：使用监控工具（推荐）

```bash
cd monitor
python monitor.py
```

监控工具提供图形化界面，可以一键启动/停止所有服务。

#### 方式二：手动启动

```bash
# 终端1：启动后端服务
cd backend
npm run dev

# 终端2：启动管理后台
cd admin
npm run dev

# 终端3：启动展示端
cd display
npm run dev
```

### 访问地址

| 服务 | 地址 | 说明 |
|------|------|------|
| 后端 API | http://localhost:3000 | RESTful API 服务 |
| 管理后台 | http://localhost:5173 | 管理员操作界面 |
| 展示端 | http://localhost:5174 | 抽奖展示大屏 |

## 📖 使用指南

### 1. 场景配置

系统预置了多种场景模板，每个场景有独立的：
- 主题配色
- 参与人员
- 奖品设置
- 场次管理
- 自定义字段

### 2. 人员管理

- 支持手动添加或批量导入人员
- 可设置人员状态：正常、待审核、停用
- 支持黑名单功能
- 可设置中奖权重（权重越高，中奖概率越大）

### 3. 奖品管理

- 支持多等级奖品：特等奖、一等奖、二等奖、三等奖、参与奖
- 可上传奖品图片
- 设置奖品数量

### 4. 场次管理

- 创建抽奖场次
- 为场次分配参与人员和奖品
- 控制抽奖流程

### 5. 开始抽奖

1. 在管理后台选择当前场次
2. 点击"开始抽奖"按钮
3. 展示端实时显示抽奖动画
4. 点击"停止"确定中奖者
5. 系统自动记录中奖结果

## 🔧 配置说明

### 后端配置

后端配置文件位于 `backend/config.json`：

```json
{
  "title": "抽奖活动",
  "background_type": "gradient",
  "animation_type": "grid",
  "show_participants": true,
  "show_prizes": true,
  "show_winner": true
}
```

### 环境变量

后端支持以下环境变量：

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| PORT | 3000 | 服务端口 |

## 📚 文档

- [架构文档](docs/architecture.md) - 系统架构设计说明
- [API 文档](docs/api.md) - RESTful API 接口文档
- [数据库文档](docs/database.md) - 数据库表结构说明
- [部署文档](docs/deployment.md) - 生产环境部署指南

## 🛠️ 技术栈

### 前端
- Vue 3.5 - 渐进式 JavaScript 框架
- TypeScript 5.6 - 类型安全
- Vite 6.0 - 下一代前端构建工具
- Element Plus 2.8 - Vue 3 UI 组件库
- Pinia 3.0 - Vue 状态管理
- Vue Router 4.4 - 路由管理
- Tailwind CSS 3.4 - 原子化 CSS 框架
- Socket.IO Client 4.8 - 实时通信客户端
- Canvas Confetti 1.9 - 动画特效库

### 后端
- Express 4.18 - Web 应用框架
- Socket.IO 4.8 - 实时通信
- SQL.js 1.14 - SQLite 数据库
- Multer 1.4 - 文件上传处理
- CORS 2.8 - 跨域资源共享

### 工具
- Python 3 + Tkinter - 服务监控工具

## 📝 开发说明

### 构建生产版本

```bash
# 构建管理后台
cd admin
npm run build

# 构建展示端
cd display
npm run build
```

### 数据库

系统使用 SQLite 数据库，数据文件位于 `backend/database.db`。

数据库管理功能：
- 导出数据库文件
- 导入数据库文件
- 重置数据库

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License
