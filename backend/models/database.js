import sqlite3 from 'sqlite3'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dbPath = path.join(__dirname, '../database.db')

// 创建数据库连接
let db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('数据库连接失败:', err.message)
  } else {
    console.log('数据库连接成功')
  }
})

// 初始化数据库
export const initDatabase = () => {
  // 创建表
  const createTables = `
    -- 参与者表
    CREATE TABLE IF NOT EXISTS participants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      weight INTEGER DEFAULT 1,
      is_blacklisted INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- 奖品表
    CREATE TABLE IF NOT EXISTS prizes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      image_url TEXT,
      count INTEGER DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- 场次表
    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      status INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- 场次参与者关联表
    CREATE TABLE IF NOT EXISTS session_participants (
      session_id INTEGER,
      participant_id INTEGER,
      PRIMARY KEY (session_id, participant_id),
      FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
      FOREIGN KEY (participant_id) REFERENCES participants(id) ON DELETE CASCADE
    );

    -- 场次奖品关联表
    CREATE TABLE IF NOT EXISTS session_prizes (
      session_id INTEGER,
      prize_id INTEGER,
      PRIMARY KEY (session_id, prize_id),
      FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
      FOREIGN KEY (prize_id) REFERENCES prizes(id) ON DELETE CASCADE
    );

    -- 抽奖结果表
    CREATE TABLE IF NOT EXISTS draw_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER,
      participant_id INTEGER,
      prize_id INTEGER,
      drawn_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
      FOREIGN KEY (participant_id) REFERENCES participants(id) ON DELETE CASCADE,
      FOREIGN KEY (prize_id) REFERENCES prizes(id) ON DELETE CASCADE
    );

    -- 创建索引
    CREATE INDEX IF NOT EXISTS idx_participants_name ON participants(name);
    CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
    CREATE INDEX IF NOT EXISTS idx_draw_results_session_prize ON draw_results(session_id, prize_id);
  `

  db.exec(createTables, (err) => {
    if (err) {
      console.error('创建表失败:', err.message)
    } else {
      console.log('数据库表创建成功')
      // 插入测试数据
      insertTestData()
    }
  })
}

// 插入测试数据
const insertTestData = () => {
  // 检查是否已有数据
  db.get('SELECT COUNT(*) as count FROM participants', (err, row) => {
    if (err) {
      console.error('查询数据失败:', err.message)
      return
    }

    if (row.count === 0) {
      // 插入测试参与者
      const testParticipants = [
        ['张三', 'zhangsan@example.com', '13800138001', 1, 0],
        ['李四', 'lisi@example.com', '13900139001', 2, 0],
        ['王五', 'wangwu@example.com', '13700137001', 1, 1],
        ['赵六', 'zhaoliu@example.com', '13600136001', 3, 0],
        ['钱七', 'qianqi@example.com', '13500135001', 1, 0]
      ]

      const participantStmt = db.prepare('INSERT INTO participants (name, email, phone, weight, is_blacklisted) VALUES (?, ?, ?, ?, ?)')
      testParticipants.forEach(participant => {
        participantStmt.run(participant, (err) => {
          if (err) {
            console.error('插入参与者失败:', err.message)
          }
        })
      })
      participantStmt.finalize()

      // 插入测试奖品
      const testPrizes = [
        ['iPhone 15', '苹果最新手机', '', 1],
        ['AirPods Pro', '苹果无线耳机', '', 2],
        ['京东卡 1000元', '京东购物卡', '', 5],
        ['小米手环', '智能手环', '', 10],
        ['充电宝', '便携充电宝', '', 20]
      ]

      const prizeStmt = db.prepare('INSERT INTO prizes (name, description, image_url, count) VALUES (?, ?, ?, ?)')
      testPrizes.forEach(prize => {
        prizeStmt.run(prize, (err) => {
          if (err) {
            console.error('插入奖品失败:', err.message)
          }
        })
      })
      prizeStmt.finalize()

      // 插入测试场次
      const testSessions = [
        ['年会抽奖', '2024年公司年会抽奖活动', 0],
        ['公司活动', '季度公司活动抽奖', 1],
        ['线下聚会', '部门线下聚会抽奖', 2]
      ]

      const sessionStmt = db.prepare('INSERT INTO sessions (name, description, status) VALUES (?, ?, ?)')
      testSessions.forEach(session => {
        sessionStmt.run(session, (err) => {
          if (err) {
            console.error('插入场次失败:', err.message)
          }
        })
      })
      sessionStmt.finalize()

      console.log('测试数据插入成功')
    }
  })
}

// 执行SQL查询
export const query = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err)
      } else {
        resolve(rows)
      }
    })
  })
}

// 执行SQL语句
export const run = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) {
        reject(err)
      } else {
        resolve({ lastID: this.lastID, changes: this.changes })
      }
    })
  })
}

// 执行单个查询
export const get = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        reject(err)
      } else {
        resolve(row)
      }
    })
  })
}

export default db
