# VPS 部署指南

## 前置条件

- VPS 已安装 Docker 和 Docker Compose
- 域名已购买并托管在 Cloudflare
- VPS 有公网 IP

## 部署步骤

### 1. 上传代码到 VPS

```bash
# 在 VPS 上克隆仓库
git clone <your-repo-url> /opt/md2any
cd /opt/md2any
```

### 2. 配置环境变量

```bash
cp .env.example .env
vim .env  # 填入你的 API Key
```

### 3. 启动服务

```bash
docker-compose up -d
```

验证容器运行：
```bash
docker-compose ps
curl http://localhost
```

### 4. 配置 Cloudflare DNS

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com)
2. 选择你的域名 → DNS → Records
3. 添加记录：
   - Type: `A`
   - Name: `@`（根域名）或子域名如 `md2any`
   - Content: `你的VPS公网IP`
   - Proxy status: **Proxied**（开启小黄云）
4. 保存

### 5. 配置 Cloudflare SSL

1. 进入 SSL/TLS → Overview
2. 加密模式选择 **Full**（不是 Full Strict）
3. 开启 **Always Use HTTPS**

### 6. 验证访问

等待 1-2 分钟 DNS 生效后，访问你的域名即可。

## 常用操作

```bash
# 查看日志
docker-compose logs -f

# 重启服务
docker-compose restart

# 更新代码后重新部署
git pull && docker-compose up -d --build

# 停止服务
docker-compose down
```

## 故障排查

- **502 错误**：检查 md2any 容器是否正常运行 `docker-compose ps`
- **域名无法访问**：检查 Cloudflare DNS 是否生效，VPS 防火墙是否开放 80 端口
- **SSL 问题**：确保 Cloudflare SSL 模式为 Full
