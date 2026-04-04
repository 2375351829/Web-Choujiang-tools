import express from 'express'
import { query, run, get } from '../models/database.js'
import { broadcast } from '../utils/socket.js'

const router = express.Router()

router.get('/', async (req, res) => {
  try {
    const config = await get('SELECT * FROM lottery_config WHERE id = 1')
    res.json(config || {
      id: 1,
      current_scene_id: null,
      background_type: 'gradient',
      background_image: '',
      background_color: '#0f172a',
      gradient_start: '#667eea',
      gradient_end: '#764ba2',
      gradient_degree: 135,
      show_participants: 1,
      show_prizes: 1,
      show_winner: 1,
      carousel_speed: 3000,
      title: '抽奖活动',
      animation_type: 'grid',
      current_session_id: null,
      theme: 'dark',
      layout_config: '{}'
    })
  } catch (error) {
    console.error('获取配置失败:', error)
    res.status(500).json({ error: '获取配置失败' })
  }
})

router.put('/', async (req, res) => {
  try {
    const fields = req.body
    const allowedFields = [
      'background_type', 'background_image', 'background_color',
      'gradient_start', 'gradient_end', 'gradient_degree',
      'show_participants', 'show_prizes', 'show_winner',
      'carousel_speed', 'title', 'animation_type',
      'current_session_id', 'theme', 'layout_config'
    ]
    
    const updates = []
    const values = []
    
    for (const [key, value] of Object.entries(fields)) {
      if (allowedFields.includes(key)) {
        updates.push(`${key} = ?`)
        values.push(value)
      }
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: '没有要更新的字段' })
    }
    
    values.push(1)
    await run(`UPDATE lottery_config SET ${updates.join(', ')} WHERE id = ?`, values)
    
    const config = await get('SELECT * FROM lottery_config WHERE id = 1')
    
    broadcast('config:updated', config)
    
    res.json(config)
  } catch (error) {
    console.error('更新配置失败:', error)
    res.status(500).json({ error: '更新配置失败' })
  }
})

export default router
