#!/usr/bin/env bash
# 创建 Nginx Basic Auth 账密文件
# 用法：bash scripts/setup-auth.sh
# 在项目根目录运行，会生成 .htpasswd 文件
set -e

HTPASSWD_FILE=".htpasswd"

echo "=== 创建同事访问账号 ==="
echo "为每个账号设置密码（输入时不显示）"
echo ""

# 创建第一个用户（-c 覆盖创建）
htpasswd -c "$HTPASSWD_FILE" crust

echo ""
echo "✓ .htpasswd 创建完成"
echo "账号：crust"
echo "把这组账密发给同事，他们访问网站时会看到浏览器弹出的账密框"
