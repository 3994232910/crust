#!/usr/bin/env bash
# 服务器初始化脚本 — 在阿里云服务器上运行一次
# 用法：bash scripts/setup-server.sh
set -e

echo "=== [1/3] 检查 Docker ==="
if command -v docker &> /dev/null; then
    echo "Docker 已安装，跳过"
    docker --version
else
    echo "安装 Docker..."
    yum install -y docker
    systemctl enable --now docker
    docker --version
fi

echo "=== [2/3] 创建 2G Swap（防止内存不足）==="
if [ ! -f /swapfile ]; then
    fallocate -l 2G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
    echo "Swap 创建完成"
else
    echo "Swap 已存在，跳过"
fi
free -h

echo "=== [3/3] 安装 apache2-utils（htpasswd 工具）==="
if command -v yum &> /dev/null; then
    yum install -y httpd-tools
else
    apt-get install -y apache2-utils
fi

echo ""
echo "✓ 服务器初始化完成"
echo "下一步：运行 bash scripts/setup-auth.sh 创建访问账密"
