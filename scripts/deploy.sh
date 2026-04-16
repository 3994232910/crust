#!/usr/bin/env bash
# 部署/更新脚本
# 用法：bash scripts/deploy.sh
# 在项目根目录运行
set -e

# 检查必要文件
if [ ! -f ".env.prod" ]; then
    echo "错误：找不到 .env.prod，请先复制并修改该文件"
    exit 1
fi

if [ ! -f ".htpasswd" ]; then
    echo "错误：找不到 .htpasswd，请先运行 bash scripts/setup-auth.sh"
    exit 1
fi

# 检查 SERVER_IP 是否已修改
if grep -q "YOUR_SERVER_IP" .env.prod; then
    echo "错误：.env.prod 中的 SERVER_IP 还没有填写，请修改后再运行"
    exit 1
fi

echo "=== [1/3] 拉取最新代码 ==="
git pull

echo "=== [2/3] 构建并启动服务 ==="
docker compose -f docker-compose.prod.yml up -d --build

echo "=== [3/3] 检查服务状态 ==="
docker compose -f docker-compose.prod.yml ps

echo ""
echo "✓ 部署完成"
# 读取服务器 IP 显示访问地址
SERVER_IP=$(grep '^SERVER_IP=' .env.prod | cut -d'=' -f2)
echo "访问地址：http://${SERVER_IP}"
echo "账密：查看 .htpasswd 或询问创建者"
