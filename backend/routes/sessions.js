import express from 'express'
import { query, run, get } from '../models/database.js'

const router = express.Router()

// 获取场次列表
router.get('/', async (req, res) => {
  try {
    const sessions = await query('SELECT * FROM sessions ORDER BY created_at DESC')
    res.json(sessions)
  } catch (error) {
    console.error('获取场次列表失败:', error)
    res.status(500).json({ error: '获取场次列表失败' })
  }
})

// 创建场次
router.post('/', async (req, res) => {
  try {
    const { name, description } = req.body

    if (!name) {
      return res.status(400).json({ error: '场次名称不能为空' })
    }

    const result = await run(
      'INSERT INTO sessions (name, description, status) VALUES (?, ?, ?)',
      [name, description, 0]
    )

    res.json({ id: result.lastID, name, description, status: 0 })
  } catch (error) {
    console.error('创建场次失败:', error)
    res.status(500).json({ error: '创建场次失败' })
  }
})

// 获取场次详情
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const session = await get('SELECT * FROM sessions WHERE id = ?', [id])

    if (!session) {
      return res.status(404).json({ error: '场次不存在' })
    }

    // 获取关联的参与者
    const participants = await query(
      'SELECT p.* FROM participants p JOIN session_participants sp ON p.id = sp.participant_id WHERE sp.session_id = ?',
      [id]
    )

    // 获取关联的奖品
    const prizes = await query(
      'SELECT pr.* FROM prizes pr JOIN session_prizes sp ON pr.id = sp.prize_id WHERE sp.session_id = ?',
      [id]
    )

    res.json({ ...session, participants, prizes })
  } catch (error) {
    console.error('获取场次详情失败:', error)
    res.status(500).json({ error: '获取场次详情失败' })
  }
})

// 更新场次
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { name, description, status } = req.body

    if (!name) {
      return res.status(400).json({ error: '场次名称不能为空' })
    }

    await run(
      'UPDATE sessions SET name = ?, description = ?, status = ? WHERE id = ?',
      [name, description, status, id]
    )

    const updatedSession = await get('SELECT * FROM sessions WHERE id = ?', [id])
    res.json(updatedSession)
  } catch (error) {
    console.error('更新场次失败:', error)
    res.status(500).json({ error: '更新场次失败' })
  }
})

// 删除场次
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params
    await run('DELETE FROM sessions WHERE id = ?', [id])
    res.json({ success: true })
  } catch (error) {
    console.error('删除场次失败:', error)
    res.status(500).json({ error: '删除场次失败' })
  }
})

// 关联参与者
router.post('/:id/participants', async (req, res) => {
  try {
    const { id } = req.params
    const { participant_ids } = req.body

    // 先删除现有关联
    await run('DELETE FROM session_participants WHERE session_id = ?', [id])

    // 添加新关联
    for (const participantId of participant_ids) {
      await run(
        'INSERT INTO session_participants (session_id, participant_id) VALUES (?, ?)',
        [id, participantId]
      )
    }

    res.json({ success: true })
  } catch (error) {
    console.error('关联参与者失败:', error)
    res.status(500).json({ error: '关联参与者失败' })
  }
})

// 关联奖品
router.post('/:id/prizes', async (req, res) => {
  try {
    const { id } = req.params
    const { prize_ids } = req.body

    // 先删除现有关联
    await run('DELETE FROM session_prizes WHERE session_id = ?', [id])

    // 添加新关联
    for (const prizeId of prize_ids) {
      await run(
        'INSERT INTO session_prizes (session_id, prize_id) VALUES (?, ?)',
        [id, prizeId]
      )
    }

    res.json({ success: true })
  } catch (error) {
    console.error('关联奖品失败:', error)
    res.status(500).json({ error: '关联奖品失败' })
  }
})

export default router
