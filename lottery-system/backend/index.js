import express from 'express'
import http from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const app = express()
const server = http.createServer(app)
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175'],
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
})

app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175'],
  credentials: true
}))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))

if (!fs.existsSync(path.join(__dirname, 'uploads'))) {
  fs.mkdirSync(path.join(__dirname, 'uploads'))
}

import { initDatabase } from './models/database.js'
import participantsRouter from './routes/participants.js'
import prizesRouter from './routes/prizes.js'
import sessionsRouter from './routes/sessions.js'
import consoleRouter, { setupSocketIO } from './routes/console.js'
import configRouter from './routes/config.js'
import uploadRouter from './routes/upload.js'
import scenesRouter from './routes/scenes.js'
import fieldConfigsRouter from './routes/fieldConfigs.js'
import databaseRouter from './routes/database.js'

setupSocketIO(io)

app.use('/api/scenes', scenesRouter)
app.use('/api/participants', participantsRouter)
app.use('/api/prizes', prizesRouter)
app.use('/api/sessions', sessionsRouter)
app.use('/api/console', consoleRouter)
app.use('/api/config', configRouter)
app.use('/api/upload', uploadRouter)
app.use('/api/field-configs', fieldConfigsRouter)
app.use('/api/database', databaseRouter)

app.get('/health', (req, res) => {
  res.json({ status: 'ok' })
})

app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({ error: err.message || '服务器内部错误' })
})

const PORT = process.env.PORT || 3000

const startServer = async () => {
  await initDatabase()
  server.listen(PORT, () => {
    console.log(`服务器运行在 http://localhost:${PORT}`)
  })
}

startServer()
