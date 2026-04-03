import express from 'express'
import { query, run, get } from '../models/database.js'
import multer from 'multer'
import XLSX from 'xlsx'
import fs from 'fs'

const router = express.Router()
const upload = multer({ dest: 'uploads/' })

// 获取参与者列表
router.get('/', async (req, res) => {
  try {
    const { search, is_blacklisted } = req.query
    let sql = 'SELECT * FROM participants WHERE 1=1'
    const params = []

    if (search) {
      sql += ' AND (name LIKE ? OR email LIKE ?)'
      params.push(`%${search}%`, `%${search}%`)
    }

    if (is_blacklisted !== undefined) {
      sql += ' AND is_blacklisted = ?'
      params.push(is_blacklisted)
    }

    sql += ' ORDER BY created_at DESC'
    const participants = await query(sql, params)
    res.json(participants)
  } catch (error) {
    console.error('获取参与者列表失败:', error)
    res.status(500).json({ error: '获取参与者列表失败' })
  }
})

// 创建参与者
router.post('/', async (req, res) => {
  try {
    const { name, email, phone, weight, is_blacklisted } = req.body

    if (!name) {
      return res.status(400).json({ error: '姓名不能为空' })
    }

    // 检查邮箱是否已存在
    if (email) {
      const existing = await get('SELECT * FROM participants WHERE email = ?', [email])
      if (existing) {
        return res.status(400).json({ error: '邮箱已存在' })
      }
    }

    const result = await run(
      'INSERT INTO participants (name, email, phone, weight, is_blacklisted) VALUES (?, ?, ?, ?, ?)',
      [name, email, phone, weight || 1, is_blacklisted || 0]
    )

    res.json({ id: result.lastID, name, email, phone, weight: weight || 1, is_blacklisted: is_blacklisted || 0 })
  } catch (error) {
    console.error('创建参与者失败:', error)
    res.status(500).json({ error: '创建参与者失败' })
  }
})

// 更新参与者
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { name, email, phone, weight, is_blacklisted } = req.body

    if (!name) {
      return res.status(400).json({ error: '姓名不能为空' })
    }

    // 检查邮箱是否已存在（排除当前参与者）
    if (email) {
      const existing = await get('SELECT * FROM participants WHERE email = ? AND id != ?', [email, id])
      if (existing) {
        return res.status(400).json({ error: '邮箱已存在' })
      }
    }

    await run(
      'UPDATE participants SET name = ?, email = ?, phone = ?, weight = ?, is_blacklisted = ? WHERE id = ?',
      [name, email, phone, weight || 1, is_blacklisted || 0, id]
    )

    res.json({ id: Number(id), name, email, phone, weight: weight || 1, is_blacklisted: is_blacklisted || 0 })
  } catch (error) {
    console.error('更新参与者失败:', error)
    res.status(500).json({ error: '更新参与者失败' })
  }
})

// 删除参与者
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params
    await run('DELETE FROM participants WHERE id = ?', [id])
    res.json({ success: true })
  } catch (error) {
    console.error('删除参与者失败:', error)
    res.status(500).json({ error: '删除参与者失败' })
  }
})

// 批量导入参与者
router.post('/import', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '请选择文件' })
    }

    const workbook = XLSX.readFile(req.file.path)
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    const data = XLSX.utils.sheet_to_json(worksheet)

    let successCount = 0
    let skipCount = 0

    for (const row of data) {
      if (row.name) {
        // 检查邮箱是否已存在
        if (row.email) {
          const existing = await get('SELECT * FROM participants WHERE email = ?', [row.email])
          if (existing) {
            skipCount++
            continue
          }
        }

        await run(
          'INSERT INTO participants (name, email, phone, weight, is_blacklisted) VALUES (?, ?, ?, ?, ?)',
          [row.name, row.email, row.phone, row.weight || 1, 0]
        )
        successCount++
      } else {
        skipCount++
      }
    }

    // 删除临时文件
    fs.unlinkSync(req.file.path)

    res.json({ success: true, successCount, skipCount })
  } catch (error) {
    console.error('批量导入参与者失败:', error)
    res.status(500).json({ error: '批量导入参与者失败' })
  }
})

// 加入/移出黑名单
router.put('/:id/blacklist', async (req, res) => {
  try {
    const { id } = req.params
    const { is_blacklisted } = req.body

    await run('UPDATE participants SET is_blacklisted = ? WHERE id = ?', [is_blacklisted, id])
    res.json({ success: true, is_blacklisted })
  } catch (error) {
    console.error('更新黑名单状态失败:', error)
    res.status(500).json({ error: '更新黑名单状态失败' })
  }
})

export default router
