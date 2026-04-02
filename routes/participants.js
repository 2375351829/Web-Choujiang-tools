const express = require('express');
const router = express.Router();
const db = require('../db');

// 创建人员
router.post('/', (req, res) => {
  const { name, email, phone } = req.body;
  if (!name) {
    return res.status(400).json({ error: '姓名不能为空' });
  }

  const sql = 'INSERT INTO participants (name, email, phone, status, is_blacklisted) VALUES (?, ?, ?, ?, ?)';
  db.run(sql, [name, email, phone, '未中奖', 0], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.status(201).json({ id: this.lastID, name, email, phone, status: '未中奖', is_blacklisted: 0 });
  });
});

// 获取所有人员
router.get('/', (req, res) => {
  const { status, is_blacklisted } = req.query;
  let sql = 'SELECT * FROM participants';
  const params = [];

  if (status || is_blacklisted !== undefined) {
    sql += ' WHERE';
    if (status) {
      sql += ' status = ?';
      params.push(status);
    }
    if (status && is_blacklisted !== undefined) {
      sql += ' AND';
    }
    if (is_blacklisted !== undefined) {
      sql += ' is_blacklisted = ?';
      params.push(Number(is_blacklisted));
    }
  }

  sql += ' ORDER BY created_at DESC';

  db.all(sql, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// 获取单个人员
router.get('/:id', (req, res) => {
  const { id } = req.params;
  const sql = 'SELECT * FROM participants WHERE id = ?';
  db.get(sql, [id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!row) {
      return res.status(404).json({ error: '人员不存在' });
    }
    res.json(row);
  });
});

// 更新人员
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { name, email, phone, status, is_blacklisted } = req.body;
  if (!name) {
    return res.status(400).json({ error: '姓名不能为空' });
  }

  const sql = 'UPDATE participants SET name = ?, email = ?, phone = ?, status = ?, is_blacklisted = ? WHERE id = ?';
  db.run(sql, [name, email, phone, status, Number(is_blacklisted), id], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: '人员不存在' });
    }
    res.json({ id, name, email, phone, status, is_blacklisted: Number(is_blacklisted) });
  });
});

// 删除人员
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const sql = 'DELETE FROM participants WHERE id = ?';
  db.run(sql, [id], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: '人员不存在' });
    }
    res.json({ message: '人员删除成功' });
  });
});

// 人员状态管理
router.put('/:id/status', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  if (!status || !['已中奖', '未中奖'].includes(status)) {
    return res.status(400).json({ error: '状态必须是"已中奖"或"未中奖"' });
  }

  const sql = 'UPDATE participants SET status = ? WHERE id = ?';
  db.run(sql, [status, id], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: '人员不存在' });
    }
    res.json({ id, status });
  });
});

// 黑名单功能
router.put('/:id/blacklist', (req, res) => {
  const { id } = req.params;
  const { is_blacklisted } = req.body;
  const blacklistStatus = Number(is_blacklisted) ? 1 : 0;

  const sql = 'UPDATE participants SET is_blacklisted = ? WHERE id = ?';
  db.run(sql, [blacklistStatus, id], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: '人员不存在' });
    }
    res.json({ id, is_blacklisted: blacklistStatus });
  });
});

module.exports = router;