import express from 'express'
import { query, run, get } from '../models/database.js'
import { broadcast } from '../utils/socket.js'

const router = express.Router()

const toNull = (value) => value === undefined ? null : value

router.get('/', async (req, res) => {
  try {
    const scenes = await query('SELECT * FROM scenes ORDER BY is_default DESC, created_at ASC')
    res.json(scenes)
  } catch (error) {
    console.error('获取场景列表失败:', error)
    res.status(500).json({ error: '获取场景列表失败' })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const scene = await get('SELECT * FROM scenes WHERE id = ?', [id])
    
    if (!scene) {
      return res.status(404).json({ error: '场景不存在' })
    }
    
    res.json(scene)
  } catch (error) {
    console.error('获取场景详情失败:', error)
    res.status(500).json({ error: '获取场景详情失败' })
  }
})

router.post('/', async (req, res) => {
  try {
    const { name, code, icon, description, title, gradient_start, gradient_end, background_color } = req.body

    if (!name || !code) {
      return res.status(400).json({ error: '场景名称和代码不能为空' })
    }

    const existing = await get('SELECT * FROM scenes WHERE code = ?', [code])
    if (existing) {
      return res.status(400).json({ error: '场景代码已存在' })
    }

    const result = await run(
      `INSERT INTO scenes (name, code, icon, description, title, gradient_start, gradient_end, background_color) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, code, icon || '🎁', toNull(description), title || name, gradient_start || '#667eea', gradient_end || '#764ba2', background_color || '#0f172a']
    )

    const scene = await get('SELECT * FROM scenes WHERE id = ?', [result.lastID])
    res.status(201).json(scene)
  } catch (error) {
    console.error('创建场景失败:', error)
    res.status(500).json({ error: '创建场景失败' })
  }
})

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { name, icon, description, title, gradient_start, gradient_end, background_color, theme, animation_type } = req.body

    await run(
      `UPDATE scenes SET name = ?, icon = ?, description = ?, title = ?, gradient_start = ?, gradient_end = ?, background_color = ?, theme = ?, animation_type = ? WHERE id = ?`,
      [name, icon || '🎁', toNull(description), title || name, gradient_start || '#667eea', gradient_end || '#764ba2', background_color || '#0f172a', theme || 'dark', animation_type || 'slot', id]
    )

    const scene = await get('SELECT * FROM scenes WHERE id = ?', [id])
    res.json(scene)
  } catch (error) {
    console.error('更新场景失败:', error)
    res.status(500).json({ error: '更新场景失败' })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params
    
    const scene = await get('SELECT * FROM scenes WHERE id = ?', [id])
    if (scene?.is_default) {
      return res.status(400).json({ error: '默认场景不能删除' })
    }
    
    await run('DELETE FROM scenes WHERE id = ?', [id])
    res.json({ success: true })
  } catch (error) {
    console.error('删除场景失败:', error)
    res.status(500).json({ error: '删除场景失败' })
  }
})

router.post('/switch/:id', async (req, res) => {
  try {
    const { id } = req.params
    
    const scene = await get('SELECT * FROM scenes WHERE id = ?', [id])
    if (!scene) {
      return res.status(404).json({ error: '场景不存在' })
    }
    
    await run('UPDATE lottery_config SET current_scene_id = ?, title = ?, gradient_start = ?, gradient_end = ?, background_color = ?, theme = ?, animation_type = ? WHERE id = 1',
      [id, scene.title, scene.gradient_start, scene.gradient_end, scene.background_color, scene.theme, scene.animation_type])
    
    const config = await get('SELECT * FROM lottery_config WHERE id = 1')
    
    broadcast('config:updated', config)
    
    res.json({ success: true, scene })
  } catch (error) {
    console.error('切换场景失败:', error)
    res.status(500).json({ error: '切换场景失败' })
  }
})

router.get('/:id/stats', async (req, res) => {
  try {
    const { id } = req.params
    
    const participants = await get('SELECT COUNT(*) as count FROM participants WHERE scene_id = ?', [id])
    const prizes = await get('SELECT COUNT(*) as count FROM prizes WHERE scene_id = ?', [id])
    const sessions = await get('SELECT COUNT(*) as count FROM sessions WHERE scene_id = ?', [id])
    
    res.json({
      participants: participants.count,
      prizes: prizes.count,
      sessions: sessions.count
    })
  } catch (error) {
    console.error('获取场景统计失败:', error)
    res.status(500).json({ error: '获取场景统计失败' })
  }
})

export default router
