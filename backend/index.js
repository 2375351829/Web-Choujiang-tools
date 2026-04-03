import express from 'express'
import http from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// 创建Express应用
const app = express()

// 配置中间件
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))

// 创建HTTP服务器
const server = http.createServer(app)

// 创建Socket.io服务器
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
})

// 初始化数据库
import { initDatabase } from './models/database.js'
initDatabase()

// 导入路由
import participantsRouter from './routes/participants.js'
import prizesRouter from './routes/prizes.js'
import sessionsRouter from './routes/sessions.js'
import consoleRouter from './routes/console.js'
import configRouter from './routes/config.js'
import uploadRouter from './routes/upload.js'

// 注册路由
app.use('/api/participants', participantsRouter)
app.use('/api/prizes', prizesRouter)
app.use('/api/sessions', sessionsRouter)
app.use('/api/console', consoleRouter)
app.use('/api/config', configRouter)
app.use('/api/upload', uploadRouter)

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok' })
})

// Socket.io事件处理
io.on('connection', (socket) => {
  console.log('新连接:', socket.id)

  // 抽奖事件
  socket.on('draw:start', (data) => {
    console.log('开始抽奖:', data)
    io.emit('draw:start', data)
  })

  socket.on('draw:pause', (data) => {
    console.log('暂停抽奖:', data)
    io.emit('draw:pause', data)
  })

  socket.on('draw:stop', (data) => {
    console.log('停止抽奖:', data)
    io.emit('draw:stop', data)
  })

  socket.on('draw:result', (data) => {
    console.log('抽奖结果:', data)
    io.emit('draw:result', data)
  })

  socket.on('draw:reset', (data) => {
    console.log('重置抽奖:', data)
    io.emit('draw:reset', data)
  })

  socket.on('disconnect', () => {
    console.log('连接断开:', socket.id)
  })
})

// 创建uploads目录
if (!fs.existsSync(path.join(__dirname, 'uploads'))) {
  fs.mkdirSync(path.join(__dirname, 'uploads'))
}

// 启动服务器
const PORT = process.env.PORT || 3000
server.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`)
})
