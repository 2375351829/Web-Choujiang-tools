import express from 'express'
import { query, run, get } from '../models/database.js'
import { setIO, broadcast } from '../utils/socket.js'

const router = express.Router()

export function setupSocketIO(socketIO) {
  setIO(socketIO)
  const io = socketIO

  io.on('connection', (socket) => {
    console.log('客户端连接:', socket.id)

    socket.on('display:join', ({ sessionId }) => {
      if (sessionId) {
        socket.join(`session-${sessionId}`)
        console.log(`展示端加入场次 ${sessionId}`)
      }
    })

    socket.on('display:status', (data) => {
      socket.broadcast.emit('display:statusUpdate', {
        connected: true,
        sessionId: data.currentSessionId,
        lastActivity: new Date().toISOString()
      })
    })

    socket.on('config:update', (data) => {
      console.log('收到配置更新:', data)
      broadcast('config:updated', data)
    })

    socket.on('draw:start', (data) => {
      console.log('收到抽奖开始:', data)
      broadcast('draw:start', data)
    })

    socket.on('draw:result', (data) => {
      console.log('收到抽奖结果:', data)
      broadcast('draw:result', data)
    })

    socket.on('disconnect', () => {
      console.log('客户端断开:', socket.id)
    })
  })
}

router.post('/start', async (req, res) => {
  try {
    const { session_id, prize_id, prize_name, prize_level } = req.body

    if (!session_id) {
      return res.status(400).json({ error: 'session_id不能为空' })
    }

    const session = await get('SELECT * FROM sessions WHERE id = ?', [session_id])
    if (!session) {
      return res.status(404).json({ error: '场次不存在' })
    }

    broadcast('draw:start', {
      session_id: Number(session_id),
      prize_id: prize_id ? Number(prize_id) : null,
      prize_name: prize_name || '未知奖品',
      prize_level: prize_level || '',
      timestamp: Date.now()
    })

    res.json({ success: true, message: '抽奖动画已开始' })
  } catch (error) {
    console.error('开始抽奖失败:', error)
    res.status(500).json({ error: '开始抽奖失败' })
  }
})

router.post('/stop', async (req, res) => {
  try {
    const { session_id, prize_id, count = 1, allow_repeat = false } = req.body

    if (!session_id || !prize_id) {
      return res.status(400).json({ error: 'session_id和prize_id不能为空' })
    }

    const sessionPrize = await get(
      'SELECT * FROM session_prizes WHERE session_id = ? AND prize_id = ?',
      [session_id, prize_id]
    )

    if (!sessionPrize) {
      return res.status(400).json({ error: '该奖品未添加到场次' })
    }

    const drawnCount = await get(
      'SELECT COUNT(*) as count FROM draw_results WHERE session_id = ? AND prize_id = ?',
      [session_id, prize_id]
    )

    const remaining = sessionPrize.quantity - drawnCount.count
    if (remaining <= 0) {
      return res.status(400).json({ error: '该奖品已经抽完' })
    }

    const actualCount = Math.min(count, remaining)

    let participantsQuery = `
      SELECT p.* FROM participants p
      JOIN session_participants sp ON p.id = sp.participant_id
      WHERE sp.session_id = ? AND p.is_blacklisted = 0
    `
    const queryParams = [session_id]

    if (!allow_repeat) {
      participantsQuery += ` AND p.id NOT IN (
        SELECT participant_id FROM draw_results WHERE session_id = ? AND prize_id = ?
      )`
      queryParams.push(session_id, prize_id)
    }

    const participants = await query(participantsQuery, queryParams)

    if (participants.length === 0) {
      return res.status(400).json({ error: '没有可参与抽奖的人员' })
    }

    const winners = []
    const remainingParticipants = [...participants]
    
    for (let i = 0; i < actualCount && remainingParticipants.length > 0; i++) {
      const totalWeight = remainingParticipants.reduce((sum, p) => sum + (p.weight || 1), 0)
      let random = Math.random() * totalWeight
      let winnerIndex = remainingParticipants.length - 1

      for (let j = 0; j < remainingParticipants.length; j++) {
        random -= (remainingParticipants[j].weight || 1)
        if (random <= 0) {
          winnerIndex = j
          break
        }
      }

      const winner = remainingParticipants.splice(winnerIndex, 1)[0]
      
      await run(
        'INSERT INTO draw_results (session_id, participant_id, prize_id) VALUES (?, ?, ?)',
        [session_id, winner.id, prize_id]
      )

      await run(
        'UPDATE participants SET status = ? WHERE id = ?',
        ['已中奖', winner.id]
      )

      winners.push({
        id: winner.id,
        name: winner.name,
        email: winner.email,
        phone: winner.phone,
        avatar: winner.avatar
      })
    }

    await run(
      'UPDATE sessions SET status = ? WHERE id = ?',
      ['进行中', session_id]
    )

    const prize = await get('SELECT * FROM prizes WHERE id = ?', [prize_id])

    const result = {
      winners,
      prize: {
        id: prize.id,
        name: prize.name,
        description: prize.description,
        image_url: prize.image_url,
        level: prize.level
      },
      timestamp: Date.now()
    }

    broadcast('draw:result', result)

    res.json({
      success: true,
      winners,
      prize: { id: prize.id, name: prize.name, level: prize.level }
    })
  } catch (error) {
    console.error('停止抽奖失败:', error)
    res.status(500).json({ error: '停止抽奖失败' })
  }
})

router.post('/pause', (req, res) => {
  broadcast('draw:pause')
  res.json({ success: true, message: '抽奖已暂停' })
})

router.post('/reset', (req, res) => {
  broadcast('draw:reset')
  res.json({ success: true, message: '抽奖已重置' })
})

export default router
