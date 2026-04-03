# 🔧 故障排查指南

**文档版本**: 2.0.0
**更新日期**: 2026-04-03

---

## 📋 故障排查概述

本文档提供常见问题的诊断和解决方案。按照以下步骤进行排查：

```
1. 确认问题现象
2. 查找对应章节
3. 按顺序尝试解决方案
4. 如仍无法解决，联系技术支持
```

---

## 🚨 快速诊断

### 服务无法启动

**执行以下命令检查**:
```bash
# 检查Node.js版本
node --version  # 应 >= 16.x

# 检查端口占用
netstat -ano | findstr :3000

# 检查依赖
npm ls
```

### 页面无法访问

**检查清单**:
- [ ] 服务是否运行 (`http://localhost:3000`)
- [ ] 浏览器控制台是否有错误
- [ ] 网络请求是否被阻止

---

## 🖥️ 管理后台问题

### 1. 页面空白或加载失败

**现象**: 访问 http://localhost:3000 显示空白页

**可能原因**:
1. 前端资源未正确构建
2. 静态文件路径错误
3. 浏览器缓存问题

**解决方案**:

```bash
# 1. 清除缓存重新构建
rmdir /s /q node_modules\.vite
npm run dev

# 2. 或重新构建生产版本
npm run build
npm start
```

**如问题依旧**:
```bash
# 3. 检查浏览器控制台 (F12) 查看具体错误
# 4. 检查Network标签查看哪个资源加载失败
```

---

### 2. 数据加载缓慢

**现象**: 管理后台数据加载很慢

**可能原因**:
1. 数据库查询效率低
2. 网络延迟
3. 参与者和奖品数量过多

**解决方案**:

```sql
-- 检查数据库索引是否存在
sqlite3 database.db ".indices participants"
sqlite3 database.db ".indices session_results"

-- 重新创建索引（如缺失）
CREATE INDEX IF NOT EXISTS idx_participants_status ON participants(status);
CREATE INDEX IF NOT EXISTS idx_results_session ON session_results(session_id);
```

---

### 3. 操作无响应

**现象**: 点击按钮后无任何响应

**解决方案**:

```javascript
// 1. 打开浏览器控制台 (F12)
// 2. 查看是否有JavaScript错误

// 3. 检查Network标签
//    - 如果API请求显示红色，说明后端出错
//    - 查看响应状态码和内容
```

---

## 🎰 抽奖功能问题

### 1. 点击"开始抽奖"无反应

**现象**: 点击开始按钮后没有响应

**排查步骤**:

**步骤1**: 检查WebSocket连接

打开浏览器控制台 (F12)，检查：
- 是否显示 "Socket.io连接成功"
- 是否有连接错误信息

**解决方案**:
```javascript
// 如果连接失败，尝试刷新页面
location.reload()

// 或清除缓存后重试
```

**步骤2**: 检查场次配置

确认：
- [ ] 场次ID和奖品ID输入正确
- [ ] 场次已添加参与者
- [ ] 场次已添加奖品
- [ ] 奖品还有库存

**步骤3**: 检查后端日志

查看终端输出是否有错误信息

---

### 2. 抽奖过程中动画卡顿

**现象**: 抽奖动画运行不流畅

**可能原因**:
1. 参与者数量过多（>100人）
2. 浏览器性能不足
3. 同时运行其他程序

**解决方案**:

```javascript
// 1. 减少展示的参与者数量
// 在控制台配置中降低 show_participants 数量

// 2. 关闭其他占用资源的程序

// 3. 使用列表动画模式替代球体模式
// 配置 animation_type = 'list'
```

---

### 3. 抽奖结果与预期不符

**现象**: 中奖者不是期望的人

**可能原因**:
1. 存在重名参与者
2. 权重配置问题
3. 数据库状态不一致

**排查步骤**:

**步骤1**: 检查权重配置

```sql
-- 查看参与者权重
SELECT id, name, weight FROM participants;

-- 检查是否有权重为0的参与者
SELECT * FROM participants WHERE weight <= 0 OR weight IS NULL;
```

**解决方案**:
```sql
-- 将权重为0的改为1
UPDATE participants SET weight = 1 WHERE weight <= 0 OR weight IS NULL;
```

**步骤2**: 检查数据一致性

运行修复脚本：
```bash
python fix_database.py
```

**步骤3**: 检查重复姓名

```sql
-- 查找重名参与者
SELECT name, COUNT(*) as cnt
FROM participants
GROUP BY name
HAVING cnt > 1;
```

---

### 4. 重复中奖警告

**现象**: 系统提示"该人员已中过此奖品"

**这是正常现象**，系统防重机制在正常工作

**说明**:
- 同一参与者不能中同一奖品多次
- 如需重新抽奖，需要先删除之前的抽奖记录

```sql
-- 查看某人的中奖记录
SELECT sr.*, p.name as person, pr.name as prize
FROM session_results sr
JOIN participants p ON sr.participant_id = p.id
JOIN prizes pr ON sr.prize_id = pr.id
WHERE sr.participant_id = 1;

-- 删除错误的记录（谨慎操作）
DELETE FROM session_results WHERE id = <记录ID>;
```

---

## 🌐 网络连接问题

### 1. Socket.io连接失败

**现象**: 控制台显示连接失败

**错误信息**:
```
Socket.io Error: websocket error
```

**排查步骤**:

**步骤1**: 检查服务器是否运行

```bash
# 确认服务器进程存在
tasklist | findstr node

# 确认端口监听
netstat -ano | findstr :3000
```

**步骤2**: 检查防火墙

```powershell
# Windows防火墙允许Node.js
netsh advfirewall firewall add rule name="Node.js" dir=in action=allow program="C:\Program Files\nodejs\node.exe" enable=yes
```

**步骤3**: 检查CORS配置

服务器应允许前端域名访问

---

### 2. 展示页面无法连接

**现象**: 展示页面显示"未连接服务器"

**排查步骤**:

```javascript
// 1. 确认管理后台和展示页面是同一服务器
//    管理后台: http://localhost:3000
//    展示页面: http://localhost:3000/display.html

// 2. 检查展示页面URL是否正确
//    应该是: http://服务器IP:3000/display.html
//    而不是: http://localhost:3000/display.html (在不同电脑访问时)
```

**解决方案**:

```javascript
// 展示页面中的Socket连接地址需要修改
// 在 LotteryDisplay.vue 中检查：

// 应该是相对路径或服务器地址
const socket = io(); // 推荐：自动使用当前页面域名

// 而非硬编码地址
// const socket = io('http://localhost:3002'); // 不推荐
```

---

## 💾 数据库问题

### 1. 数据库被锁定

**错误信息**:
```
Error: SQLITE_BUSY: database is locked
```

**原因**: 多个进程同时访问数据库

**解决方案**:

```bash
# 1. 关闭所有可能访问数据库的程序
#    - 关闭浏览器
#    - 关闭其他Node进程

# 2. 重启服务器
pm2 restart lottery-app

# 3. 如问题持续，手动解锁
sqlite3 database.db "BEGIN EXCLUSIVE; COMMIT;"
```

---

### 2. 数据库损坏

**现象**:
- 查询结果异常
- 表数据丢失
- 无法执行SQL

**解决方案**:

```bash
# 1. 使用备份恢复
copy database_backup.db database.db

# 2. 如无备份，尝试修复
sqlite3 database.db ".recover" > recovered.sql
sqlite3 new_database.db < recovered.sql
```

**预防措施**:
```bash
# 定期备份数据库
copy database.db database_backup_%date:~0,4%%date:~5,2%%date:~8,2%.db
```

---

### 3. 数据不一致

**现象**:
- 参与者显示"已中奖"但无记录
- 有抽奖记录但状态为"未中奖"

**解决方案**:

运行数据修复脚本：
```bash
python fix_database.py
```

**修复内容**:
1. 同步参与者状态与实际中奖记录
2. 添加权重字段（如缺失）
3. 创建数据保护触发器

---

## 📱 展示页面问题

### 1. 展示页面显示不完整

**现象**: 元素被截断或位置错乱

**解决方案**:

```javascript
// 1. 使用全屏模式 (F11)

// 2. 调整浏览器缩放 (Ctrl+0 重置为100%)

// 3. 修改分辨率适配
//    设置与投影/大屏匹配的分辨率
```

---

### 2. 背景图片/渐变不显示

**可能原因**:
1. 图片路径错误
2. CSS兼容性问题
3. 文件权限问题

**排查步骤**:

```javascript
// 1. 检查浏览器控制台错误

// 2. 检查图片URL是否可访问
//    在新标签页打开图片URL测试

// 3. 检查uploads目录是否存在
//    应该位于 server.js 同级目录
```

---

### 3. 动画效果缺失

**现象**: 抽奖时没有动画效果

**解决方案**:

```bash
# 1. 检查CSS文件是否加载
#    访问 http://localhost:3000/src/assets/*.css

# 2. 清除浏览器缓存
#    Ctrl+Shift+Delete

# 3. 检查动画配置
#    确保 animation_type 是 grid/sphere/list 之一
```

---

## 🔧 错误代码对照表

### HTTP状态码

| 状态码 | 说明 | 解决方案 |
|--------|------|---------|
| 200 | 成功 | - |
| 201 | 创建成功 | - |
| 400 | 请求参数错误 | 检查API请求格式 |
| 404 | 资源不存在 | 确认ID正确 |
| 409 | 资源冲突 | 重复创建或数据已存在 |
| 500 | 服务器错误 | 查看后端日志 |

### 自定义错误信息

| 错误信息 | 原因 | 解决方案 |
|---------|------|---------|
| "姓名不能为空" | name字段为空 | 提供name参数 |
| "该奖品已经抽完" | 库存不足 | 检查奖品数量配置 |
| "没有可参与抽奖的人员" | 无可用参与者 | 检查场次参与者 |
| "该人员已中过此奖品" | 防重机制 | 正常现象 |
| "该姓名和邮箱组合已存在" | 重复创建 | 使用已有记录 |

### Socket事件错误

| 事件 | 错误 | 解决方案 |
|------|------|---------|
| connect | 连接失败 | 检查服务器状态 |
| disconnect | 连接断开 | 刷新页面重连 |
| draw:result | 结果接收失败 | 检查网络状态 |

---

## 🛠️ 调试工具

### 1. 浏览器开发者工具

**打开方式**: F12

**常用标签**:

| 标签 | 用途 |
|------|------|
| Console | 查看JavaScript错误和日志 |
| Network | 查看网络请求和响应 |
| Sources | 调试JavaScript代码 |
| Elements | 检查HTML和CSS |

### 2. 后端日志

**启用详细日志**:

```javascript
// server.js 中添加
const debug = require('debug');
debug.enable('lottery:*');

# 启动时
DEBUG=lottery:* npm start
```

### 3. 数据库检查

```bash
# 打开SQLite交互式命令行
sqlite3 database.db

# 查看所有表
.tables

# 查看表结构
.schema participants

# 查看数据
SELECT * FROM participants LIMIT 5;
```

---

## 📞 获取帮助

### 信息收集

联系技术支持时，请提供：

1. **问题描述**: 详细说明发生了什么
2. **错误信息**: 截图或完整的错误文本
3. **操作步骤**: 复现问题的步骤
4. **环境信息**:
   - 操作系统版本
   - Node.js版本 (`node --version`)
   - 浏览器版本
   - 网络环境（局域网/互联网）

### 日志获取

```bash
# 导出最近日志（如有）
# 查看npm启动时的控制台输出

# 导出数据库状态
sqlite3 database.db ".dump" > database_dump.sql
```

---

## ✅ 自检清单

如遇问题，按以下清单自检：

```
□ 服务器是否运行 (http://localhost:3000 可访问)
□ 浏览器控制台是否有红色错误
□ Network标签是否有失败的请求
□ Socket.io是否显示已连接
□ 数据库文件是否存在且可写
□ 参与者和奖品是否已配置
□ 场次是否已关联参与者和奖品
```

---

## 📄 相关文档

- [DEPLOYMENT.md](./DEPLOYMENT.md) - 部署指南
- [API.md](./API.md) - API接口文档
- [DATABASE.md](./DATABASE.md) - 数据库设计
- [USER_GUIDE.md](./USER_GUIDE.md) - 使用指南
