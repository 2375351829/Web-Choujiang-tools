import express from 'express'
import { query, run, get } from '../models/database.js'

const router = express.Router()

router.get('/scene/:sceneId', async (req, res) => {
  try {
    const { sceneId } = req.params
    const fields = await query(
      'SELECT * FROM scene_field_configs WHERE scene_id = ? ORDER BY sort_order ASC',
      [sceneId]
    )
    
    const parsedFields = fields.map(field => ({
      ...field,
      required: !!field.required,
      options: field.options ? JSON.parse(field.options) : null
    }))
    
    res.json(parsedFields)
  } catch (error) {
    console.error('获取场景字段配置失败:', error)
    res.status(500).json({ error: '获取场景字段配置失败' })
  }
})

router.post('/scene/:sceneId', async (req, res) => {
  try {
    const { sceneId } = req.params
    const { field_key, field_name, field_type, required, placeholder, default_value, validation_rule, options, sort_order } = req.body

    if (!field_key || !field_name) {
      return res.status(400).json({ error: '字段标识和字段名称不能为空' })
    }

    const existing = await get(
      'SELECT * FROM scene_field_configs WHERE scene_id = ? AND field_key = ?',
      [sceneId, field_key]
    )
    if (existing) {
      return res.status(400).json({ error: '字段标识已存在' })
    }

    const result = await run(
      `INSERT INTO scene_field_configs (scene_id, field_key, field_name, field_type, required, placeholder, default_value, validation_rule, options, sort_order) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [sceneId, field_key, field_name, field_type || 'text', required ? 1 : 0, placeholder || '', default_value || '', validation_rule || '', options ? JSON.stringify(options) : '', sort_order || 0]
    )

    const field = await get('SELECT * FROM scene_field_configs WHERE id = ?', [result.lastID])
    res.status(201).json({ ...field, required: !!field.required })
  } catch (error) {
    console.error('创建场景字段配置失败:', error)
    res.status(500).json({ error: '创建场景字段配置失败' })
  }
})

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { field_name, field_type, required, placeholder, default_value, validation_rule, options, sort_order } = req.body

    await run(
      `UPDATE scene_field_configs SET field_name = ?, field_type = ?, required = ?, placeholder = ?, default_value = ?, validation_rule = ?, options = ?, sort_order = ? WHERE id = ?`,
      [field_name, field_type || 'text', required ? 1 : 0, placeholder || '', default_value || '', validation_rule || '', options ? JSON.stringify(options) : '', sort_order || 0, id]
    )

    const field = await get('SELECT * FROM scene_field_configs WHERE id = ?', [id])
    res.json({ ...field, required: !!field.required })
  } catch (error) {
    console.error('更新场景字段配置失败:', error)
    res.status(500).json({ error: '更新场景字段配置失败' })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params
    
    await run('DELETE FROM participant_extended_data WHERE field_key IN (SELECT field_key FROM scene_field_configs WHERE id = ?)', [id])
    await run('DELETE FROM scene_field_configs WHERE id = ?', [id])
    
    res.json({ success: true })
  } catch (error) {
    console.error('删除场景字段配置失败:', error)
    res.status(500).json({ error: '删除场景字段配置失败' })
  }
})

export default router
