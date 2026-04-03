import express from 'express'
import { query, run, get } from '../models/database.js'

const router = express.Router()

// 开始抽奖
router.post('/start', async (req, res) => {
  try {
    const { session_id, prize_id } = req.body

    if (!session_id || !prize_id) {
      return res.status(400).json({ error: '场次ID和奖品ID不能为空' })
    }

    // 检查场次是否存在
    const session = await get('SELECT * FROM sessions WHERE id = ?', [session_id])
    if (!session) {
      return res.status(404).json({ error: '场次不存在' })
    }

    // 检查奖品是否存在
    const prize = await get('SELECT * FROM prizes WHERE id = ?', [prize_id])
    if (!prize) {
      return res.status(404).json({ error: '奖品不存在' })
    }

    // 检查奖品库存
    const drawnCount = await get(
      'SELECT COUNT(*) as count FROM draw_results WHERE session_id = ? AND prize_id = ?',
      [session_id, prize_id]
    )

    if (drawnCount.count >= prize.count) {
      return res.status(400).json({ error: '奖品库存不足' })
    }

    res.json({ success: true, message: '抽奖开始' })
  } catch (error) {
    console.error('开始抽奖失败:', error)
    res.status(500).json({ error: '开始抽奖失败' })
  }
})

// 暂停抽奖
router.post('/pause', async (req, res) => {
  try {
    res.json({ success: true, message: '抽奖暂停' })
  } catch (error) {
    console.error('暂停抽奖失败:', error)
    res.status(500).json({ error: '暂停抽奖失败' })
  }
})

// 停止抽奖
router.post('/stop', async (req, res) => {
  try {
    const { session_id, prize_id } = req.body

    if (!session_id || !prize_id) {
      return res.status(400).json({ error: '场次ID和奖品ID不能为空' })
    }

    // 获取可用的参与者
    const participants = await query(`
      SELECT p.* FROM participants p
      JOIN session_participants sp ON p.id = sp.participant_id
      WHERE sp.session_id = ? AND p.is_blacklisted = 0
      AND p.id NOT IN (
        SELECT participant_id FROM draw_results WHERE session_id = ? AND prize_id = ?
      )
    `, [session_id, session_id, prize_id])

    if (participants.length === 0) {
      return res.status(400).json({ error: '没有可用的参与者' })
    }

    // 计算总权重
    const totalWeight = participants.reduce((sum, p) => sum + p.weight, 0)

    // 加权随机选择
    let random = Math.random() * totalWeight
    let winner = null

    for (const participant of participants) {
      random -= participant.weight
      if (random <= 0) {
        winner = participant
        break
      }
    }

    // 如果没有选中（浮点精度问题），选择最后一个
    if (!winner) {
      winner = participants[participants.length - 1]
    }

    // 记录中奖结果
    const result = await run(
      'INSERT INTO draw_results (session_id, participant_id, prize_id) VALUES (?, ?, ?)',
      [session_id, winner.id, prize_id]
    )

    // 获取奖品信息
    const prize = await get('SELECT * FROM prizes WHERE id = ?', [prize_id])

    res.json({
      success: true,
      winner: {
        id: winner.id,
        name: winner.name,
        email: winner.email,
        phone: winner.phone
      },
      prize: {
        id: prize.id,
        name: prize.name,
        description: prize.description
      }
    })
  } catch (error) {
    console.error('停止抽奖失败:', error)
    res.status(500).json({ error: '停止抽奖失败' })
  }
})

// 重置抽奖
router.post('/reset', async (req, res) => {
  try {
    res.json({ success: true, message: '抽奖重置' })
  } catch (error) {
    console.error('重置抽奖失败:', error)
    res.status(500).json({ error: '重置抽奖失败' })
  }
})

// 获取抽奖状态
router.get('/status', async (req, res) => {
  try {
    res.json({ status: 'idle' })
  } catch (error) {
    console.error('获取抽奖状态失败:', error)
    res.status(500).json({ error: '获取抽奖状态失败' })
  }
})

export default router
