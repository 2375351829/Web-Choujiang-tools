# 抽奖系统 API接口设计文档
**版本**: v1.0.0 | **日期**: 2026-04-03

---

## 1. API概述

| 项目 | 说明 |
|------|------|
| 基础URL | http://localhost:3000/api |
| 通信协议 | HTTP REST + WebSocket |
| 数据格式 | JSON |
| 字符编码 | UTF-8 |
| 认证方式 | 暂无（局域网使用） |

---

## 2. 统一响应格式

**成功响应：**

```json
{
  "success": true,
  "data": { ... }
}
```

**失败响应：**

```json
{
  "success": false,
  "error": "错误描述"
}
```

**列表响应：** 直接返回数组

```json
[ ... ]
```

---

## 3. REST API详细设计

### 3.1 人员管理 `/api/participants`

#### `GET /api/participants` - 获取人员列表

**查询参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| status | string | 否 | 筛选状态：`已中奖` / `未中奖` |
| blacklist | number | 否 | 筛选黑名单：`0` / `1` |
| search | string | 否 | 按姓名、邮箱、手机号模糊搜索 |
| page | number | 否 | 页码，默认 `1` |
| pageSize | number | 否 | 每页数量，默认 `20` |

**响应 `200 OK`：** 人员数组

```json
[
  {
    "id": 1,
    "name": "张三",
    "email": "zhangsan@example.com",
    "phone": "13800138000",
    "weight": 1,
    "status": "未中奖",
    "is_blacklisted": 0,
    "created_at": "2026-04-03T10:00:00.000Z",
    "updated_at": "2026-04-03T10:00:00.000Z"
  }
]
```

---

#### `GET /api/participants/:id` - 获取单个人员

**路径参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | number | 是 | 人员ID |

**响应 `200 OK`：** 人员对象

```json
{
  "id": 1,
  "name": "张三",
  "email": "zhangsan@example.com",
  "phone": "13800138000",
  "weight": 1,
  "status": "未中奖",
  "is_blacklisted": 0,
  "created_at": "2026-04-03T10:00:00.000Z",
  "updated_at": "2026-04-03T10:00:00.000Z"
}
```

**响应 `404 Not Found`：**

```json
{
  "success": false,
  "error": "人员不存在"
}
```

---

#### `POST /api/participants` - 创建人员

**请求体：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| name | string | 是 | 姓名 |
| email | string | 否 | 邮箱 |
| phone | string | 否 | 手机号 |
| weight | number | 否 | 权重，默认 `1` |

**响应 `201 Created`：** 创建的人员对象

```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "张三",
    "email": "zhangsan@example.com",
    "phone": "13800138000",
    "weight": 1,
    "status": "未中奖",
    "is_blacklisted": 0,
    "created_at": "2026-04-03T10:00:00.000Z",
    "updated_at": "2026-04-03T10:00:00.000Z"
  }
}
```

**响应 `400 Bad Request`：**

```json
{
  "success": false,
  "error": "姓名不能为空"
}
```

**响应 `409 Conflict`：**

```json
{
  "success": false,
  "error": "该人员已存在"
}
```

---

#### `PUT /api/participants/:id` - 更新人员

**请求体：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| name | string | 否 | 姓名 |
| email | string | 否 | 邮箱 |
| phone | string | 否 | 手机号 |
| weight | number | 否 | 权重 |

**响应 `200 OK`：** 更新后的人员对象

```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "张三",
    "email": "zhangsan@example.com",
    "phone": "13800138000",
    "weight": 2,
    "status": "未中奖",
    "is_blacklisted": 0,
    "created_at": "2026-04-03T10:00:00.000Z",
    "updated_at": "2026-04-03T11:00:00.000Z"
  }
}
```

---

#### `DELETE /api/participants/:id` - 删除人员

**响应 `200 OK`：**

```json
{
  "success": true,
  "message": "人员已删除"
}
```

---

#### `PUT /api/participants/:id/status` - 更新状态

**请求体：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| status | string | 是 | 状态值：`已中奖` 或 `未中奖` |

**响应 `200 OK`：** 更新后的人员对象

---

#### `PUT /api/participants/:id/blacklist` - 黑名单管理

**请求体：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| is_blacklisted | number | 是 | `0` - 移出黑名单，`1` - 加入黑名单 |

**响应 `200 OK`：** 更新后的人员对象

---

#### `POST /api/participants/import` - 批量导入

**请求体：** `FormData`

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| file | File | 是 | CSV/Excel 文件 |
| session_id | number | 否 | 关联场次ID |

**响应 `200 OK`：**

```json
{
  "success": true,
  "imported": 95,
  "skipped": 5
}
```

---

### 3.2 奖品管理 `/api/prizes`

#### `GET /api/prizes` - 获取奖品列表

**响应 `200 OK`：** 奖品数组

```json
[
  {
    "id": 1,
    "name": "一等奖 - iPhone 16 Pro",
    "description": "苹果最新旗舰手机",
    "image": "/uploads/prize_iphone.jpg",
    "total_quantity": 1,
    "remaining_quantity": 1,
    "created_at": "2026-04-03T10:00:00.000Z",
    "updated_at": "2026-04-03T10:00:00.000Z"
  }
]
```

---

#### `GET /api/prizes/:id` - 获取单个奖品

**路径参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | number | 是 | 奖品ID |

**响应 `200 OK`：** 奖品对象

**响应 `404 Not Found`：**

```json
{
  "success": false,
  "error": "奖品不存在"
}
```

---

#### `POST /api/prizes` - 创建奖品

支持两种请求格式：

**格式一：JSON**

```json
{
  "name": "一等奖 - iPhone 16 Pro",
  "description": "苹果最新旗舰手机",
  "total_quantity": 1
}
```

**格式二：FormData**（含图片上传）

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| name | string | 是 | 奖品名称 |
| description | string | 否 | 奖品描述 |
| total_quantity | number | 是 | 奖品总数量 |
| image | File | 否 | 奖品图片 |

**响应 `201 Created`：** 创建的奖品对象

---

#### `PUT /api/prizes/:id` - 更新奖品

支持 JSON 和 FormData 两种格式，字段同创建接口。

**响应 `200 OK`：** 更新后的奖品对象

---

#### `DELETE /api/prizes/:id` - 删除奖品

**响应 `200 OK`：**

```json
{
  "success": true,
  "message": "奖品已删除"
}
```

---

### 3.3 场次管理 `/api/sessions`

#### `GET /api/sessions` - 获取场次列表

**响应 `200 OK`：** 场次数组

```json
[
  {
    "id": 1,
    "name": "2026年度年会抽奖",
    "description": "公司年会抽奖活动",
    "status": "进行中",
    "participant_count": 100,
    "prize_count": 5,
    "created_at": "2026-04-03T10:00:00.000Z",
    "updated_at": "2026-04-03T10:00:00.000Z"
  }
]
```

---

#### `GET /api/sessions/:id` - 获取场次详情

返回场次完整信息，包含参与者列表、奖品列表和抽奖结果。

**响应 `200 OK`：**

```json
{
  "id": 1,
  "name": "2026年度年会抽奖",
  "description": "公司年会抽奖活动",
  "status": "进行中",
  "participants": [ ... ],
  "prizes": [ ... ],
  "results": [
    {
      "id": 1,
      "participant": { "id": 1, "name": "张三" },
      "prize": { "id": 1, "name": "一等奖" },
      "drawn_at": "2026-04-03T11:00:00.000Z"
    }
  ],
  "created_at": "2026-04-03T10:00:00.000Z",
  "updated_at": "2026-04-03T10:00:00.000Z"
}
```

---

#### `POST /api/sessions` - 创建场次

**请求体：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| name | string | 是 | 场次名称 |
| description | string | 否 | 场次描述 |

**响应 `201 Created`：** 创建的场次对象

---

#### `PUT /api/sessions/:id` - 更新场次

**请求体：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| name | string | 否 | 场次名称 |
| description | string | 否 | 场次描述 |
| status | string | 否 | 场次状态 |

**响应 `200 OK`：** 更新后的场次对象

---

#### `DELETE /api/sessions/:id` - 删除场次

**响应 `200 OK`：**

```json
{
  "success": true,
  "message": "场次已删除"
}
```

---

#### `POST /api/sessions/:id/participants` - 添加参与者到场次

**请求体：**

```json
{
  "participant_ids": [1, 2, 3]
}
```

**响应 `200 OK`：**

```json
{
  "success": true,
  "added": 3
}
```

---

#### `DELETE /api/sessions/:id/participants/:participantId` - 移除参与者

**响应 `200 OK`：**

```json
{
  "success": true,
  "message": "参与者已移除"
}
```

---

#### `POST /api/sessions/:id/prizes` - 添加奖品到场次

**请求体：**

```json
{
  "prize_id": 1,
  "quantity": 3
}
```

**响应 `200 OK`：**

```json
{
  "success": true,
  "message": "奖品已添加到场次"
}
```

---

#### `DELETE /api/sessions/:id/prizes/:prizeId` - 移除奖品

**响应 `200 OK`：**

```json
{
  "success": true,
  "message": "奖品已移除"
}
```

---

#### `POST /api/sessions/:id/draw` - 执行抽奖

**请求体：**

```json
{
  "prize_id": 1
}
```

**响应 `200 OK`：**

```json
{
  "success": true,
  "data": {
    "winner": {
      "id": 1,
      "name": "张三",
      "email": "zhangsan@example.com",
      "phone": "13800138000"
    },
    "prize": {
      "id": 1,
      "name": "一等奖 - iPhone 16 Pro",
      "description": "苹果最新旗舰手机"
    },
    "drawn_at": "2026-04-03T11:00:00.000Z"
  }
}
```

**错误响应 `400 Bad Request`：**

```json
{
  "success": false,
  "error": "奖品库存不足"
}
```

```json
{
  "success": false,
  "error": "无可用参与者"
}
```

---

### 3.4 控制台 `/api/console`

#### `POST /api/console/start` - 开始抽奖

**请求体：**

```json
{
  "session_id": 1,
  "prize_id": 1
}
```

**响应 `200 OK`：**

```json
{
  "success": true,
  "message": "抽奖已开始"
}
```

**副作用：** WebSocket 广播 `draw:start` 事件

---

#### `POST /api/console/pause` - 暂停抽奖

**响应 `200 OK`：**

```json
{
  "success": true,
  "message": "抽奖已暂停"
}
```

**副作用：** WebSocket 广播 `draw:pause` 事件

---

#### `POST /api/console/stop` - 停止抽奖

**响应 `200 OK`：**

```json
{
  "success": true,
  "data": {
    "winner": { ... },
    "prize": { ... },
    "drawn_at": "2026-04-03T11:00:00.000Z"
  }
}
```

**副作用：** WebSocket 广播 `draw:stop` 和 `draw:result` 事件

---

#### `POST /api/console/reset` - 重置抽奖

**响应 `200 OK`：**

```json
{
  "success": true,
  "message": "抽奖已重置"
}
```

**副作用：** WebSocket 广播 `draw:reset` 事件

---

### 3.5 配置管理 `/api/config`

#### `GET /api/config` - 获取配置

**响应 `200 OK`：**

```json
{
  "success": true,
  "data": {
    "animation_speed": 50,
    "animation_type": "slot_machine",
    "sound_enabled": true,
    "display_name": true,
    "display_email": false,
    "display_phone": false
  }
}
```

---

#### `PUT /api/config` - 更新配置

**请求体：**

```json
{
  "animation_speed": 80,
  "animation_type": "slot_machine",
  "sound_enabled": true,
  "display_name": true,
  "display_email": false,
  "display_phone": false
}
```

**响应 `200 OK`：** 更新后的配置对象

**副作用：** WebSocket 广播 `config:update` 事件

---

### 3.6 文件上传

#### `POST /api/upload/image` - 上传图片

**请求体：** `FormData`

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| file | File | 是 | 图片文件（支持 JPG、PNG、GIF） |

**响应 `200 OK`：**

```json
{
  "success": true,
  "data": {
    "url": "/uploads/1712124000000-abc123.jpg"
  }
}
```

---

## 4. WebSocket事件设计

### 4.1 服务器 -> 客户端事件

| 事件名 | 数据格式 | 说明 |
|--------|----------|------|
| `draw:start` | `{ session_id, prize_id, prize_name, total_participants }` | 抽奖开始，展示页开始滚动动画 |
| `draw:pause` | 无 | 抽奖暂停，展示页暂停滚动 |
| `draw:stop` | 无 | 抽奖停止，展示页停止滚动 |
| `draw:result` | `{ winner: { id, name, email, phone, avatar }, prize: { id, name, description, image }, timestamp }` | 抽奖结果，展示页展示中奖信息 |
| `draw:reset` | 无 | 抽奖重置，展示页恢复初始状态 |
| `config:update` | `{ config: { animation_speed, animation_type, sound_enabled, ... } }` | 配置更新，展示页同步最新配置 |
| `participants:update` | 无 | 参与者数据更新，展示页刷新参与者列表 |

---

### 4.2 客户端 -> 服务器事件

| 事件名 | 数据格式 | 说明 |
|--------|----------|------|
| `display:status` | `{ isDrawing, isWinner, currentSessionId, animationType }` | 展示页状态报告，控制台同步展示页状态 |
| `display:join` | `{ sessionId }` | 展示页加入指定场次房间，接收该场次的实时事件 |

---

### 4.3 连接管理

- **房间机制：** WebSocket 连接时自动加入对应场次房间，仅接收该场次的相关事件
- **心跳检测：** 间隔 30 秒发送心跳包，超时未响应则判定断线
- **断线重连：** 采用指数退避策略自动重连，初始延迟 1 秒，最大延迟 30 秒

---

## 5. 错误码

| HTTP状态码 | 说明 | 典型场景 |
|------------|------|----------|
| `200` | 成功 | 正常响应 |
| `201` | 创建成功 | POST 请求创建资源成功 |
| `400` | 请求参数错误 | 缺少必填参数、参数格式错误 |
| `404` | 资源不存在 | ID 对应的记录不存在 |
| `409` | 资源冲突 | 重复创建相同资源 |
| `429` | 请求过于频繁 | 触发频率限制 |
| `500` | 服务器内部错误 | 未预期的服务端异常 |

---

## 6. API调用示例

### 6.1 完整抽奖流程（curl）

以下示例展示从创建场次到完成抽奖的完整流程。

**1. 创建场次**

```bash
curl -X POST http://localhost:3000/api/sessions \
  -H "Content-Type: application/json" \
  -d '{
    "name": "2026年度年会抽奖",
    "description": "公司年会抽奖活动"
  }'
```

**2. 批量导入参与者**

```bash
curl -X POST http://localhost:3000/api/participants/import \
  -F "file=@participants.csv" \
  -F "session_id=1"
```

**3. 添加奖品到场次**

```bash
curl -X POST http://localhost:3000/api/sessions/1/prizes \
  -H "Content-Type: application/json" \
  -d '{
    "prize_id": 1,
    "quantity": 3
  }'
```

**4. 开始抽奖**

```bash
curl -X POST http://localhost:3000/api/console/start \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": 1,
    "prize_id": 1
  }'
```

**5. 停止抽奖（揭晓结果）**

```bash
curl -X POST http://localhost:3000/api/console/stop
```

---

### 6.2 JavaScript 调用示例

以下示例使用浏览器原生 `fetch` API 调用接口。

```javascript
const BASE_URL = 'http://localhost:3000/api';

// ========== 人员管理 ==========

// 获取人员列表
async function getParticipants(params = {}) {
  const query = new URLSearchParams(params).toString();
  const response = await fetch(`${BASE_URL}/participants?${query}`);
  return response.json();
}

// 创建人员
async function createParticipant(data) {
  const response = await fetch(`${BASE_URL}/participants`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return response.json();
}

// 更新人员
async function updateParticipant(id, data) {
  const response = await fetch(`${BASE_URL}/participants/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return response.json();
}

// 删除人员
async function deleteParticipant(id) {
  const response = await fetch(`${BASE_URL}/participants/${id}`, {
    method: 'DELETE'
  });
  return response.json();
}

// ========== 场次管理 ==========

// 创建场次
async function createSession(data) {
  const response = await fetch(`${BASE_URL}/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return response.json();
}

// 获取场次详情
async function getSessionDetail(id) {
  const response = await fetch(`${BASE_URL}/sessions/${id}`);
  return response.json();
}

// ========== 控制台操作 ==========

// 开始抽奖
async function startDraw(sessionId, prizeId) {
  const response = await fetch(`${BASE_URL}/console/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id: sessionId, prize_id: prizeId })
  });
  return response.json();
}

// 停止抽奖
async function stopDraw() {
  const response = await fetch(`${BASE_URL}/console/stop`, {
    method: 'POST'
  });
  return response.json();
}

// ========== WebSocket 连接 ==========

function connectWebSocket(sessionId) {
  const ws = new WebSocket('ws://localhost:3000');

  ws.onopen = () => {
    console.log('WebSocket 已连接');
    // 加入场次房间
    ws.send(JSON.stringify({
      event: 'display:join',
      data: { sessionId }
    }));
  };

  ws.onmessage = (event) => {
    const { event: eventName, data } = JSON.parse(event.data);
    console.log(`收到事件: ${eventName}`, data);

    switch (eventName) {
      case 'draw:start':
        // 开始滚动动画
        break;
      case 'draw:result':
        // 展示中奖结果
        console.log(`中奖者: ${data.winner.name}`);
        console.log(`奖品: ${data.prize.name}`);
        break;
      case 'config:update':
        // 更新本地配置
        break;
    }
  };

  ws.onclose = () => {
    console.log('WebSocket 已断开，尝试重连...');
    setTimeout(() => connectWebSocket(sessionId), 3000);
  };

  return ws;
}
```
