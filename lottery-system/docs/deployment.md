# 部署文档

## 环境要求

### 生产环境

| 软件 | 最低版本 | 推荐版本 |
|------|----------|----------|
| Node.js | 18.0.0 | 20.x LTS |
| npm | 9.0.0 | 10.x |
| 操作系统 | - | Windows Server / Linux |

### 硬件要求

| 资源 | 最低配置 | 推荐配置 |
|------|----------|----------|
| CPU | 2核 | 4核+ |
| 内存 | 2GB | 4GB+ |
| 磁盘 | 1GB | 10GB+ |

## 部署方式

### 方式一：直接部署

#### 1. 准备代码

```bash
# 克隆或复制项目到服务器
cd /opt
git clone <repository-url> lottery-system
cd lottery-system
```

#### 2. 安装依赖

```bash
# 后端
cd backend
npm install --production

# 管理后台
cd ../admin
npm install

# 展示端
cd ../display
npm install
```

#### 3. 构建前端

```bash
# 构建管理后台
cd admin
npm run build
# 输出目录: dist/

# 构建展示端
cd ../display
npm run build
# 输出目录: dist/
```

#### 4. 配置后端

创建 `backend/.env` 文件：

```env
PORT=3000
NODE_ENV=production
```

#### 5. 启动服务

**使用 PM2 管理进程（推荐）**

```bash
# 安装 PM2
npm install -g pm2

# 启动后端
cd backend
pm2 start index.js --name lottery-backend

# 查看状态
pm2 status

# 设置开机自启
pm2 startup
pm2 save
```

**使用 systemd（Linux）**

创建服务文件 `/etc/systemd/system/lottery-backend.service`：

```ini
[Unit]
Description=Lottery System Backend
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/lottery-system/backend
ExecStart=/usr/bin/node index.js
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
# 启用并启动服务
systemctl enable lottery-backend
systemctl start lottery-backend
```

### 方式二：Nginx 反向代理

#### 1. 安装 Nginx

```bash
# Ubuntu/Debian
apt update
apt install nginx

# CentOS
yum install nginx
```

#### 2. 配置 Nginx

创建配置文件 `/etc/nginx/sites-available/lottery`：

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # 后端 API
    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Socket.IO
    location /socket.io/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # 管理后台
    location /admin/ {
        alias /opt/lottery-system/admin/dist/;
        try_files $uri $uri/ /admin/index.html;
    }

    # 展示端
    location / {
        root /opt/lottery-system/display/dist;
        try_files $uri $uri/ /index.html;
    }

    # 上传文件
    location /uploads/ {
        alias /opt/lottery-system/backend/uploads/;
    }
}
```

```bash
# 启用配置
ln -s /etc/nginx/sites-available/lottery /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

#### 3. 前端构建配置

修改 `admin/vite.config.ts`：

```typescript
export default defineConfig({
  base: '/admin/',
  // ...
})
```

修改 `display/vite.config.ts`：

```typescript
export default defineConfig({
  base: '/',
  // ...
})
```

修改前端 API 请求地址：

```typescript
// admin/src/api/request.ts
const baseURL = '/api'

// display App.vue socket连接
const socket = io(window.location.origin, { path: '/socket.io' })
```

### 方式三：Docker 部署

#### 1. 创建 Dockerfile

**后端 Dockerfile** (`backend/Dockerfile`)：

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

EXPOSE 3000

CMD ["node", "index.js"]
```

#### 2. 创建 docker-compose.yml

```yaml
version: '3.8'

services:
  backend:
    build: ./backend
    ports:
      - "3000:3000"
    volumes:
      - ./backend/uploads:/app/uploads
      - ./backend/database.db:/app/database.db
    restart: always

  admin:
    image: nginx:alpine
    ports:
      - "5173:80"
    volumes:
      - ./admin/dist:/usr/share/nginx/html
      - ./nginx/admin.conf:/etc/nginx/conf.d/default.conf
    depends_on:
      - backend

  display:
    image: nginx:alpine
    ports:
      - "5174:80"
    volumes:
      - ./display/dist:/usr/share/nginx/html
      - ./nginx/display.conf:/etc/nginx/conf.d/default.conf
    depends_on:
      - backend
```

#### 3. 构建并启动

```bash
# 构建前端
cd admin && npm run build
cd ../display && npm run build

# 启动服务
docker-compose up -d --build
```

## 生产环境配置

### 环境变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| PORT | 后端服务端口 | 3000 |
| NODE_ENV | 运行环境 | development |

### 安全配置

#### 1. 更新 CORS 白名单

修改 `backend/index.js`：

```javascript
const allowedOrigins = [
  'https://your-domain.com',
  'https://admin.your-domain.com'
]

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}))

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
})
```

#### 2. 启用 HTTPS

使用 Let's Encrypt 免费证书：

```bash
# 安装 certbot
apt install certbot python3-certbot-nginx

# 获取证书
certbot --nginx -d your-domain.com

# 自动续期
certbot renew --dry-run
```

#### 3. 文件上传限制

修改 `backend/routes/upload.js`：

```javascript
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif']
    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new Error('不支持的文件类型'))
    }
    cb(null, true)
  }
})
```

## 数据备份

### 自动备份脚本

创建备份脚本 `backup.sh`：

```bash
#!/bin/bash

BACKUP_DIR="/opt/backups/lottery"
DATE=$(date +%Y%m%d_%H%M%S)
PROJECT_DIR="/opt/lottery-system"

mkdir -p $BACKUP_DIR

# 备份数据库
cp $PROJECT_DIR/backend/database.db $BACKUP_DIR/database_$DATE.db

# 备份上传文件
tar -czf $BACKUP_DIR/uploads_$DATE.tar.gz -C $PROJECT_DIR/backend/uploads .

# 删除30天前的备份
find $BACKUP_DIR -type f -mtime +30 -delete

echo "Backup completed: $DATE"
```

设置定时任务：

```bash
# 编辑 crontab
crontab -e

# 每天凌晨3点执行备份
0 3 * * * /opt/lottery-system/backup.sh >> /var/log/lottery-backup.log 2>&1
```

## 监控与日志

### PM2 监控

```bash
# 查看日志
pm2 logs lottery-backend

# 监控面板
pm2 monit

# 查看详情
pm2 describe lottery-backend
```

### 日志轮转

创建 `/etc/logrotate.d/lottery`：

```
/var/log/lottery/*.log {
    daily
    rotate 7
    compress
    missingok
    notifempty
}
```

## 故障排查

### 常见问题

**1. 端口被占用**

```bash
# 查看端口占用
netstat -tlnp | grep :3000

# 终止进程
kill -9 <PID>
```

**2. 数据库损坏**

```bash
# 从备份恢复
cp /opt/backups/lottery/database_latest.db /opt/lottery-system/backend/database.db
```

**3. Socket.IO 连接失败**

检查：
- Nginx WebSocket 代理配置
- CORS 设置
- 防火墙规则

### 健康检查

```bash
# 检查后端服务
curl http://localhost:3000/health

# 预期响应
{"status":"ok"}
```

## 性能优化

### 1. 启用 Gzip 压缩

Nginx 配置：

```nginx
gzip on;
gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
gzip_min_length 1000;
```

### 2. 静态资源缓存

```nginx
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

### 3. 连接池优化

后端数据库连接优化（如使用 MySQL/PostgreSQL）。

## 更新部署

```bash
# 拉取最新代码
git pull

# 更新依赖
cd backend && npm install --production
cd ../admin && npm install && npm run build
cd ../display && npm install && npm run build

# 重启服务
pm2 restart lottery-backend
```
