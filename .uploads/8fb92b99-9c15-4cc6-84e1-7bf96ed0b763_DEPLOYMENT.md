# 🚀 部署指南

**文档版本**: 2.0.0
**更新日期**: 2026-04-03

---

## 📋 部署概述

### 部署模式

| 模式 | 说明 | 适用场景 |
|------|------|---------|
| 开发模式 | 本地开发调试 | 开发测试 |
| 生产模式 | 正式环境部署 | 年会/活动 |

### 系统要求

| 项目 | 最低要求 | 推荐配置 |
|------|---------|---------|
| Node.js | 16.x | 18.x+ |
| npm | 8.x | 9.x+ |
| 内存 | 512MB | 1GB+ |
| 磁盘 | 1GB | 2GB+ |
| 浏览器 | Chrome 80+ | Chrome/Edge最新 |

---

## 🖥️ 开发环境部署

### 1. 克隆项目

```bash
cd g:\CIFS_Nodejs_WEB
```

### 2. 安装依赖

```bash
cd web-choujiang-tools
npm install
```

### 3. 启动开发服务器

```bash
npm run dev
```

### 4. 访问系统

| 页面 | 地址 |
|------|------|
| 管理后台 | http://localhost:3000 |
| 抽奖展示 | http://localhost:3000/display.html |

---

## 🌐 生产环境部署

### 方式一：直接部署

#### 1. 构建项目

```bash
npm run build
```

#### 2. 启动服务器

```bash
node server.js
```

#### 3. 使用PM2管理进程（推荐）

```bash
# 安装PM2
npm install -g pm2

# 启动服务
pm2 start server.js --name lottery-app

# 保存进程列表
pm2 save

# 设置开机自启
pm2 startup
```

### 方式二：Nginx反向代理

#### 1. 安装Nginx

```bash
# Windows: 下载nginx并解压
# Linux: sudo apt install nginx
```

#### 2. 配置Nginx

```nginx
# nginx.conf

server {
    listen 80;
    server_name your-domain.com;

    # 管理后台
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Socket.io
    location /socket.io {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

#### 3. 重启Nginx

```bash
# Windows
nginx -s reload

# Linux
sudo systemctl restart nginx
```

### 方式三：Docker部署

#### 1. 创建Dockerfile

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3000

CMD ["node", "server.js"]
```

#### 2. 构建镜像

```bash
docker build -t lottery-app .
```

#### 3. 运行容器

```bash
docker run -d \
  --name lottery-app \
  -p 3000:3000 \
  -v $(pwd)/database.db:/app/database.db \
  lottery-app
```

---

## ⚙️ 生产配置

### 1. 环境变量

```bash
# .env 文件
NODE_ENV=production
PORT=3000
HOST=0.0.0.0
```

### 2. 数据库配置

数据库文件位于项目根目录 `database.db`

**备份数据库**:
```bash
# 手动备份
copy database.db database_backup_%date:~0,4%%date:~5,2%%date:~8,2%.db

# 或使用SQLite命令
sqlite3 database.db ".backup database_backup.db"
```

### 3. 文件上传配置

上传的文件存储在 `uploads/` 目录

**设置上传大小限制** (server.js):
```javascript
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  }
});
```

---

## 🔒 安全配置

### 1. 端口修改

默认端口3000，可在server.js中修改

```javascript
const PORT = process.env.PORT || 3002; // 改为其他端口
```

### 2. 局域网访问控制

```javascript
// server.js
const HOST = process.env.HOST || '127.0.0.1'; // 仅本地访问

// 改为以下内容允许局域网访问
// const HOST = '0.0.0.0';
```

### 3. CORS配置

```javascript
// 允许特定域名访问
app.use(cors({
  origin: ['http://localhost:3000', 'http://your-domain.com'],
  credentials: true
}));
```

---

## 📊 性能优化

### 1. 静态文件缓存

```javascript
// server.js
app.use(express.static('dist', {
  maxAge: '1d', // 缓存1天
  etag: true
}));
```

### 2. Gzip压缩

```javascript
const compression = require('compression');
app.use(compression());
```

### 3. 数据库优化

```bash
# 定期优化数据库
sqlite3 database.db "VACUUM;"
```

---

## 🛡️ 防火墙配置

### Windows防火墙

```powershell
# 允许3000端口
netsh advfirewall firewall add rule name="Lottery App" dir=in action=allow protocol=tcp localport=3000
```

### Linux防火墙 (ufw)

```bash
# 允许3000端口
sudo ufw allow 3000/tcp

# 重启防火墙
sudo ufw reload
```

---

## 🔄 更新部署

### 1. 停止服务

```bash
# PM2
pm2 stop lottery-app

# 或直接kill
pkill -f "node server.js"
```

### 2. 备份数据

```bash
copy database.db database_backup_before_update.db
```

### 3. 更新代码

```bash
git pull
npm install
```

### 4. 重启服务

```bash
npm run build
pm2 restart lottery-app
```

---

## ✅ 部署检查清单

- [ ] Node.js版本 >= 16.x
- [ ] 所有依赖安装成功
- [ ] 数据库文件存在且可写
- [ ] uploads目录存在且可写
- [ ] 端口未被占用
- [ ] 防火墙允许访问
- [ ] 管理后台可访问
- [ ] 展示页面可访问
- [ ] Socket.io连接正常
- [ ] 抽奖功能测试正常

---

## 🐛 常见部署问题

### 问题1: 端口被占用

```
Error: listen EADDRINUSE :::3000
```

**解决方案**:
```bash
# 查找占用端口的进程
netstat -ano | findstr :3000

# 结束进程
taskkill /PID <PID> /F

# 或使用其他端口
PORT=3001 npm start
```

### 问题2: 权限不足

```
Error: EACCES: permission denied
```

**解决方案**:
```bash
# Linux
sudo chown -R $USER:$USER /path/to/project

# Windows (以管理员身份运行)
```

### 问题3: 数据库锁定

```
Error: SQLITE_BUSY: database is locked
```

**解决方案**:
1. 确保没有其他进程在访问数据库
2. 重启应用释放锁

### 问题4: 上传文件失败

```
Error: MulterError: File too large
```

**解决方案**:
1. 检查文件大小是否超过限制（默认10MB）
2. 修改 `limits.fileSize` 配置

---

## 📞 技术支持

如部署遇到问题，请查看：
- [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) - 故障排查
- [API.md](./API.md) - 接口文档
