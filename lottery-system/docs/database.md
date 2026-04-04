# 数据库文档

## 概述

抽奖系统使用 SQLite 数据库，通过 sql.js 库在内存中运行，数据持久化到文件 `backend/database.db`。

## 数据库架构图

```
┌─────────────────┐       ┌─────────────────────┐
│     scenes      │       │ scene_field_configs │
├─────────────────┤       ├─────────────────────┤
│ id (PK)         │◄──────│ scene_id (FK)       │
│ name            │       │ field_key           │
│ code            │       │ field_name          │
│ icon            │       │ field_type          │
│ description     │       └─────────────────────┘
│ title           │
│ background_*    │       ┌─────────────────────────────┐
│ theme           │       │ participant_extended_data   │
│ animation_type  │       ├─────────────────────────────┤
│ is_default      │       │ id (PK)                     │
└────────┬────────┘       │ participant_id (FK)         │
         │                │ field_key                   │
         │                │ field_value                 │
         │                └─────────────────────────────┘
         │
         │                ┌─────────────────┐
         │                │  participants   │
         │                ├─────────────────┤
         └───────────────►│ id (PK)         │
                          │ scene_id (FK)   │
                          │ name            │
                          │ email           │
                          │ phone           │
                          │ avatar          │
                          │ status          │
                          │ weight          │
                          │ is_blacklisted  │
                          └────────┬────────┘
                                   │
         ┌─────────────────────────┼─────────────────────────┐
         │                         │                         │
         ▼                         ▼                         ▼
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│session_participants│   │  draw_results   │      │     prizes      │
├─────────────────┤      ├─────────────────┤      ├─────────────────┤
│ session_id (FK) │      │ id (PK)         │      │ id (PK)         │
│ participant_id  │      │ session_id (FK) │      │ scene_id (FK)   │
└─────────────────┘      │ participant_id  │      │ name            │
                         │ prize_id (FK)   │      │ description     │
                         │ drawn_at        │      │ image_url       │
                         └─────────────────┘      │ count           │
                                                  │ level           │
                                                  └────────┬────────┘
                                                           │
                          ┌────────────────────────────────┘
                          │
                          ▼
                 ┌─────────────────┐
                 │ session_prizes  │
                 ├─────────────────┤
                 │ session_id (FK) │
                 │ prize_id (FK)   │
                 │ quantity        │
                 └─────────────────┘

┌─────────────────┐       ┌─────────────────┐
│    sessions     │       │ lottery_config  │
├─────────────────┤       ├─────────────────┤
│ id (PK)         │       │ id (PK)         │
│ scene_id (FK)   │       │ current_scene_id│
│ name            │       │ current_session │
│ description     │       │ title           │
│ status          │       │ background_*    │
│ created_at      │       │ theme           │
│ updated_at      │       │ animation_type  │
└─────────────────┘       │ show_*          │
                          │ layout_config   │
                          └─────────────────┘
```

## 数据表详解

### 1. scenes（场景表）

存储抽奖场景配置。

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | 场景ID |
| name | TEXT | NOT NULL | 场景名称 |
| code | TEXT | UNIQUE NOT NULL | 场景代码（唯一标识） |
| icon | TEXT | DEFAULT '🎁' | 场景图标 |
| description | TEXT | - | 场景描述 |
| title | TEXT | DEFAULT '幸运抽奖' | 显示标题 |
| background_type | TEXT | DEFAULT 'gradient' | 背景类型：gradient/color/image |
| background_image | TEXT | DEFAULT '' | 背景图片URL |
| background_color | TEXT | DEFAULT '#0f172a' | 背景颜色 |
| gradient_start | TEXT | DEFAULT '#667eea' | 渐变起始色 |
| gradient_end | TEXT | DEFAULT '#764ba2' | 渐变结束色 |
| gradient_degree | INTEGER | DEFAULT 135 | 渐变角度 |
| theme | TEXT | DEFAULT 'dark' | 主题：dark/light |
| animation_type | TEXT | DEFAULT 'slot' | 动画类型 |
| is_default | INTEGER | DEFAULT 0 | 是否默认场景 |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | 创建时间 |

**预置场景**：

| id | name | code | icon |
|----|------|------|------|
| 1 | 校园抽奖 | campus | 🏫 |
| 2 | 公司年会 | company | 🏢 |
| 3 | 社区活动 | community | 🏘️ |
| 4 | 社团活动 | club | 🎯 |
| 5 | 班级活动 | class | 📚 |
| 6 | 教职工抽奖 | faculty | 👨‍🏫 |
| 7 | 通用抽奖 | general | 🎁 |

### 2. participants（人员表）

存储参与抽奖的人员信息。

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | 人员ID |
| scene_id | INTEGER | - | 所属场景ID |
| name | TEXT | NOT NULL | 姓名 |
| email | TEXT | - | 邮箱 |
| phone | TEXT | - | 电话 |
| avatar | TEXT | DEFAULT '' | 头像URL |
| status | TEXT | DEFAULT '待审核' | 状态：正常/待审核/停用/已中奖 |
| weight | INTEGER | DEFAULT 50 | 中奖权重（1-100） |
| is_blacklisted | INTEGER | DEFAULT 0 | 是否黑名单 |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | 创建时间 |

**索引**：
- `idx_participants_name` - 姓名索引
- `idx_participants_scene` - 场景索引

### 3. prizes（奖品表）

存储奖品信息。

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | 奖品ID |
| scene_id | INTEGER | - | 所属场景ID |
| name | TEXT | NOT NULL | 奖品名称 |
| description | TEXT | - | 奖品描述 |
| image_url | TEXT | DEFAULT '' | 奖品图片URL |
| count | INTEGER | DEFAULT 1 | 数量 |
| level | TEXT | DEFAULT '三等奖' | 等级：特等奖/一等奖/二等奖/三等奖/参与奖 |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | 创建时间 |

**索引**：
- `idx_prizes_scene` - 场景索引

### 4. sessions（场次表）

存储抽奖场次信息。

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | 场次ID |
| scene_id | INTEGER | - | 所属场景ID |
| name | TEXT | NOT NULL | 场次名称 |
| description | TEXT | - | 场次描述 |
| status | TEXT | DEFAULT '未开始' | 状态：未开始/进行中/已结束 |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | 更新时间 |

**索引**：
- `idx_sessions_status` - 状态索引
- `idx_sessions_scene` - 场景索引

### 5. session_participants（场次-人员关联表）

存储场次与人员的多对多关系。

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| session_id | INTEGER | PRIMARY KEY | 场次ID |
| participant_id | INTEGER | PRIMARY KEY | 人员ID |

### 6. session_prizes（场次-奖品关联表）

存储场次与奖品的关联关系，包含数量。

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| session_id | INTEGER | PRIMARY KEY | 场次ID |
| prize_id | INTEGER | PRIMARY KEY | 奖品ID |
| quantity | INTEGER | DEFAULT 1 | 该场次的奖品数量 |

### 7. draw_results（抽奖结果表）

存储抽奖结果记录。

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | 记录ID |
| session_id | INTEGER | - | 场次ID |
| participant_id | INTEGER | - | 中奖人员ID |
| prize_id | INTEGER | - | 奖品ID |
| drawn_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | 抽奖时间 |

**约束**：
- `UNIQUE(session_id, participant_id, prize_id)` - 防止重复中奖记录

**索引**：
- `idx_draw_results_session_prize` - 场次+奖品索引
- `idx_draw_results_participant` - 人员索引

### 8. scene_field_configs（场景字段配置表）

存储场景自定义字段配置。

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | 配置ID |
| scene_id | INTEGER | NOT NULL | 场景ID |
| field_key | TEXT | NOT NULL | 字段键名 |
| field_name | TEXT | NOT NULL | 字段显示名 |
| field_type | TEXT | DEFAULT 'text' | 字段类型：text/select/date/json |
| required | INTEGER | DEFAULT 0 | 是否必填 |
| placeholder | TEXT | - | 占位文本 |
| default_value | TEXT | - | 默认值 |
| validation_rule | TEXT | - | 验证规则（正则） |
| options | TEXT | - | 选项配置（JSON） |
| sort_order | INTEGER | DEFAULT 0 | 排序顺序 |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | 创建时间 |

**约束**：
- `UNIQUE(scene_id, field_key)` - 同一场景下字段键唯一

**索引**：
- `idx_scene_field_configs_scene` - 场景索引

### 9. participant_extended_data（人员扩展数据表）

存储人员的自定义字段值。

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | 记录ID |
| participant_id | INTEGER | NOT NULL | 人员ID |
| field_key | TEXT | NOT NULL | 字段键名 |
| field_value | TEXT | - | 字段值 |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | 更新时间 |

**约束**：
- `UNIQUE(participant_id, field_key)` - 同一人员下字段键唯一

**索引**：
- `idx_participant_extended_participant` - 人员索引

### 10. lottery_config（系统配置表）

存储系统全局配置。

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INTEGER | PRIMARY KEY DEFAULT 1 | 配置ID（单例） |
| current_scene_id | INTEGER | - | 当前场景ID |
| background_type | TEXT | DEFAULT 'gradient' | 背景类型 |
| background_image | TEXT | DEFAULT '' | 背景图片 |
| background_color | TEXT | DEFAULT '#0f172a' | 背景颜色 |
| background_size | TEXT | DEFAULT 'cover' | 背景尺寸 |
| gradient_start | TEXT | DEFAULT '#667eea' | 渐变起始色 |
| gradient_end | TEXT | DEFAULT '#764ba2' | 渐变结束色 |
| gradient_degree | INTEGER | DEFAULT 135 | 渐变角度 |
| show_participants | INTEGER | DEFAULT 1 | 显示参与者列表 |
| show_prizes | INTEGER | DEFAULT 1 | 显示奖品列表 |
| show_winner | INTEGER | DEFAULT 1 | 显示中奖记录 |
| carousel_speed | INTEGER | DEFAULT 3000 | 轮播速度（毫秒） |
| title | TEXT | DEFAULT '抽奖活动' | 活动标题 |
| animation_type | TEXT | DEFAULT 'slot' | 动画类型 |
| current_session_id | INTEGER | - | 当前场次ID |
| theme | TEXT | DEFAULT 'dark' | 主题 |
| layout_config | TEXT | DEFAULT '{}' | 布局配置（JSON） |

## 数据迁移

系统启动时会自动执行数据迁移，添加新增字段。

### 迁移脚本位置

`backend/models/database.js` - `migrateTables()` 函数

### 已执行的迁移

1. 添加 `participants.scene_id` 字段
2. 添加 `prizes.scene_id` 字段
3. 添加 `sessions.scene_id` 字段
4. 添加 `lottery_config.current_scene_id` 字段
5. 添加 `lottery_config.background_size` 字段
6. 添加 `lottery_config.layout_config` 字段

## 数据库操作

### 查询示例

```sql
-- 获取场景下的人员列表
SELECT * FROM participants WHERE scene_id = 1;

-- 获取场次的参与人员（含中奖状态）
SELECT p.*, 
  CASE WHEN EXISTS(
    SELECT 1 FROM draw_results dr 
    WHERE dr.participant_id = p.id AND dr.session_id = 1
  ) THEN '已中奖' ELSE '未中奖' END as status
FROM participants p
JOIN session_participants sp ON p.id = sp.participant_id
WHERE sp.session_id = 1;

-- 获取场次的奖品及剩余数量
SELECT pr.*, sp.quantity,
  sp.quantity - (SELECT COUNT(*) FROM draw_results 
                 WHERE session_id = 1 AND prize_id = pr.id) as remaining
FROM prizes pr
JOIN session_prizes sp ON pr.id = sp.prize_id
WHERE sp.session_id = 1;

-- 获取中奖记录
SELECT dr.drawn_at, p.name as participant_name, pr.name as prize_name, pr.level
FROM draw_results dr
JOIN participants p ON dr.participant_id = p.id
JOIN prizes pr ON dr.prize_id = pr.id
WHERE dr.session_id = 1
ORDER BY dr.drawn_at DESC;
```

### 数据库维护

**备份数据库**：

```bash
cp backend/database.db backend/database_backup_$(date +%Y%m%d).db
```

**重置数据库**：

删除 `backend/database.db` 文件，重启服务将自动创建新数据库。

## 性能优化建议

1. **索引优化**：已在常用查询字段上创建索引
2. **定期清理**：定期清理历史抽奖结果数据
3. **数据归档**：将历史场次数据归档到单独的表
