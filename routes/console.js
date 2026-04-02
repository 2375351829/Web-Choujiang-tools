const express = require('express');
const router = express.Router();

// 控制台操作状态管理
let currentSessionId = null;
let isDrawing = false;
let drawInterval = null;

// 控制台操作接口
router.post('/start', (req, res) => {
  const { session_id, prize_id } = req.body;
  if (!session_id || !prize_id) {
    return res.status(400).json({ error: '场次ID和奖品ID不能为空' });
  }

  currentSessionId = session_id;
  isDrawing = true;

  // 发送开始信号给前端
  req.app.get('io').emit('draw:start', { session_id, prize_id });
  res.json({ message: '抽奖开始' });
});

router.post('/pause', (req, res) => {
  isDrawing = false;

  // 发送暂停信号给前端
  req.app.get('io').emit('draw:pause');
  res.json({ message: '抽奖暂停' });
});

router.post('/stop', (req, res) => {
  isDrawing = false;
  if (drawInterval) {
    clearInterval(drawInterval);
    drawInterval = null;
  }

  // 发送停止信号给前端
  req.app.get('io').emit('draw:stop');
  res.json({ message: '抽奖停止' });
});

router.post('/reset', (req, res) => {
  currentSessionId = null;
  isDrawing = false;
  if (drawInterval) {
    clearInterval(drawInterval);
    drawInterval = null;
  }

  // 发送重置信号给前端
  req.app.get('io').emit('draw:reset');
  res.json({ message: '抽奖重置' });
});

// 获取控制台状态
router.get('/status', (req, res) => {
  res.json({
    currentSessionId,
    isDrawing
  });
});

module.exports = router;