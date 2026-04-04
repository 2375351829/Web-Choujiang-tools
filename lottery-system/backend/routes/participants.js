import express from 'express'
import { query, run, get } from '../models/database.js'
import multer from 'multer'
import XLSX from 'xlsx'
import fs from 'fs'

const router = express.Router()
const upload = multer({ dest: 'uploads/' })

const toNull = (value) => value === undefined ? null : value

const getParticipantExtendedData = async (participantId) => {
  const extendedData = await query(
    'SELECT field_key, field_value FROM participant_extended_data WHERE participant_id = ?',
    [participantId]
  )
  const result = {}
  extendedData.forEach(item => {
    try {
      result[item.field_key] = JSON.parse(item.field_value)
    } catch {
      result[item.field_key] = item.field_value
    }
  })
  return result
}

const saveExtendedData = async (participantId, extendedData) => {
  if (!extendedData || typeof extendedData !== 'object') return
  
  for (const [key, value] of Object.entries(extendedData)) {
    const jsonValue = typeof value === 'object' ? JSON.stringify(value) : String(value || '')
    await run(
      `INSERT OR REPLACE INTO participant_extended_data (participant_id, field_key, field_value, updated_at) VALUES (?, ?, ?, datetime('now'))`,
      [participantId, key, jsonValue]
    )
  }
}

router.get('/', async (req, res) => {
  try {
    const { search, is_blacklisted, status, scene_id, with_extended } = req.query
    let sql = `SELECT p.* FROM participants p WHERE 1=1`
    const params = []

    if (scene_id) {
      sql += ' AND p.scene_id = ?'
      params.push(scene_id)
    }

    if (search) {
      sql += ' AND (p.name LIKE ? OR p.email LIKE ? OR p.phone LIKE ?)'
      params.push(`%${search}%`, `%${search}%`, `%${search}%`)
    }

    if (is_blacklisted !== undefined) {
      sql += ' AND p.is_blacklisted = ?'
      params.push(is_blacklisted)
    }

    if (status) {
      sql += ' AND p.status = ?'
      params.push(status)
    }

    sql += ' ORDER BY p.created_at DESC'
    let participants = await query(sql, params)
    
    participants = participants.map((p, index) => ({
      ...p,
      rowNum: index + 1
    }))
    
    if (with_extended === 'true') {
      participants = await Promise.all(participants.map(async (p) => ({
        ...p,
        extended_data: await getParticipantExtendedData(p.id)
      })))
    }
    
    res.json(participants)
  } catch (error) {
    console.error('获取参与者列表失败:', error)
    res.status(500).json({ error: '获取参与者列表失败' })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const participant = await get('SELECT * FROM participants WHERE id = ?', [id])
    
    if (!participant) {
      return res.status(404).json({ error: '人员不存在' })
    }
    
    const extended_data = await getParticipantExtendedData(id)
    res.json({ ...participant, extended_data })
  } catch (error) {
    console.error('获取参与者详情失败:', error)
    res.status(500).json({ error: '获取参与者详情失败' })
  }
})

router.post('/', async (req, res) => {
  try {
    const { name, email, phone, weight, is_blacklisted, scene_id, status, extended_data } = req.body

    if (!name || !name.trim()) {
      return res.status(400).json({ error: '姓名不能为空' })
    }

    if (name.length > 50) {
      return res.status(400).json({ error: '姓名最大长度为50字符' })
    }

    if (email) {
      if (!email.includes('@')) {
        return res.status(400).json({ error: '邮箱格式不正确' })
      }
      const existing = await get('SELECT * FROM participants WHERE email = ? AND scene_id = ?', [email, scene_id])
      if (existing) {
        return res.status(400).json({ error: '邮箱已存在' })
      }
    }

    if (phone) {
      const existing = await get('SELECT * FROM participants WHERE phone = ? AND scene_id = ?', [phone, scene_id])
      if (existing) {
        return res.status(400).json({ error: '电话号码已存在' })
      }
    }

    const validStatus = ['正常', '停用', '待审核']
    const finalStatus = validStatus.includes(status) ? status : '待审核'
    
    const finalWeight = Math.min(100, Math.max(1, weight || 50))

    const result = await run(
      'INSERT INTO participants (name, email, phone, weight, is_blacklisted, scene_id, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [name.trim(), toNull(email), toNull(phone), finalWeight, is_blacklisted ? 1 : 0, toNull(scene_id), finalStatus]
    )

    if (extended_data) {
      await saveExtendedData(result.lastID, extended_data)
    }

    const participant = await get('SELECT * FROM participants WHERE id = ?', [result.lastID])
    res.status(201).json({ 
      ...participant, 
      extended_data: extended_data || {},
      message: '创建成功'
    })
  } catch (error) {
    console.error('创建参与者失败:', error)
    res.status(500).json({ error: '创建参与者失败' })
  }
})

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { name, email, phone, weight, is_blacklisted, status, extended_data } = req.body

    const existingParticipant = await get('SELECT * FROM participants WHERE id = ?', [id])
    if (!existingParticipant) {
      return res.status(404).json({ error: '人员不存在' })
    }

    if (!name || !name.trim()) {
      return res.status(400).json({ error: '姓名不能为空' })
    }

    if (name.length > 50) {
      return res.status(400).json({ error: '姓名最大长度为50字符' })
    }

    if (email) {
      if (!email.includes('@')) {
        return res.status(400).json({ error: '邮箱格式不正确' })
      }
      const existing = await get('SELECT * FROM participants WHERE email = ? AND id != ? AND scene_id = ?', [email, id, existingParticipant.scene_id])
      if (existing) {
        return res.status(400).json({ error: '邮箱已存在' })
      }
    }

    if (phone) {
      const existing = await get('SELECT * FROM participants WHERE phone = ? AND id != ? AND scene_id = ?', [phone, id, existingParticipant.scene_id])
      if (existing) {
        return res.status(400).json({ error: '电话号码已存在' })
      }
    }

    const validStatus = ['正常', '停用', '待审核']
    const finalStatus = validStatus.includes(status) ? status : existingParticipant.status
    
    const finalWeight = Math.min(100, Math.max(1, weight || existingParticipant.weight))

    await run(
      'UPDATE participants SET name = ?, email = ?, phone = ?, weight = ?, is_blacklisted = ?, status = ? WHERE id = ?',
      [name.trim(), toNull(email), toNull(phone), finalWeight, is_blacklisted ? 1 : 0, finalStatus, id]
    )

    if (extended_data !== undefined) {
      await run('DELETE FROM participant_extended_data WHERE participant_id = ?', [id])
      await saveExtendedData(Number(id), extended_data)
    }

    const participant = await get('SELECT * FROM participants WHERE id = ?', [id])
    const savedExtendedData = await getParticipantExtendedData(Number(id))
    
    res.json({ 
      ...participant, 
      extended_data: savedExtendedData,
      message: '更新成功'
    })
  } catch (error) {
    console.error('更新参与者失败:', error)
    res.status(500).json({ error: '更新参与者失败' })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params
    
    await run('DELETE FROM participant_extended_data WHERE participant_id = ?', [id])
    await run('DELETE FROM session_participants WHERE participant_id = ?', [id])
    await run('DELETE FROM participants WHERE id = ?', [id])
    
    res.json({ success: true, message: '删除成功' })
  } catch (error) {
    console.error('删除参与者失败:', error)
    res.status(500).json({ error: '删除参与者失败' })
  }
})

router.put('/:id/status', async (req, res) => {
  try {
    const { id } = req.params
    const { status } = req.body

    const validStatus = ['正常', '停用', '待审核']
    if (!validStatus.includes(status)) {
      return res.status(400).json({ error: '无效的状态值' })
    }

    await run('UPDATE participants SET status = ? WHERE id = ?', [status, id])
    res.json({ success: true, status, message: '状态更新成功' })
  } catch (error) {
    console.error('更新状态失败:', error)
    res.status(500).json({ error: '更新状态失败' })
  }
})

router.put('/:id/blacklist', async (req, res) => {
  try {
    const { id } = req.params
    const { is_blacklisted } = req.body

    await run('UPDATE participants SET is_blacklisted = ? WHERE id = ?', [is_blacklisted ? 1 : 0, id])
    res.json({ success: true, is_blacklisted: !!is_blacklisted, message: is_blacklisted ? '已加入黑名单' : '已移出黑名单' })
  } catch (error) {
    console.error('更新黑名单状态失败:', error)
    res.status(500).json({ error: '更新黑名单状态失败' })
  }
})

router.get('/template/:sceneId', async (req, res) => {
  try {
    const { sceneId } = req.params
    
    const fieldConfigs = await query(
      'SELECT field_key, field_name, field_type, required, placeholder FROM scene_field_configs WHERE scene_id = ? ORDER BY sort_order ASC',
      [sceneId]
    )
    
    const headers = ['姓名', '邮箱', '电话', '状态', '权重']
    const sampleData = ['张三', 'zhangsan@example.com', '+8613800138001', '待审核', '50']
    
    fieldConfigs.forEach(f => {
      headers.push(f.field_name)
      sampleData.push(f.placeholder || '')
    })
    
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.aoa_to_sheet([headers, sampleData])
    
    const colWidths = headers.map((h, i) => ({ wch: Math.max(h.length * 2, 15) }))
    ws['!cols'] = colWidths
    
    XLSX.utils.book_append_sheet(wb, ws, '人员导入模板')
    
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', `attachment; filename=personnel_template_${Date.now()}.xlsx`)
    res.send(buffer)
  } catch (error) {
    console.error('生成模板失败:', error)
    res.status(500).json({ error: '生成模板失败' })
  }
})

router.post('/import', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '请选择文件' })
    }

    const { scene_id } = req.body

    const workbook = XLSX.readFile(req.file.path)
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    const data = XLSX.utils.sheet_to_json(worksheet)

    let successCount = 0
    let skipCount = 0
    const errors = []

    const fieldConfigs = await query(
      'SELECT field_key, field_name FROM scene_field_configs WHERE scene_id = ?',
      [scene_id]
    )
    const extendedFieldKeys = fieldConfigs.map(f => f.field_key)

    for (const row of data) {
      const name = row.name || row['姓名'] || row.Name
      if (!name) {
        skipCount++
        continue
      }

      const email = row.email || row['邮箱'] || row.Email
      const phone = row.phone || row['电话'] || row.Phone
      const weight = row.weight || row['权重'] || row.Weight || 50
      const status = row.status || row['状态'] || row.Status || '待审核'

      if (email) {
        const existing = await get('SELECT * FROM participants WHERE email = ? AND scene_id = ?', [email, scene_id])
        if (existing) {
          errors.push(`邮箱 ${email} 已存在`)
          skipCount++
          continue
        }
      }

      const result = await run(
        'INSERT INTO participants (name, email, phone, weight, is_blacklisted, scene_id, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [name, toNull(email), toNull(phone), weight, 0, toNull(scene_id), status]
      )

      const extended_data = {}
      extendedFieldKeys.forEach(key => {
        const value = row[key] || row[fieldConfigs.find(f => f.field_key === key)?.field_name]
        if (value !== undefined) {
          extended_data[key] = value
        }
      })

      if (Object.keys(extended_data).length > 0) {
        await saveExtendedData(result.lastID, extended_data)
      }

      successCount++
    }

    fs.unlinkSync(req.file.path)

    res.json({ 
      success: true, 
      successCount, 
      skipCount,
      errors: errors.slice(0, 10),
      message: `导入完成：成功 ${successCount} 条，跳过 ${skipCount} 条`
    })
  } catch (error) {
    console.error('批量导入参与者失败:', error)
    res.status(500).json({ error: '批量导入参与者失败' })
  }
})

router.post('/export', async (req, res) => {
  try {
    const { scene_id, ids } = req.body
    
    let sql = `SELECT p.* FROM participants p WHERE 1=1`
    const params = []
    
    if (scene_id) {
      sql += ' AND p.scene_id = ?'
      params.push(scene_id)
    }
    
    if (ids && ids.length > 0) {
      sql += ` AND p.id IN (${ids.map(() => '?').join(',')})`
      params.push(...ids)
    }
    
    const participants = await query(sql, params)
    
    const fieldConfigs = await query(
      'SELECT field_key, field_name FROM scene_field_configs WHERE scene_id = ?',
      [scene_id]
    )
    
    const exportData = await Promise.all(participants.map(async (p) => {
      const extended = await getParticipantExtendedData(p.id)
      const row = {
        ID: p.id,
        姓名: p.name,
        邮箱: p.email,
        电话: p.phone,
        状态: p.status,
        黑名单: p.is_blacklisted ? '是' : '否',
        权重: p.weight
      }
      
      fieldConfigs.forEach(f => {
        row[f.field_name] = extended[f.field_key] || ''
      })
      
      return row
    }))
    
    res.json(exportData)
  } catch (error) {
    console.error('导出参与者失败:', error)
    res.status(500).json({ error: '导出参与者失败' })
  }
})

router.post('/batch-delete', async (req, res) => {
  try {
    const { ids } = req.body
    
    if (!ids || ids.length === 0) {
      return res.status(400).json({ error: '请选择要删除的人员' })
    }
    
    const placeholders = ids.map(() => '?').join(',')
    
    await run(`DELETE FROM participant_extended_data WHERE participant_id IN (${placeholders})`, ids)
    await run(`DELETE FROM session_participants WHERE participant_id IN (${placeholders})`, ids)
    await run(`DELETE FROM participants WHERE id IN (${placeholders})`, ids)
    
    res.json({ success: true, count: ids.length, message: `成功删除 ${ids.length} 条记录` })
  } catch (error) {
    console.error('批量删除失败:', error)
    res.status(500).json({ error: '批量删除失败' })
  }
})

router.post('/batch-status', async (req, res) => {
  try {
    const { ids, status } = req.body
    
    if (!ids || ids.length === 0) {
      return res.status(400).json({ error: '请选择要操作的人员' })
    }
    
    const validStatus = ['正常', '停用', '待审核']
    if (!validStatus.includes(status)) {
      return res.status(400).json({ error: '无效的状态值' })
    }
    
    const placeholders = ids.map(() => '?').join(',')
    await run(`UPDATE participants SET status = ? WHERE id IN (${placeholders})`, [status, ...ids])
    
    res.json({ success: true, count: ids.length, message: `成功更新 ${ids.length} 条记录状态` })
  } catch (error) {
    console.error('批量更新状态失败:', error)
    res.status(500).json({ error: '批量更新状态失败' })
  }
})

export default router
