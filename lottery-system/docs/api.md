# API 接口文档

## 基础信息

- **Base URL**: `http://localhost:3000/api`
- **Content-Type**: `application/json`
- **字符编码**: `UTF-8`

## 目录

- [场景管理](#场景管理)
- [人员管理](#人员管理)
- [奖品管理](#奖品管理)
- [场次管理](#场次管理)
- [抽奖控制](#抽奖控制)
- [系统配置](#系统配置)
- [文件上传](#文件上传)
- [字段配置](#字段配置)
- [数据库管理](#数据库管理)

---

## 场景管理

### 获取场景列表

```
GET /api/scenes
```

**响应示例**:

```json
[
  {
    "id": 1,
    "name": "校园抽奖",
    "code": "campus",
    "icon": "🏫",
    "description": "适用于学校、学院、班级、社团等校园场景",
    "title": "校园幸运抽奖",
    "gradient_start": "#1e3a5f",
    "gradient_end": "#3b82f6",
    "background_color": "#1d4ed8",
    "is_default": 1,
    "created_at": "2024-01-01 00:00:00"
  }
]
```

### 获取场景详情

```
GET /api/scenes/:id
```

**响应示例**:

```json
{
  "id": 1,
  "name": "校园抽奖",
  "code": "campus",
  "icon": "🏫",
  "description": "适用于学校、学院、班级、社团等校园场景",
  "title": "校园幸运抽奖",
  "gradient_start": "#1e3a5f",
  "gradient_end": "#3b82f6",
  "background_color": "#1d4ed8",
  "theme": "dark",
  "animation_type": "slot",
  "is_default": 1
}
```

### 创建场景

```
POST /api/scenes
```

**请求体**:

```json
{
  "name": "新场景",
  "code": "new_scene",
  "icon": "🎁",
  "description": "场景描述",
  "title": "场景标题",
  "gradient_start": "#667eea",
  "gradient_end": "#764ba2",
  "background_color": "#0f172a"
}
```

**响应**: 返回创建的场景对象

### 更新场景

```
PUT /api/scenes/:id
```

**请求体**:

```json
{
  "name": "更新后的名称",
  "icon": "🎉",
  "description": "更新后的描述",
  "title": "更新后的标题",
  "gradient_start": "#ff6b6b",
  "gradient_end": "#feca57",
  "background_color": "#1a1a2e",
  "theme": "dark",
  "animation_type": "slot"
}
```

### 删除场景

```
DELETE /api/scenes/:id
```

**注意**: 默认场景不能删除

### 切换场景

```
POST /api/scenes/switch/:id
```

**响应示例**:

```json
{
  "success": true,
  "scene": {
    "id": 1,
    "name": "校园抽奖"
  }
}
```

### 获取场景统计

```
GET /api/scenes/:id/stats
```

**响应示例**:

```json
{
  "participants": 100,
  "prizes": 10,
  "sessions": 5
}
```

---

## 人员管理

### 获取人员列表

```
GET /api/participants
```

**查询参数**:

| 参数 | 类型 | 说明 |
|------|------|------|
| scene_id | number | 场景ID，筛选指定场景的人员 |

**响应示例**:

```json
[
  {
    "id": 1,
    "scene_id": 1,
    "name": "张三",
    "email": "zhangsan@example.com",
    "phone": "13800138000",
    "avatar": "",
    "status": "正常",
    "weight": 50,
    "is_blacklisted": 0,
    "created_at": "2024-01-01 00:00:00"
  }
]
```

### 获取人员详情

```
GET /api/participants/:id
```

### 创建人员

```
POST /api/participants
```

**请求体**:

```json
{
  "scene_id": 1,
  "name": "新人员",
  "email": "new@example.com",
  "phone": "13900139000",
  "avatar": "",
  "status": "正常",
  "weight": 50,
  "is_blacklisted": 0
}
```

### 批量创建人员

```
POST /api/participants/batch
```

**请求体**:

```json
{
  "scene_id": 1,
  "participants": [
    { "name": "人员1", "email": "p1@example.com", "phone": "13800000001" },
    { "name": "人员2", "email": "p2@example.com", "phone": "13800000002" }
  ]
}
```

### 更新人员

```
PUT /api/participants/:id
```

### 删除人员

```
DELETE /api/participants/:id
```

### 批量删除人员

```
POST /api/participants/batch-delete
```

**请求体**:

```json
{
  "ids": [1, 2, 3]
}
```

---

## 奖品管理

### 获取奖品列表

```
GET /api/prizes
```

**查询参数**:

| 参数 | 类型 | 说明 |
|------|------|------|
| scene_id | number | 场景ID |

**响应示例**:

```json
[
  {
    "id": 1,
    "scene_id": 1,
    "name": "一等奖",
    "description": "iPhone 15 Pro",
    "image_url": "/uploads/prize.jpg",
    "count": 1,
    "level": "一等奖",
    "created_at": "2024-01-01 00:00:00"
  }
]
```

### 创建奖品

```
POST /api/prizes
```

**请求体**:

```json
{
  "scene_id": 1,
  "name": "特等奖",
  "description": "大奖描述",
  "image_url": "",
  "count": 1,
  "level": "特等奖"
}
```

### 更新奖品

```
PUT /api/prizes/:id
```

### 删除奖品

```
DELETE /api/prizes/:id
```

---

## 场次管理

### 获取场次列表

```
GET /api/sessions
```

**查询参数**:

| 参数 | 类型 | 说明 |
|------|------|------|
| scene_id | number | 场景ID |

**响应示例**:

```json
[
  {
    "id": 1,
    "scene_id": 1,
    "name": "年会抽奖",
    "description": "2024年年会抽奖活动",
    "status": "未开始",
    "created_at": "2024-01-01 00:00:00"
  }
]
```

### 获取场次详情

```
GET /api/sessions/:id
```

**响应示例**:

```json
{
  "id": 1,
  "name": "年会抽奖",
  "description": "2024年年会抽奖活动",
  "status": "进行中",
  "participants": [
    {
      "id": 1,
      "name": "张三",
      "status": "已中奖"
    }
  ],
  "prizes": [
    {
      "id": 1,
      "name": "一等奖",
      "quantity": 1,
      "remaining": 0
    }
  ],
  "results": [
    {
      "participant_name": "张三",
      "prize_name": "一等奖",
      "prize_level": "一等奖",
      "drawn_at": "2024-01-01 12:00:00"
    }
  ]
}
```

### 创建场次

```
POST /api/sessions
```

**请求体**:

```json
{
  "name": "新场次",
  "description": "场次描述",
  "scene_id": 1
}
```

### 更新场次

```
PUT /api/sessions/:id
```

### 删除场次

```
DELETE /api/sessions/:id
```

### 关联参与者

```
POST /api/sessions/:id/participants
```

**请求体**:

```json
{
  "participant_ids": [1, 2, 3, 4, 5]
}
```

### 关联奖品

```
POST /api/sessions/:id/prizes
```

**请求体**:

```json
{
  "prize_id": 1,
  "quantity": 5
}
```

### 移除奖品

```
DELETE /api/sessions/:id/prizes/:prize_id
```

### 单次抽奖

```
POST /api/sessions/:id/draw
```

**请求体**:

```json
{
  "prize_id": 1
}
```

**响应示例**:

```json
{
  "success": true,
  "winners": [
    {
      "id": 5,
      "name": "王五",
      "email": "wangwu@example.com",
      "phone": "13800138005"
    }
  ],
  "prize": {
    "id": 1,
    "name": "一等奖",
    "level": "一等奖"
  },
  "drawn_at": "2024-01-01T12:00:00.000Z"
}
```

### 批量抽奖

```
POST /api/sessions/:id/draw/batch
```

**请求体**:

```json
{
  "prize_id": 1,
  "count": 5,
  "exclude_previous_winners": true
}
```

### 按等级抽奖

```
POST /api/sessions/:id/draw/by-level
```

**请求体**:

```json
{
  "level": "三等奖",
  "count": 10,
  "exclude_previous_winners": true
}
```

### 多奖品抽奖

```
POST /api/sessions/:id/draw/multi-prizes
```

**请求体**:

```json
{
  "draws": [
    { "prize_id": 1, "count": 1 },
    { "prize_id": 2, "count": 3 },
    { "prize_id": 3, "count": 5 }
  ]
}
```

### 获取奖品等级

```
GET /api/sessions/:id/prize-levels
```

**响应示例**:

```json
[
  {
    "level": "特等奖",
    "prize_count": 1,
    "total_quantity": 1,
    "remaining": 1
  },
  {
    "level": "一等奖",
    "prize_count": 2,
    "total_quantity": 5,
    "remaining": 3
  }
]
```

### 重置场次

```
POST /api/sessions/:id/reset
```

清除该场次的所有抽奖结果，恢复人员状态。

---

## 抽奖控制

### 开始抽奖动画

```
POST /api/console/start
```

**请求体**:

```json
{
  "session_id": 1,
  "prize_id": 1,
  "prize_name": "一等奖",
  "prize_level": "一等奖"
}
```

**响应示例**:

```json
{
  "success": true,
  "message": "抽奖动画已开始"
}
```

**说明**: 此接口仅触发展示端动画，不执行实际抽奖。

### 停止抽奖并出结果

```
POST /api/console/stop
```

**请求体**:

```json
{
  "session_id": 1,
  "prize_id": 1,
  "count": 1,
  "allow_repeat": false
}
```

**响应示例**:

```json
{
  "success": true,
  "winners": [
    {
      "id": 5,
      "name": "王五",
      "email": "wangwu@example.com",
      "phone": "13800138005"
    }
  ],
  "prize": {
    "id": 1,
    "name": "一等奖",
    "level": "一等奖"
  }
}
```

### 暂停抽奖

```
POST /api/console/pause
```

### 重置抽奖

```
POST /api/console/reset
```

---

## 系统配置

### 获取配置

```
GET /api/config
```

**响应示例**:

```json
{
  "id": 1,
  "current_scene_id": 1,
  "current_session_id": 1,
  "title": "抽奖活动",
  "background_type": "gradient",
  "background_color": "#0f172a",
  "background_image": "",
  "gradient_start": "#667eea",
  "gradient_end": "#764ba2",
  "gradient_degree": 135,
  "theme": "dark",
  "animation_type": "slot",
  "show_participants": 1,
  "show_prizes": 1,
  "show_winner": 1,
  "carousel_speed": 3000,
  "layout_config": "{}"
}
```

### 更新配置

```
PUT /api/config
```

**请求体**:

```json
{
  "title": "新年抽奖",
  "background_type": "gradient",
  "gradient_start": "#ff6b6b",
  "gradient_end": "#feca57",
  "show_participants": 1,
  "show_prizes": 1,
  "show_winner": 1
}
```

---

## 文件上传

### 上传文件

```
POST /api/upload
Content-Type: multipart/form-data
```

**表单字段**:

| 字段 | 类型 | 说明 |
|------|------|------|
| file | File | 上传的文件 |

**响应示例**:

```json
{
  "success": true,
  "url": "/uploads/1234567890.jpg"
}
```

---

## 字段配置

### 获取字段配置列表

```
GET /api/field-configs
```

**查询参数**:

| 参数 | 类型 | 说明 |
|------|------|------|
| scene_id | number | 场景ID |

**响应示例**:

```json
[
  {
    "id": 1,
    "scene_id": 1,
    "field_key": "student_id",
    "field_name": "学号",
    "field_type": "text",
    "required": 0,
    "placeholder": "请输入学号",
    "default_value": "",
    "validation_rule": "^[A-Za-z0-9]+$",
    "options": "",
    "sort_order": 2
  }
]
```

### 创建字段配置

```
POST /api/field-configs
```

**请求体**:

```json
{
  "scene_id": 1,
  "field_key": "custom_field",
  "field_name": "自定义字段",
  "field_type": "text",
  "required": 0,
  "placeholder": "请输入",
  "sort_order": 10
}
```

### 更新字段配置

```
PUT /api/field-configs/:id
```

### 删除字段配置

```
DELETE /api/field-configs/:id
```

---

## 数据库管理

### 导出数据库

```
GET /api/database/export
```

**响应**: 数据库文件下载

### 导入数据库

```
POST /api/database/import
Content-Type: multipart/form-data
```

**表单字段**:

| 字段 | 类型 | 说明 |
|------|------|------|
| database | File | 数据库文件 (.db) |

### 重置数据库

```
POST /api/database/reset
```

**警告**: 此操作将清除所有数据！

---

## Socket.IO 事件

### 客户端发送事件

| 事件 | 数据 | 说明 |
|------|------|------|
| display:join | `{ sessionId }` | 展示端加入场次房间 |
| display:status | `{ currentSessionId }` | 展示端状态上报 |
| config:update | `{ ...config }` | 配置更新广播 |

### 服务端广播事件

| 事件 | 数据 | 说明 |
|------|------|------|
| config:updated | `{ ...config }` | 配置已更新 |
| draw:start | `{ session_id, prize_id, prize_name, prize_level }` | 开始抽奖 |
| draw:result | `{ winners, prize }` | 抽奖结果 |
| draw:pause | - | 暂停抽奖 |
| draw:reset | - | 重置抽奖 |
| display:statusUpdate | `{ connected, sessionId, lastActivity }` | 展示端状态更新 |

---

## 错误响应

所有 API 在发生错误时返回统一格式：

```json
{
  "error": "错误信息描述"
}
```

### 常见错误码

| HTTP 状态码 | 说明 |
|-------------|------|
| 400 | 请求参数错误 |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |
