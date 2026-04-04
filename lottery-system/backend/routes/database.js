import express from 'express'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { query, run } from '../models/database.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const router = express.Router()
const dbPath = path.join(__dirname, '../database.db')

router.get('/tables', async (req, res) => {
  try {
    const tables = await query(
      "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
    )
    res.json(tables.map(t => t.name))
  } catch (error) {
    console.error('获取表列表失败:', error)
    res.status(500).json({ error: '获取表列表失败' })
  }
})

router.get('/table/:name', async (req, res) => {
  try {
    const { name } = req.params
    const { page = 1, pageSize = 50 } = req.query
    const offset = (Number(page) - 1) * Number(pageSize)
    
    const validTable = await query(
      "SELECT name FROM sqlite_master WHERE type='table' AND name = ?",
      [name]
    )
    
    if (validTable.length === 0) {
      return res.status(404).json({ error: '表不存在' })
    }
    
    const columns = await query(`PRAGMA table_info(${name})`)
    const countResult = await query(`SELECT COUNT(*) as count FROM ${name}`)
    const total = countResult[0]?.count || 0
    
    const rows = await query(`SELECT * FROM ${name} LIMIT ? OFFSET ?`, [Number(pageSize), offset])
    
    res.json({
      columns: columns.map(c => ({
        name: c.name,
        type: c.type,
        notnull: c.notnull,
        pk: c.pk
      })),
      rows,
      total,
      page: Number(page),
      pageSize: Number(pageSize)
    })
  } catch (error) {
    console.error('获取表数据失败:', error)
    res.status(500).json({ error: '获取表数据失败' })
  }
})

router.post('/execute', async (req, res) => {
  try {
    const { sql } = req.body
    
    if (!sql || !sql.trim()) {
      return res.status(400).json({ error: 'SQL语句不能为空' })
    }
    
    const upperSql = sql.trim().toUpperCase()
    const isSelect = upperSql.startsWith('SELECT') || upperSql.startsWith('PRAGMA') || upperSql.startsWith('EXPLAIN')
    
    if (isSelect) {
      const results = await query(sql)
      res.json({ type: 'select', results })
    } else {
      const result = await run(sql)
      res.json({ 
        type: 'modify', 
        lastID: result.lastID, 
        changes: result.changes,
        message: `影响 ${result.changes} 行`
      })
    }
  } catch (error) {
    console.error('执行SQL失败:', error)
    res.status(400).json({ error: error.message || '执行SQL失败' })
  }
})

router.get('/export', (req, res) => {
  try {
    if (!fs.existsSync(dbPath)) {
      return res.status(404).json({ error: '数据库文件不存在' })
    }
    
    const stat = fs.statSync(dbPath)
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    
    res.setHeader('Content-Type', 'application/octet-stream')
    res.setHeader('Content-Disposition', `attachment; filename=lottery-backup-${timestamp}.db`)
    res.setHeader('Content-Length', stat.size)
    
    const fileStream = fs.createReadStream(dbPath)
    fileStream.pipe(res)
  } catch (error) {
    console.error('导出数据库失败:', error)
    res.status(500).json({ error: '导出数据库失败' })
  }
})

router.post('/import', (req, res) => {
  try {
    const { backup } = req.body
    
    if (!backup) {
      return res.status(400).json({ error: '没有提供数据库数据' })
    }
    
    const buffer = Buffer.from(backup, 'base64')
    
    if (buffer.length < 16) {
      return res.status(400).json({ error: '无效的数据库文件' })
    }
    
    const header = buffer.slice(0, 16).toString('ascii')
    if (!header.startsWith('SQLite format 3')) {
      return res.status(400).json({ error: '不是有效的SQLite数据库文件' })
    }
    
    const backupPath = dbPath + '.backup.' + Date.now()
    if (fs.existsSync(dbPath)) {
      fs.copyFileSync(dbPath, backupPath)
    }
    
    fs.writeFileSync(dbPath, buffer)
    
    res.json({ 
      success: true, 
      message: '数据库导入成功，请重启服务器以生效',
      backupPath
    })
  } catch (error) {
    console.error('导入数据库失败:', error)
    res.status(500).json({ error: '导入数据库失败' })
  }
})

router.get('/schema', async (req, res) => {
  try {
    const tables = await query(
      "SELECT name, sql FROM sqlite_master WHERE type='table' ORDER BY name"
    )
    res.json(tables)
  } catch (error) {
    console.error('获取数据库结构失败:', error)
    res.status(500).json({ error: '获取数据库结构失败' })
  }
})

router.get('/info', (req, res) => {
  try {
    if (!fs.existsSync(dbPath)) {
      return res.json({ exists: false })
    }
    
    const stat = fs.statSync(dbPath)
    res.json({
      exists: true,
      size: stat.size,
      created: stat.birthtime,
      modified: stat.mtime,
      path: dbPath
    })
  } catch (error) {
    console.error('获取数据库信息失败:', error)
    res.status(500).json({ error: '获取数据库信息失败' })
  }
})

export default router
