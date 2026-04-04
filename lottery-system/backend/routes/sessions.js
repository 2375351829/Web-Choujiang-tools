import express from 'express'
import { query, run, get } from '../models/database.js'

const router = express.Router()

const toNull = (value) => value === undefined ? null : value

const weightedRandomSelect = (participants, count) => {
  const selected = []
  const remaining = [...participants]
  
  for (let i = 0; i < count && remaining.length > 0; i++) {
    const totalWeight = remaining.reduce((sum, p) => sum + (p.weight || 1), 0)
    if (totalWeight <= 0) {
      const idx = Math.floor(Math.random() * remaining.length)
      selected.push(remaining.splice(idx, 1)[0])
    } else {
      let random = Math.random() * totalWeight
      for (let j = 0; j < remaining.length; j++) {
        random -= (remaining[j].weight || 1)
        if (random <= 0) {
          selected.push(remaining.splice(j, 1)[0])
          break
        }
      }
    }
  }
  
  return selected
}

router.get('/', async (req, res) => {
  try {
    const { scene_id } = req.query
    let sql = 'SELECT * FROM sessions WHERE 1=1'
    const params = []

    if (scene_id) {
      sql += ' AND scene_id = ?'
      params.push(scene_id)
    }

    sql += ' ORDER BY created_at DESC'
    const sessions = await query(sql, params)
    res.json(sessions)
  } catch (error) {
    console.error('获取场次列表失败:', error)
    res.status(500).json({ error: '获取场次列表失败' })
  }
})

router.post('/', async (req, res) => {
  try {
    const { name, description, scene_id } = req.body

    if (!name) {
      return res.status(400).json({ error: '场次名称不能为空' })
    }

    const result = await run(
      'INSERT INTO sessions (name, description, status, scene_id) VALUES (?, ?, ?, ?)',
      [name, toNull(description), '未开始', toNull(scene_id)]
    )

    const session = await get('SELECT * FROM sessions WHERE id = ?', [result.lastID])
    res.status(201).json(session)
  } catch (error) {
    console.error('创建场次失败:', error)
    res.status(500).json({ error: '创建场次失败' })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const session = await get('SELECT * FROM sessions WHERE id = ?', [id])

    if (!session) {
      return res.status(404).json({ error: '场次不存在' })
    }

    let participants = await query(
      `SELECT p.*, 
        CASE WHEN EXISTS(SELECT 1 FROM draw_results dr WHERE dr.participant_id = p.id AND dr.session_id = ?) THEN '已中奖' ELSE '未中奖' END as status
      FROM participants p 
      JOIN session_participants sp ON p.id = sp.participant_id 
      WHERE sp.session_id = ?`,
      [id, id]
    )
    
    participants = participants.map((p, index) => ({
      ...p,
      rowNum: index + 1
    }))

    const prizes = await query(
      `SELECT pr.*, sp.quantity, 
        sp.quantity - (SELECT COUNT(*) FROM draw_results WHERE session_id = ? AND prize_id = pr.id) as remaining
      FROM prizes pr 
      JOIN session_prizes sp ON pr.id = sp.prize_id 
      WHERE sp.session_id = ?`,
      [id, id]
    )

    const results = await query(
      `SELECT dr.drawn_at, p.name as participant_name, p.email, p.phone, pr.name as prize_name, pr.level as prize_level, pr.id as prize_id
      FROM draw_results dr
      JOIN participants p ON dr.participant_id = p.id
      JOIN prizes pr ON dr.prize_id = pr.id
      WHERE dr.session_id = ?
      ORDER BY dr.drawn_at DESC`,
      [id]
    )

    res.json({ ...session, participants, prizes, results })
  } catch (error) {
    console.error('获取场次详情失败:', error)
    res.status(500).json({ error: '获取场次详情失败' })
  }
})

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { name, description, status } = req.body

    if (!name) {
      return res.status(400).json({ error: '场次名称不能为空' })
    }

    await run(
      'UPDATE sessions SET name = ?, description = ?, status = ? WHERE id = ?',
      [name, toNull(description), toNull(status), id]
    )

    const updatedSession = await get('SELECT * FROM sessions WHERE id = ?', [id])
    res.json(updatedSession)
  } catch (error) {
    console.error('更新场次失败:', error)
    res.status(500).json({ error: '更新场次失败' })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params
    await run('DELETE FROM session_participants WHERE session_id = ?', [id])
    await run('DELETE FROM session_prizes WHERE session_id = ?', [id])
    await run('DELETE FROM draw_results WHERE session_id = ?', [id])
    await run('DELETE FROM sessions WHERE id = ?', [id])
    res.json({ success: true })
  } catch (error) {
    console.error('删除场次失败:', error)
    res.status(500).json({ error: '删除场次失败' })
  }
})

router.post('/:id/participants', async (req, res) => {
  try {
    const { id } = req.params
    const { participant_ids } = req.body

    if (!Array.isArray(participant_ids)) {
      return res.status(400).json({ error: 'participant_ids必须为数组' })
    }

    await run('DELETE FROM session_participants WHERE session_id = ?', [id])

    for (const participantId of participant_ids) {
      await run(
        'INSERT OR IGNORE INTO session_participants (session_id, participant_id) VALUES (?, ?)',
        [id, participantId]
      )
    }

    res.json({ success: true, added: participant_ids.length })
  } catch (error) {
    console.error('关联参与者失败:', error)
    res.status(500).json({ error: '关联参与者失败' })
  }
})

router.post('/:id/prizes', async (req, res) => {
  try {
    const { id } = req.params
    const { prize_id, quantity = 1 } = req.body

    if (!prize_id) {
      return res.status(400).json({ error: 'prize_id不能为空' })
    }

    await run(
      'INSERT OR REPLACE INTO session_prizes (session_id, prize_id, quantity) VALUES (?, ?, ?)',
      [id, prize_id, quantity]
    )

    res.json({ success: true })
  } catch (error) {
    console.error('关联奖品失败:', error)
    res.status(500).json({ error: '关联奖品失败' })
  }
})

router.delete('/:id/prizes/:prize_id', async (req, res) => {
  try {
    const { id, prize_id } = req.params
    await run('DELETE FROM session_prizes WHERE session_id = ? AND prize_id = ?', [id, prize_id])
    res.json({ success: true })
  } catch (error) {
    console.error('移除奖品失败:', error)
    res.status(500).json({ error: '移除奖品失败' })
  }
})

router.post('/:id/draw', async (req, res) => {
  try {
    const { id } = req.params
    const { prize_id } = req.body

    if (!prize_id) {
      return res.status(400).json({ error: 'prize_id不能为空' })
    }

    const sessionPrize = await get(
      'SELECT * FROM session_prizes WHERE session_id = ? AND prize_id = ?',
      [id, prize_id]
    )

    if (!sessionPrize) {
      return res.status(400).json({ error: '该奖品未添加到场次' })
    }

    const drawnCount = await get(
      'SELECT COUNT(*) as count FROM draw_results WHERE session_id = ? AND prize_id = ?',
      [id, prize_id]
    )

    if (drawnCount.count >= sessionPrize.quantity) {
      return res.status(400).json({ error: '该奖品已经抽完' })
    }

    const participants = await query(
      `SELECT p.* FROM participants p
      JOIN session_participants sp ON p.id = sp.participant_id
      WHERE sp.session_id = ? AND p.is_blacklisted = 0
      AND p.id NOT IN (
        SELECT participant_id FROM draw_results WHERE session_id = ? AND prize_id = ?
      )`,
      [id, id, prize_id]
    )

    if (participants.length === 0) {
      return res.status(400).json({ error: '没有可参与抽奖的人员' })
    }

    const totalWeight = participants.reduce((sum, p) => sum + (p.weight || 1), 0)
    let random = Math.random() * totalWeight
    let winner = participants[participants.length - 1]

    for (const participant of participants) {
      random -= (participant.weight || 1)
      if (random <= 0) {
        winner = participant
        break
      }
    }

    await run(
      'INSERT INTO draw_results (session_id, participant_id, prize_id) VALUES (?, ?, ?)',
      [id, winner.id, prize_id]
    )

    await run(
      'UPDATE participants SET status = ? WHERE id = ?',
      ['已中奖', winner.id]
    )

    await run(
      'UPDATE sessions SET status = ? WHERE id = ?',
      ['进行中', id]
    )

    const prize = await get('SELECT * FROM prizes WHERE id = ?', [prize_id])

    res.json({
      success: true,
      winners: [{
        id: winner.id,
        name: winner.name,
        email: winner.email,
        phone: winner.phone,
        avatar: winner.avatar
      }],
      prize: {
        id: prize.id,
        name: prize.name,
        description: prize.description,
        image_url: prize.image_url,
        level: prize.level
      },
      drawn_at: new Date().toISOString()
    })
  } catch (error) {
    console.error('抽奖失败:', error)
    res.status(500).json({ error: '抽奖失败' })
  }
})

router.post('/:id/draw/batch', async (req, res) => {
  try {
    const { id } = req.params
    const { prize_id, count = 1, exclude_previous_winners = true } = req.body

    if (!prize_id) {
      return res.status(400).json({ error: 'prize_id不能为空' })
    }

    if (count < 1) {
      return res.status(400).json({ error: '抽取人数必须大于0' })
    }

    const sessionPrize = await get(
      'SELECT * FROM session_prizes WHERE session_id = ? AND prize_id = ?',
      [id, prize_id]
    )

    if (!sessionPrize) {
      return res.status(400).json({ error: '该奖品未添加到场次' })
    }

    const drawnCount = await get(
      'SELECT COUNT(*) as count FROM draw_results WHERE session_id = ? AND prize_id = ?',
      [id, prize_id]
    )

    const remaining = sessionPrize.quantity - drawnCount.count
    if (remaining <= 0) {
      return res.status(400).json({ error: '该奖品已经抽完' })
    }

    const actualCount = Math.min(count, remaining)

    let participantsQuery = `
      SELECT p.* FROM participants p
      JOIN session_participants sp ON p.id = sp.participant_id
      WHERE sp.session_id = ? AND p.is_blacklisted = 0
    `
    
    const queryParams = [id]
    
    if (exclude_previous_winners) {
      participantsQuery += ` AND p.id NOT IN (
        SELECT participant_id FROM draw_results WHERE session_id = ? AND prize_id = ?
      )`
      queryParams.push(id, prize_id)
    } else {
      participantsQuery += ` AND p.id NOT IN (
        SELECT participant_id FROM draw_results WHERE session_id = ? AND prize_id = ?
      )`
      queryParams.push(id, prize_id)
    }

    const participants = await query(participantsQuery, queryParams)

    if (participants.length === 0) {
      return res.status(400).json({ error: '没有可参与抽奖的人员' })
    }

    const winners = weightedRandomSelect(participants, actualCount)

    if (winners.length === 0) {
      return res.status(400).json({ error: '没有足够的人员可抽取' })
    }

    const prize = await get('SELECT * FROM prizes WHERE id = ?', [prize_id])
    const results = []

    for (const winner of winners) {
      await run(
        'INSERT INTO draw_results (session_id, participant_id, prize_id) VALUES (?, ?, ?)',
        [id, winner.id, prize_id]
      )

      await run(
        'UPDATE participants SET status = ? WHERE id = ?',
        ['已中奖', winner.id]
      )

      results.push({
        id: winner.id,
        name: winner.name,
        email: winner.email,
        phone: winner.phone,
        avatar: winner.avatar
      })
    }

    await run(
      'UPDATE sessions SET status = ? WHERE id = ?',
      ['进行中', id]
    )

    res.json({
      success: true,
      winners: results,
      prize: {
        id: prize.id,
        name: prize.name,
        description: prize.description,
        image_url: prize.image_url,
        level: prize.level
      },
      count: winners.length,
      drawn_at: new Date().toISOString()
    })
  } catch (error) {
    console.error('批量抽奖失败:', error)
    res.status(500).json({ error: '批量抽奖失败' })
  }
})

router.post('/:id/draw/by-level', async (req, res) => {
  try {
    const { id } = req.params
    const { level, count = 1, exclude_previous_winners = true } = req.body

    if (!level) {
      return res.status(400).json({ error: '奖品等级不能为空' })
    }

    const prizes = await query(
      `SELECT pr.*, sp.quantity, 
        sp.quantity - (SELECT COUNT(*) FROM draw_results WHERE session_id = ? AND prize_id = pr.id) as remaining
      FROM prizes pr 
      JOIN session_prizes sp ON pr.id = sp.prize_id 
      WHERE sp.session_id = ? AND pr.level = ?`,
      [id, id, level]
    )

    if (prizes.length === 0) {
      return res.status(400).json({ error: '该等级奖品未添加到场次' })
    }

    const availablePrize = prizes.find(p => p.remaining > 0)
    if (!availablePrize) {
      return res.status(400).json({ error: '该等级奖品已经抽完' })
    }

    const actualCount = Math.min(count, availablePrize.remaining)

    let participantsQuery = `
      SELECT p.* FROM participants p
      JOIN session_participants sp ON p.id = sp.participant_id
      WHERE sp.session_id = ? AND p.is_blacklisted = 0
      AND p.id NOT IN (
        SELECT participant_id FROM draw_results WHERE session_id = ? AND prize_id = ?
      )
    `
    
    const participants = await query(participantsQuery, [id, id, availablePrize.id])

    if (participants.length === 0) {
      return res.status(400).json({ error: '没有可参与抽奖的人员' })
    }

    const winners = weightedRandomSelect(participants, actualCount)

    if (winners.length === 0) {
      return res.status(400).json({ error: '没有足够的人员可抽取' })
    }

    const results = []

    for (const winner of winners) {
      await run(
        'INSERT INTO draw_results (session_id, participant_id, prize_id) VALUES (?, ?, ?)',
        [id, winner.id, availablePrize.id]
      )

      await run(
        'UPDATE participants SET status = ? WHERE id = ?',
        ['已中奖', winner.id]
      )

      results.push({
        id: winner.id,
        name: winner.name,
        email: winner.email,
        phone: winner.phone,
        avatar: winner.avatar
      })
    }

    await run(
      'UPDATE sessions SET status = ? WHERE id = ?',
      ['进行中', id]
    )

    res.json({
      success: true,
      winners: results,
      prize: {
        id: availablePrize.id,
        name: availablePrize.name,
        description: availablePrize.description,
        image_url: availablePrize.image_url,
        level: availablePrize.level
      },
      count: winners.length,
      drawn_at: new Date().toISOString()
    })
  } catch (error) {
    console.error('按等级抽奖失败:', error)
    res.status(500).json({ error: '按等级抽奖失败' })
  }
})

router.post('/:id/draw/multi-prizes', async (req, res) => {
  try {
    const { id } = req.params
    const { draws } = req.body

    if (!Array.isArray(draws) || draws.length === 0) {
      return res.status(400).json({ error: 'draws必须是非空数组' })
    }

    const results = []

    for (const draw of draws) {
      const { prize_id, count = 1 } = draw

      if (!prize_id) {
        continue
      }

      const sessionPrize = await get(
        'SELECT * FROM session_prizes WHERE session_id = ? AND prize_id = ?',
        [id, prize_id]
      )

      if (!sessionPrize) {
        continue
      }

      const drawnCount = await get(
        'SELECT COUNT(*) as count FROM draw_results WHERE session_id = ? AND prize_id = ?',
        [id, prize_id]
      )

      const remaining = sessionPrize.quantity - drawnCount.count
      if (remaining <= 0) {
        continue
      }

      const actualCount = Math.min(count, remaining)

      const participants = await query(
        `SELECT p.* FROM participants p
        JOIN session_participants sp ON p.id = sp.participant_id
        WHERE sp.session_id = ? AND p.is_blacklisted = 0
        AND p.id NOT IN (
          SELECT participant_id FROM draw_results WHERE session_id = ? AND prize_id = ?
        )`,
        [id, id, prize_id]
      )

      if (participants.length === 0) {
        continue
      }

      const winners = weightedRandomSelect(participants, actualCount)
      const prize = await get('SELECT * FROM prizes WHERE id = ?', [prize_id])

      for (const winner of winners) {
        await run(
          'INSERT INTO draw_results (session_id, participant_id, prize_id) VALUES (?, ?, ?)',
          [id, winner.id, prize_id]
        )

        await run(
          'UPDATE participants SET status = ? WHERE id = ?',
          ['已中奖', winner.id]
        )
      }

      results.push({
        prize: {
          id: prize.id,
          name: prize.name,
          level: prize.level
        },
        winners: winners.map(w => ({
          id: w.id,
          name: w.name,
          email: w.email,
          phone: w.phone
        })),
        count: winners.length
      })
    }

    if (results.length > 0) {
      await run(
        'UPDATE sessions SET status = ? WHERE id = ?',
        ['进行中', id]
      )
    }

    res.json({
      success: true,
      results,
      drawn_at: new Date().toISOString()
    })
  } catch (error) {
    console.error('多奖品抽奖失败:', error)
    res.status(500).json({ error: '多奖品抽奖失败' })
  }
})

router.get('/:id/prize-levels', async (req, res) => {
  try {
    const { id } = req.params
    
    const levels = await query(
      `SELECT DISTINCT pr.level, 
        COUNT(DISTINCT pr.id) as prize_count,
        SUM(sp.quantity) as total_quantity,
        SUM(sp.quantity) - (SELECT COUNT(*) FROM draw_results dr WHERE dr.session_id = ? AND dr.prize_id IN (
          SELECT pr2.id FROM prizes pr2 JOIN session_prizes sp2 ON pr2.id = sp2.prize_id 
          WHERE sp2.session_id = ? AND pr2.level = pr.level
        )) as remaining
      FROM prizes pr 
      JOIN session_prizes sp ON pr.id = sp.prize_id 
      WHERE sp.session_id = ?
      GROUP BY pr.level
      ORDER BY 
        CASE pr.level 
          WHEN '特等奖' THEN 1 
          WHEN '一等奖' THEN 2 
          WHEN '二等奖' THEN 3 
          WHEN '三等奖' THEN 4 
          WHEN '参与奖' THEN 5 
          ELSE 6 
        END`,
      [id, id, id]
    )

    res.json(levels)
  } catch (error) {
    console.error('获取奖品等级失败:', error)
    res.status(500).json({ error: '获取奖品等级失败' })
  }
})

router.post('/:id/reset', async (req, res) => {
  try {
    const { id } = req.params
    
    const results = await query(
      'SELECT DISTINCT participant_id FROM draw_results WHERE session_id = ?',
      [id]
    )
    
    for (const result of results) {
      const otherWins = await get(
        'SELECT COUNT(*) as count FROM draw_results WHERE participant_id = ? AND session_id != ?',
        [result.participant_id, id]
      )
      if (otherWins.count === 0) {
        await run('UPDATE participants SET status = ? WHERE id = ?', ['未中奖', result.participant_id])
      }
    }
    
    await run('DELETE FROM draw_results WHERE session_id = ?', [id])
    await run('UPDATE sessions SET status = ? WHERE id = ?', ['未开始', id])
    
    res.json({ success: true, message: '场次已重置' })
  } catch (error) {
    console.error('重置场次失败:', error)
    res.status(500).json({ error: '重置场次失败' })
  }
})

export default router
