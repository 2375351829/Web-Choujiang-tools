const express = require('express');
const router = express.Router();
const db = require('../db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');

// 配置文件上传
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: (req, file, cb) => {
    // 允许的文件类型
    const allowedTypes = ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel'];
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

// 创建抽奖场次
router.post('/', (req, res) => {
  const { name, description } = req.body;
  if (!name) {
    return res.status(400).json({ error: '场次名称不能为空' });
  }

  const sql = 'INSERT INTO lottery_sessions (name, description, status) VALUES (?, ?, ?)';
  db.run(sql, [name, description, '未开始'], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.status(201).json({ id: this.lastID, name, description, status: '未开始' });
  });
});

// 获取所有抽奖场次
router.get('/', (req, res) => {
  const sql = 'SELECT * FROM lottery_sessions ORDER BY created_at DESC';
  db.all(sql, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// 获取单个抽奖场次详情
router.get('/:id', (req, res) => {
  const { id } = req.params;
  const sql = 'SELECT * FROM lottery_sessions WHERE id = ?';
  db.get(sql, [id], (err, session) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!session) {
      return res.status(404).json({ error: '场次不存在' });
    }

    // 获取场次关联的奖品
    const prizesSql = `
      SELECT p.*, sp.quantity 
      FROM session_prizes sp 
      JOIN prizes p ON sp.prize_id = p.id 
      WHERE sp.session_id = ?
    `;
    db.all(prizesSql, [id], (err, prizes) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      // 获取场次关联的参与者
      const participantsSql = `
        SELECT p.* 
        FROM session_participants sp 
        JOIN participants p ON sp.participant_id = p.id 
        WHERE sp.session_id = ?
      `;
      db.all(participantsSql, [id], (err, participants) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }

        // 获取场次的抽奖结果
        const resultsSql = `
          SELECT sr.*, p.name as participant_name, pr.name as prize_name 
          FROM session_results sr 
          JOIN participants p ON sr.participant_id = p.id 
          JOIN prizes pr ON sr.prize_id = pr.id 
          WHERE sr.session_id = ?
          ORDER BY sr.drawn_at DESC
        `;
        db.all(resultsSql, [id], (err, results) => {
          if (err) {
            return res.status(500).json({ error: err.message });
          }

          res.json({
            ...session,
            prizes,
            participants,
            results
          });
        });
      });
    });
  });
});

// 更新抽奖场次
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { name, description, status } = req.body;
  if (!name) {
    return res.status(400).json({ error: '场次名称不能为空' });
  }

  const validStatuses = ['未开始', '进行中', '已结束'];
  if (status && !validStatuses.includes(status)) {
    return res.status(400).json({ error: '状态必须是未开始、进行中或已结束' });
  }

  const sql = 'UPDATE lottery_sessions SET name = ?, description = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
  db.run(sql, [name, description, status || '未开始', id], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: '场次不存在' });
    }
    res.json({ id, name, description, status: status || '未开始' });
  });
});

// 删除抽奖场次
router.delete('/:id', (req, res) => {
  const { id } = req.params;

  // 开始事务
  db.serialize(() => {
    // 删除关联的结果
    db.run('DELETE FROM session_results WHERE session_id = ?', [id]);
    // 删除关联的参与者
    db.run('DELETE FROM session_participants WHERE session_id = ?', [id]);
    // 删除关联的奖品
    db.run('DELETE FROM session_prizes WHERE session_id = ?', [id]);
    // 删除场次
    const sql = 'DELETE FROM lottery_sessions WHERE id = ?';
    db.run(sql, [id], function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: '场次不存在' });
      }
      res.json({ message: '场次删除成功' });
    });
  });
});

// 场次奖品管理

// 添加奖品到场次
router.post('/:id/prizes', (req, res) => {
  const { id } = req.params;
  const { prize_id, quantity } = req.body;
  if (!prize_id) {
    return res.status(400).json({ error: '奖品ID不能为空' });
  }

  // 检查场次是否存在
  db.get('SELECT * FROM lottery_sessions WHERE id = ?', [id], (err, session) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!session) {
      return res.status(404).json({ error: '场次不存在' });
    }

    // 检查奖品是否存在
    db.get('SELECT * FROM prizes WHERE id = ?', [prize_id], (err, prize) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (!prize) {
        return res.status(404).json({ error: '奖品不存在' });
      }

      // 检查是否已经添加过该奖品
      db.get('SELECT * FROM session_prizes WHERE session_id = ? AND prize_id = ?', [id, prize_id], (err, existing) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        if (existing) {
          return res.status(400).json({ error: '该奖品已经添加到场次' });
        }

        const sql = 'INSERT INTO session_prizes (session_id, prize_id, quantity) VALUES (?, ?, ?)';
        db.run(sql, [id, prize_id, quantity || 1], function(err) {
          if (err) {
            return res.status(500).json({ error: err.message });
          }
          res.status(201).json({ id: this.lastID, session_id: id, prize_id, quantity: quantity || 1 });
        });
      });
    });
  });
});

// 从场次移除奖品
router.delete('/:id/prizes/:prize_id', (req, res) => {
  const { id, prize_id } = req.params;
  const sql = 'DELETE FROM session_prizes WHERE session_id = ? AND prize_id = ?';
  db.run(sql, [id, prize_id], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: '奖品未添加到场次' });
    }
    res.json({ message: '奖品从场次移除成功' });
  });
});

// 场次参与者管理

// 添加参与者到场次
router.post('/:id/participants', (req, res) => {
  const { id } = req.params;
  const { participant_ids } = req.body;
  if (!participant_ids || !Array.isArray(participant_ids)) {
    return res.status(400).json({ error: '参与者ID列表不能为空' });
  }

  // 检查场次是否存在
  db.get('SELECT * FROM lottery_sessions WHERE id = ?', [id], (err, session) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!session) {
      return res.status(404).json({ error: '场次不存在' });
    }

    // 批量添加参与者
    let addedCount = 0;
    let totalProcessed = 0;
    
    participant_ids.forEach(participant_id => {
      // 检查参与者是否存在
      db.get('SELECT * FROM participants WHERE id = ?', [participant_id], (err, participant) => {
        totalProcessed++;
        if (err) {
          console.error('检查参与者失败:', err.message);
        } else if (participant) {
          // 检查是否已经添加过该参与者
          db.get('SELECT * FROM session_participants WHERE session_id = ? AND participant_id = ?', [id, participant_id], (err, existing) => {
            if (err) {
              console.error('检查参与者是否已添加失败:', err.message);
            } else if (!existing) {
              const sql = 'INSERT INTO session_participants (session_id, participant_id) VALUES (?, ?)';
              db.run(sql, [id, participant_id], (err) => {
                if (err) {
                  console.error('添加参与者失败:', err.message);
                } else {
                  addedCount++;
                }
              });
            }
          });
        }
        
        // 所有处理完成后响应
        if (totalProcessed === participant_ids.length) {
          res.json({ message: `成功添加 ${addedCount} 名参与者到场次` });
        }
      });
    });
  });
});

// 从场次移除参与者
router.delete('/:id/participants/:participant_id', (req, res) => {
  const { id, participant_id } = req.params;
  const sql = 'DELETE FROM session_participants WHERE session_id = ? AND participant_id = ?';
  db.run(sql, [id, participant_id], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: '参与者未添加到场次' });
    }
    res.json({ message: '参与者从场次移除成功' });
  });
});

// 批量导入参与者到场次
router.post('/:id/participants/import', upload.single('file'), (req, res) => {
  const { id } = req.params;
  if (!req.file) {
    return res.status(400).json({ error: '请上传Excel文件' });
  }

  // 检查场次是否存在
  db.get('SELECT * FROM lottery_sessions WHERE id = ?', [id], (err, session) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!session) {
      return res.status(404).json({ error: '场次不存在' });
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

      // 批量处理
      let addedCount = 0;
      let existingCount = 0;
      let totalProcessed = 0;

      validData.forEach(item => {
        // 检查参与者是否存在
        db.get('SELECT id FROM participants WHERE name = ?', [item.name], (err, participant) => {
          if (err) {
            console.error('检查参与者失败:', err.message);
            totalProcessed++;
          } else {
            let participantId;
            if (participant) {
              participantId = participant.id;
              checkAndAdd();
            } else {
              // 创建新参与者
              db.run('INSERT INTO participants (name, email, phone, status, is_blacklisted) VALUES (?, ?, ?, ?, ?)', 
                [item.name, item.email || '', item.phone || '', '未中奖', 0], function(err) {
                  if (err) {
                    console.error('创建参与者失败:', err.message);
                  } else {
                    participantId = this.lastID;
                  }
                  checkAndAdd();
                });
            }
          }

          function checkAndAdd() {
            if (!participantId) {
              totalProcessed++;
              return;
            }
            
            // 检查是否已经添加到场次
            db.get('SELECT * FROM session_participants WHERE session_id = ? AND participant_id = ?', [id, participantId], (err, existing) => {
              if (err) {
                console.error('检查参与者是否已添加失败:', err.message);
              } else if (!existing) {
                db.run('INSERT INTO session_participants (session_id, participant_id) VALUES (?, ?)', [id, participantId], (err) => {
                  if (err) {
                    console.error('添加参与者到场次失败:', err.message);
                  } else {
                    addedCount++;
                  }
                });
              } else {
                existingCount++;
              }
              totalProcessed++;
              
              // 所有处理完成后响应
              if (totalProcessed === validData.length) {
                fs.unlinkSync(req.file.path);
                res.json({ 
                  message: `成功导入 ${addedCount} 名参与者到场次，${existingCount} 名参与者已存在` 
                });
              }
            });
          }
        });
      });
    } catch (error) {
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      res.status(500).json({ error: '导入失败: ' + error.message });
    }
  });
});

// 抽奖算法实现
router.post('/:id/draw', (req, res) => {
  const { id } = req.params;
  const { prize_id } = req.body;
  if (!prize_id) {
    return res.status(400).json({ error: '奖品ID不能为空' });
  }

  // 检查场次是否存在
  db.get('SELECT * FROM lottery_sessions WHERE id = ?', [id], (err, session) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!session) {
      return res.status(404).json({ error: '场次不存在' });
    }

    // 检查奖品是否在场次中
    db.get('SELECT * FROM session_prizes WHERE session_id = ? AND prize_id = ?', [id, prize_id], (err, sessionPrize) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (!sessionPrize) {
        return res.status(404).json({ error: '奖品未添加到场次' });
      }

      // 获取奖品信息
      db.get('SELECT * FROM prizes WHERE id = ?', [prize_id], (err, prize) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        if (!prize) {
          return res.status(404).json({ error: '奖品不存在' });
        }

        // 获取场次中的参与者
        const participantsSql = `
          SELECT p.* 
          FROM session_participants sp 
          JOIN participants p ON sp.participant_id = p.id 
          WHERE sp.session_id = ? AND p.is_blacklisted = 0
        `;
        db.all(participantsSql, [id], (err, participants) => {
          if (err) {
            return res.status(500).json({ error: err.message });
          }
          if (participants.length === 0) {
            return res.status(400).json({ error: '场次中没有可用的参与者' });
          }

          // 获取已经中过奖的参与者
          const winnersSql = `
            SELECT participant_id 
            FROM session_results 
            WHERE session_id = ? AND prize_id = ?
          `;
          db.all(winnersSql, [id, prize_id], (err, winners) => {
            if (err) {
              return res.status(500).json({ error: err.message });
            }

            const winnerIds = winners.map(w => w.participant_id);
            // 过滤掉已经中过奖的参与者
            const eligibleParticipants = participants.filter(p => !winnerIds.includes(p.id));

            if (eligibleParticipants.length === 0) {
              return res.status(400).json({ error: '所有参与者都已经中过该奖品' });
            }

            // 计算奖品剩余数量
            const remainingQuantity = sessionPrize.quantity - winnerIds.length;
            if (remainingQuantity <= 0) {
              return res.status(400).json({ error: '该奖品已经抽完' });
            }

            // 实现加权抽奖算法
            function weightedDraw(participants, prizeWeight) {
              // 为每个参与者分配权重
              const weightedParticipants = participants.map(p => ({
                ...p,
                weight: prizeWeight // 这里可以根据需要调整个人权重
              }));

              // 计算总权重
              const totalWeight = weightedParticipants.reduce((sum, p) => sum + p.weight, 0);

              // 生成随机数
              let random = Math.random() * totalWeight;

              // 根据权重选择参与者
              for (const p of weightedParticipants) {
                random -= p.weight;
                if (random <= 0) {
                  return p;
                }
              }

              // 防止极端情况
              return participants[Math.floor(Math.random() * participants.length)];
            }

            // 执行抽奖
            const winner = weightedDraw(eligibleParticipants, prize.weight);

            // 记录抽奖结果
            const resultSql = 'INSERT INTO session_results (session_id, participant_id, prize_id) VALUES (?, ?, ?)';
            db.run(resultSql, [id, winner.id, prize_id], function(err) {
              if (err) {
                return res.status(500).json({ error: err.message });
              }

              // 更新参与者状态
              db.run('UPDATE participants SET status = ? WHERE id = ?', ['已中奖', winner.id]);

              res.json({
                message: '抽奖成功',
                winner: {
                  id: winner.id,
                  name: winner.name,
                  email: winner.email,
                  phone: winner.phone
                },
                prize: {
                  id: prize.id,
                  name: prize.name
                }
              });
            });
          });
        });
      });
    });
  });
});

module.exports = router;