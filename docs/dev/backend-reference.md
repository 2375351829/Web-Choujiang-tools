# Backend Development Reference

## Database Schema Quick Reference

### participants
| Column | Type | Default | Constraint |
|--------|------|---------|------------|
| id | INTEGER | AUTO | PRIMARY KEY |
| name | TEXT | - | NOT NULL |
| email | TEXT | '' | |
| phone | TEXT | '' | |
| avatar | TEXT | '' | |
| status | TEXT | '未中奖' | CHECK IN ('未中奖','已中奖') |
| is_blacklisted | INTEGER | 0 | CHECK IN (0,1) |
| weight | INTEGER | 1 | CHECK >= 0 |
| created_at | DATETIME | CURRENT_TIMESTAMP | |

### prizes
| Column | Type | Default | Constraint |
|--------|------|---------|------------|
| id | INTEGER | AUTO | PRIMARY KEY |
| name | TEXT | - | NOT NULL |
| description | TEXT | '' | |
| image | TEXT | '' | |
| weight | INTEGER | 1 | |
| draw_count | INTEGER | 1 | CHECK > 0 |
| created_at | DATETIME | CURRENT_TIMESTAMP | |

### lottery_sessions
| Column | Type | Default | Constraint |
|--------|------|---------|------------|
| id | INTEGER | AUTO | PRIMARY KEY |
| name | TEXT | - | NOT NULL |
| description | TEXT | '' | |
| status | TEXT | '未开始' | CHECK IN ('未开始','进行中','已结束') |
| created_at | DATETIME | CURRENT_TIMESTAMP | |
| updated_at | DATETIME | CURRENT_TIMESTAMP | |

### session_results
| Column | Type | Default | Constraint |
|--------|------|---------|------------|
| id | INTEGER | AUTO | PRIMARY KEY |
| session_id | INTEGER | - | FK → lottery_sessions(id) |
| participant_id | INTEGER | - | FK → participants(id) |
| prize_id | INTEGER | - | FK → prizes(id) |
| drawn_at | DATETIME | CURRENT_TIMESTAMP | |
| UNIQUE(session_id, participant_id, prize_id) | | | |

### lottery_config (single row, id=1)
| Column | Type | Default | Constraint |
|--------|------|---------|------------|
| background_type | TEXT | 'gradient' | CHECK IN ('gradient','color','image') |
| animation_type | TEXT | 'grid' | CHECK IN ('grid','sphere','list') |
| theme | TEXT | 'dark' | CHECK IN ('dark','light','ocean','forest','sunset','purple') |
| title | TEXT | '抽奖活动' | |
| show_participants | INTEGER | 1 | |
| show_prizes | INTEGER | 1 | |
| show_winner | INTEGER | 1 | |
| carousel_speed | INTEGER | 3000 | CHECK 500-10000 |
| gradient_start | TEXT | '#667eea' | |
| gradient_end | TEXT | '#764ba2' | |
| gradient_degree | INTEGER | 135 | CHECK 0-360 |
| background_color | TEXT | '#0f172a' | |
| current_session_id | INTEGER | NULL | |

## Key SQL Queries

### Get eligible participants for a draw
```sql
SELECT p.* FROM participants p
JOIN session_participants sp ON p.id = sp.participant_id
WHERE sp.session_id = ? AND p.is_blacklisted = 0
AND p.id NOT IN (
  SELECT participant_id FROM session_results
  WHERE session_id = ? AND prize_id = ?
);
```

### Check remaining prize stock
```sql
SELECT sp.quantity - COUNT(sr.id) as remaining
FROM session_prizes sp
LEFT JOIN session_results sr ON sp.session_id = sr.session_id AND sp.prize_id = sr.prize_id
WHERE sp.session_id = ? AND sp.prize_id = ?
GROUP BY sp.prize_id;
```

### Get session full results
```sql
SELECT sr.drawn_at, p.name as participant_name, p.email, p.phone, pr.name as prize_name
FROM session_results sr
JOIN participants p ON sr.participant_id = p.id
JOIN prizes pr ON sr.prize_id = pr.id
WHERE sr.session_id = ?
ORDER BY sr.drawn_at DESC;
```

### Partial update helper (use COALESCE)
```sql
UPDATE participants
SET name = COALESCE(?, name),
    email = COALESCE(?, email),
    phone = COALESCE(?, phone),
    weight = COALESCE(?, weight)
WHERE id = ?;
```

## Triggers (auto-managed)

1. `trg_participant_status_sync`: INSERT on session_results → set participant status to '已中奖'
2. `trg_participant_result_delete`: DELETE on session_results → check if participant has other wins
3. `trg_session_updated_at`: UPDATE on lottery_sessions → auto-update updated_at

## Error Response Patterns

```javascript
// 400 - Bad Request
res.status(400).json({ success: false, error: '具体错误描述' })

// 404 - Not Found
res.status(404).json({ success: false, error: '资源不存在' })

// 409 - Conflict
res.status(409).json({ success: false, error: '资源已存在' })

// 500 - Server Error
res.status(500).json({ success: false, error: err.message })
```
