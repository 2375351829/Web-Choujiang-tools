const express = require('express');
const router = express.Router();
const db = require('../db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// 配置文件上传
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: (req, file, cb) => {
    // 允许的文件类型
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('不支持的文件类型'));
    }
  }
});

// 确保上传目录存在
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

// 创建奖品（支持图片上传）
router.post('/', upload.single('image'), (req, res) => {
  const { name, description, weight, draw_count } = req.body;
  if (!name) {
    return res.status(400).json({ error: '奖品名称不能为空' });
  }

  const image = req.file ? `/uploads/${req.file.filename}` : null;
  const sql = 'INSERT INTO prizes (name, description, image, weight, draw_count) VALUES (?, ?, ?, ?, ?)';
  db.run(sql, [name, description, image, Number(weight) || 1, Number(draw_count) || 1], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.status(201).json({ 
      id: this.lastID, 
      name, 
      description, 
      image, 
      weight: Number(weight) || 1, 
      draw_count: Number(draw_count) || 1 
    });
  });
});

// 获取所有奖品
router.get('/', (req, res) => {
  const sql = 'SELECT * FROM prizes ORDER BY created_at DESC';
  db.all(sql, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// 获取单个奖品
router.get('/:id', (req, res) => {
  const { id } = req.params;
  const sql = 'SELECT * FROM prizes WHERE id = ?';
  db.get(sql, [id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!row) {
      return res.status(404).json({ error: '奖品不存在' });
    }
    res.json(row);
  });
});

// 更新奖品（支持图片上传）
router.put('/:id', upload.single('image'), (req, res) => {
  const { id } = req.params;
  const { name, description, weight, draw_count } = req.body;
  if (!name) {
    return res.status(400).json({ error: '奖品名称不能为空' });
  }

  // 先获取现有奖品信息
  db.get('SELECT image FROM prizes WHERE id = ?', [id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!row) {
      return res.status(404).json({ error: '奖品不存在' });
    }

    const image = req.file ? `/uploads/${req.file.filename}` : row.image;
    const sql = 'UPDATE prizes SET name = ?, description = ?, image = ?, weight = ?, draw_count = ? WHERE id = ?';
    db.run(sql, [name, description, image, Number(weight) || 1, Number(draw_count) || 1, id], function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: '奖品不存在' });
      }
      res.json({ 
        id, 
        name, 
        description, 
        image, 
        weight: Number(weight) || 1, 
        draw_count: Number(draw_count) || 1 
      });
    });
  });
});

// 删除奖品
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  
  // 先获取现有奖品信息，用于删除图片
  db.get('SELECT image FROM prizes WHERE id = ?', [id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!row) {
      return res.status(404).json({ error: '奖品不存在' });
    }

    // 删除奖品记录
    const sql = 'DELETE FROM prizes WHERE id = ?';
    db.run(sql, [id], function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: '奖品不存在' });
      }
      
      // 删除关联的图片文件
      if (row.image) {
        const imagePath = path.join(__dirname, '..', row.image);
        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
        }
      }
      
      res.json({ message: '奖品删除成功' });
    });
  });
});

module.exports = router;