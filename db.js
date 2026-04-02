const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// 创建数据库连接
const db = new sqlite3.Database(path.join(__dirname, 'database.db'), (err) => {
  if (err) {
    console.error('数据库连接失败:', err.message);
  } else {
    console.log('成功连接到SQLite数据库');
    // 初始化数据库表
    initDatabase();
  }
});

// 初始化数据库表
function initDatabase() {
  // 创建抽奖参与者表
  db.run(`
    CREATE TABLE IF NOT EXISTS participants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) {
      console.error('创建参与者表失败:', err.message);
    } else {
      console.log('参与者表创建成功');
      // 添加索引
      db.run(`CREATE INDEX IF NOT EXISTS idx_participants_status ON participants(status)`, (err) => {
        if (err) console.error('添加参与者表状态索引失败:', err.message);
      });
      db.run(`CREATE INDEX IF NOT EXISTS idx_participants_blacklisted ON participants(is_blacklisted)`, (err) => {
        if (err) console.error('添加参与者表黑名单索引失败:', err.message);
      });
    }
  });

  // 创建抽奖结果表
  db.run(`
    CREATE TABLE IF NOT EXISTS lottery_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      participant_id INTEGER,
      prize TEXT NOT NULL,
      drawn_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (participant_id) REFERENCES participants(id)
    )
  `, (err) => {
    if (err) {
      console.error('创建抽奖结果表失败:', err.message);
    } else {
      console.log('抽奖结果表创建成功');
      // 添加索引
      db.run(`CREATE INDEX IF NOT EXISTS idx_lottery_results_participant ON lottery_results(participant_id)`, (err) => {
        if (err) console.error('添加抽奖结果表参与者索引失败:', err.message);
      });
    }
  });

  // 创建奖品表
  db.run(`
    CREATE TABLE IF NOT EXISTS prizes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      image TEXT,
      weight INTEGER DEFAULT 1,
      draw_count INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) {
      console.error('创建奖品表失败:', err.message);
    } else {
      console.log('奖品表创建成功');
    }
  });

  // 创建抽奖场次表
  db.run(`
    CREATE TABLE IF NOT EXISTS lottery_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      status TEXT DEFAULT '未开始',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) {
      console.error('创建抽奖场次表失败:', err.message);
    } else {
      console.log('抽奖场次表创建成功');
      // 添加索引
      db.run(`CREATE INDEX IF NOT EXISTS idx_lottery_sessions_status ON lottery_sessions(status)`, (err) => {
        if (err) console.error('添加抽奖场次表状态索引失败:', err.message);
      });
    }
  });

  // 创建场次-奖品关联表
  db.run(`
    CREATE TABLE IF NOT EXISTS session_prizes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER,
      prize_id INTEGER,
      quantity INTEGER DEFAULT 1,
      FOREIGN KEY (session_id) REFERENCES lottery_sessions(id),
      FOREIGN KEY (prize_id) REFERENCES prizes(id)
    )
  `, (err) => {
    if (err) {
      console.error('创建场次-奖品关联表失败:', err.message);
    } else {
      console.log('场次-奖品关联表创建成功');
      // 添加索引
      db.run(`CREATE INDEX IF NOT EXISTS idx_session_prizes_session ON session_prizes(session_id)`, (err) => {
        if (err) console.error('添加场次-奖品关联表场次索引失败:', err.message);
      });
      db.run(`CREATE INDEX IF NOT EXISTS idx_session_prizes_prize ON session_prizes(prize_id)`, (err) => {
        if (err) console.error('添加场次-奖品关联表奖品索引失败:', err.message);
      });
    }
  });

  // 创建场次-参与者关联表
  db.run(`
    CREATE TABLE IF NOT EXISTS session_participants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER,
      participant_id INTEGER,
      FOREIGN KEY (session_id) REFERENCES lottery_sessions(id),
      FOREIGN KEY (participant_id) REFERENCES participants(id)
    )
  `, (err) => {
    if (err) {
      console.error('创建场次-参与者关联表失败:', err.message);
    } else {
      console.log('场次-参与者关联表创建成功');
      // 添加索引
      db.run(`CREATE INDEX IF NOT EXISTS idx_session_participants_session ON session_participants(session_id)`, (err) => {
        if (err) console.error('添加场次-参与者关联表场次索引失败:', err.message);
      });
      db.run(`CREATE INDEX IF NOT EXISTS idx_session_participants_participant ON session_participants(participant_id)`, (err) => {
        if (err) console.error('添加场次-参与者关联表参与者索引失败:', err.message);
      });
    }
  });

  // 创建场次抽奖结果表
  db.run(`
    CREATE TABLE IF NOT EXISTS session_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER,
      participant_id INTEGER,
      prize_id INTEGER,
      drawn_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (session_id) REFERENCES lottery_sessions(id),
      FOREIGN KEY (participant_id) REFERENCES participants(id),
      FOREIGN KEY (prize_id) REFERENCES prizes(id)
    )
  `, (err) => {
    if (err) {
      console.error('创建场次抽奖结果表失败:', err.message);
    } else {
      console.log('场次抽奖结果表创建成功');
      // 添加索引
      db.run(`CREATE INDEX IF NOT EXISTS idx_session_results_session ON session_results(session_id)`, (err) => {
        if (err) console.error('添加场次抽奖结果表场次索引失败:', err.message);
      });
      db.run(`CREATE INDEX IF NOT EXISTS idx_session_results_participant ON session_results(participant_id)`, (err) => {
        if (err) console.error('添加场次抽奖结果表参与者索引失败:', err.message);
      });
      db.run(`CREATE INDEX IF NOT EXISTS idx_session_results_prize ON session_results(prize_id)`, (err) => {
        if (err) console.error('添加场次抽奖结果表奖品索引失败:', err.message);
      });
    }
  });
}

module.exports = db;