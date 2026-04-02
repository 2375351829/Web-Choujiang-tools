const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');
const db = require('./db');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);
const port = 3002;

// 中间件
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 配置文件上传
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: (req, file, cb) => {
    // 允许的文件类型
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel'];
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

// 初始化数据库表（添加状态和黑名单字段）
function initExtendedDatabase() {
  // 等待一段时间确保表已经创建
  setTimeout(() => {
    // 添加状态字段到参与者表
    db.run(`
      ALTER TABLE participants ADD COLUMN status TEXT DEFAULT '未中奖'
    `, (err) => {
      if (err && !err.message.includes('duplicate column name')) {
        console.error('添加状态字段失败:', err.message);
      } else if (!err) {
        console.log('状态字段添加成功');
      }
    });

    // 添加黑名单字段到参与者表
    db.run(`
      ALTER TABLE participants ADD COLUMN is_blacklisted INTEGER DEFAULT 0
    `, (err) => {
      if (err && !err.message.includes('duplicate column name')) {
        console.error('添加黑名单字段失败:', err.message);
      } else if (!err) {
        console.log('黑名单字段添加成功');
      }
    });
  }, 1000);
}

// 初始化扩展数据库
initExtendedDatabase();

// 存储Socket.io实例
app.set('io', io);

// 导入路由
const participantsRouter = require('./routes/participants');
const prizesRouter = require('./routes/prizes');
const sessionsRouter = require('./routes/sessions');
const consoleRouter = require('./routes/console');

// 注册路由
app.use('/api/participants', participantsRouter);
app.use('/api/prizes', prizesRouter);
app.use('/api/sessions', sessionsRouter);
app.use('/api/console', consoleRouter);

// Excel批量导入功能（参与者）
app.post('/api/participants/import', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: '请上传Excel文件' });
  }

  try {
    const workbook = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    // 验证数据
    const validData = data.filter(item => item.name);
    if (validData.length === 0) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'Excel文件中没有有效的数据' });
    }

    // 批量插入数据
    const sql = 'INSERT INTO participants (name, email, phone, status, is_blacklisted) VALUES (?, ?, ?, ?, ?)';
    let insertedCount = 0;

    db.serialize(() => {
      const stmt = db.prepare(sql);
      validData.forEach(item => {
        stmt.run([item.name, item.email || '', item.phone || '', '未中奖', 0], function(err) {
          if (err) {
            console.error('插入数据失败:', err.message);
          } else {
            insertedCount++;
          }
        });
      });
      stmt.finalize(() => {
        fs.unlinkSync(req.file.path);
        res.json({ message: `成功导入 ${insertedCount} 条数据` });
      });
    });
  } catch (error) {
    if (fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: '导入失败: ' + error.message });
  }
});

// 背景图片上传接口
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: '请上传文件' });
  }
  
  const fileUrl = `/uploads/${req.file.filename}`;
  res.json({ fileUrl });
});

// 静态文件服务，用于访问上传的图片
app.use('/uploads', express.static('uploads'));

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error('错误:', err);
  res.status(err.status || 500).json({
    error: err.message || '服务器内部错误'
  });
});

// Socket.io事件处理
io.on('connection', (socket) => {
  console.log('客户端连接:', socket.id);

  // 发送当前状态给新连接的客户端
  socket.emit('console:status', {
    currentSessionId: null,
    isDrawing: false
  });

  // 处理抽奖开始请求
  socket.on('draw:start', (data) => {
    const { session_id, prize_id } = data;
    io.emit('draw:start', { session_id, prize_id });
  });

  // 处理抽奖暂停请求
  socket.on('draw:pause', () => {
    io.emit('draw:pause');
  });

  // 处理抽奖停止请求
  socket.on('draw:stop', () => {
    io.emit('draw:stop');
  });

  // 处理抽奖重置请求
  socket.on('draw:reset', () => {
    io.emit('draw:reset');
  });

  // 处理客户端断开连接
  socket.on('disconnect', () => {
    console.log('客户端断开连接:', socket.id);
  });
});

// 启动服务器
server.listen(port, () => {
  console.log(`服务器运行在 http://localhost:${port}`);
});

module.exports = app;