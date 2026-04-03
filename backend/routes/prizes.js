import express from 'express'
import { query, run, get } from '../models/database.js'
import multer from 'multer'
import fs from 'fs'
import path from 'path'

const router = express.Router()

// 配置文件上传
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/')
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname)
    cb(null, Date.now() + ext)
  }
})

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif']
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('只允许上传jpg/png/gif格式的图片'), false)
    }
  }
})

// 获取奖品列表
router.get('/', async (req, res) => {
  try {
    const prizes = await query('SELECT * FROM prizes ORDER BY created_at DESC')
    res.json(prizes)
  } catch (error) {
    console.error('获取奖品列表失败:', error)
    res.status(500).json({ error: '获取奖品列表失败' })
  }
})

// 创建奖品
router.post('/', async (req, res) => {
  try {
    const { name, description, count } = req.body

    if (!name) {
      return res.status(400).json({ error: '奖品名称不能为空' })
    }

    const result = await run(
      'INSERT INTO prizes (name, description, image_url, count) VALUES (?, ?, ?, ?)',
      [name, description, '', count || 1]
    )

    res.json({ id: result.lastID, name, description, image_url: '', count: count || 1 })
  } catch (error) {
    console.error('创建奖品失败:', error)
    res.status(500).json({ error: '创建奖品失败' })
  }
})

// 更新奖品
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { name, description, count } = req.body

    if (!name) {
      return res.status(400).json({ error: '奖品名称不能为空' })
    }

    await run(
      'UPDATE prizes SET name = ?, description = ?, count = ? WHERE id = ?',
      [name, description, count || 1, id]
    )

    const updatedPrize = await get('SELECT * FROM prizes WHERE id = ?', [id])
    res.json(updatedPrize)
  } catch (error) {
    console.error('更新奖品失败:', error)
    res.status(500).json({ error: '更新奖品失败' })
  }
})

// 删除奖品
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

// 上传奖品图片
router.post('/:id/upload', upload.single('image'), async (req, res) => {
  try {
    const { id } = req.params

    if (!req.file) {
      return res.status(400).json({ error: '请选择图片' })
    }

    const imageUrl = `/uploads/${req.file.filename}`
    await run('UPDATE prizes SET image_url = ? WHERE id = ?', [imageUrl, id])

    res.json({ success: true, image_url: imageUrl })
  } catch (error) {
    console.error('上传奖品图片失败:', error)
    res.status(500).json({ error: '上传奖品图片失败' })
  }
})

export default router
