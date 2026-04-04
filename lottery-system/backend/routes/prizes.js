import express from 'express'
import { query, run, get } from '../models/database.js'

const router = express.Router()

const toNull = (value) => value === undefined ? null : value

router.get('/', async (req, res) => {
  try {
    const { scene_id } = req.query
    let sql = 'SELECT * FROM prizes WHERE 1=1'
    const params = []

    if (scene_id) {
      sql += ' AND scene_id = ?'
      params.push(scene_id)
    }

    sql += ' ORDER BY created_at DESC'
    const prizes = await query(sql, params)
    res.json(prizes)
  } catch (error) {
    console.error('获取奖品列表失败:', error)
    res.status(500).json({ error: '获取奖品列表失败' })
  }
})

router.post('/', async (req, res) => {
  try {
    const { name, description, image_url, count, level, scene_id } = req.body

    if (!name) {
      return res.status(400).json({ error: '奖品名称不能为空' })
    }

    const result = await run(
      'INSERT INTO prizes (name, description, image_url, count, level, scene_id) VALUES (?, ?, ?, ?, ?, ?)',
      [name, toNull(description), toNull(image_url), count || 1, toNull(level) || '三等奖', toNull(scene_id)]
    )

    res.json({ 
      id: result.lastID, 
      name, 
      description, 
      image_url, 
      count: count || 1, 
      level: level || '三等奖',
      scene_id
    })
  } catch (error) {
    console.error('创建奖品失败:', error)
    res.status(500).json({ error: '创建奖品失败' })
  }
})

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { name, description, image_url, count, level } = req.body

    if (!name) {
      return res.status(400).json({ error: '奖品名称不能为空' })
    }

    await run(
      'UPDATE prizes SET name = ?, description = ?, image_url = ?, count = ?, level = ? WHERE id = ?',
      [name, toNull(description), toNull(image_url), count || 1, toNull(level) || '三等奖', id]
    )

    res.json({ 
      id: Number(id), 
      name, 
      description, 
      image_url, 
      count: count || 1, 
      level: level || '三等奖' 
    })
  } catch (error) {
    console.error('更新奖品失败:', error)
    res.status(500).json({ error: '更新奖品失败' })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params
    await run('DELETE FROM prizes WHERE id = ?', [id])
    res.json({ success: true })
  } catch (error) {
    console.error('删除奖品失败:', error)
    res.status(500).json({ error: '删除奖品失败' })
  }
})

export default router
