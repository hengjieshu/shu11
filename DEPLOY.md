# 多维表部署指南（小白专用）

> 本指南将帮助你在 Mac mini M2 上部署多维表应用

---

## 第一部分：准备工作

### 1.1 安装 Docker Desktop

Docker 是一个容器软件，让你的应用可以在隔离环境中运行。

**步骤：**

1. 打开浏览器（Safari 或 Chrome）
2. 访问：https://www.docker.com/products/docker-desktop
3. 点击 **Download for Mac** 按钮
4. 选择 **Apple Silicon** 版本（Mac M2 是 Apple 芯片）
5. 下载完成后，双击 `Docker.dmg` 文件
6. 把 Docker 图标拖到 Applications 文件夹
7. 打开「启动台」或「应用程序」，找到 Docker，双击打开
8. 可能需要输入电脑密码授权
9. 等待 Docker 启动完成（菜单栏右上角会出现一个小鲸鱼图标）

**验证是否安装成功：**
- 打开终端
- 输入：`docker --version`
- 如果显示版本号（如 `Docker version 24.0.x`），说明安装成功

---

### 1.2 打开终端

终端是输入命令的地方。

**方法一（推荐）：**
1. 同时按键盘 `Command（⌘）` + `空格`
2. 输入 `终端` 或 `Terminal`
3. 按回车键

**方法二：**
1. 打开 Finder（访达）
2. 点击左侧「应用程序」
3. 找到「实用工具」文件夹
4. 双击「终端」

---

## 第二部分：下载代码

### 2.1 克隆项目

在终端中，复制粘贴以下命令，然后按回车：

```bash
git clone https://github.com/hengjieshu/shu11.git
```

你会看到类似这样的输出：
```
Cloning into 'shu11'...
remote: Enumerating objects: 25, done.
remote: Counting objects: 100% (25/25), done.
...
```

### 2.2 进入项目目录

复制粘贴以下命令，按回车：

```bash
cd shu11
```

> 说明：`cd` = change directory（切换目录），这步让你进入项目文件夹

### 2.3 创建数据目录

复制粘贴以下命令，按回车：

```bash
mkdir -p data
```

> 说明：这步创建一个 data 文件夹，用来存放数据库文件，这样更新代码时数据不会丢失

---

## 第三部分：启动服务

### 3.1 确认 Docker 正在运行

检查菜单栏右上角是否有小鲸鱼图标。

- **有**：说明 Docker 正在运行，继续下一步
- **没有**：打开「应用程序」→「Docker」，等待启动

### 3.2 启动多维表应用

复制粘贴以下命令，按回车：

```bash
docker-compose up -d
```

第一次运行会下载和构建，需要等待几分钟。你会看到类似这样的输出：

```
[+] Building 45.2s (15/15) FINISHED
 => [internal] load build definition from Dockerfile
 => [backend 3/5] COPY package*.json ./
 ...
 ✔ Container shu11-backend-1   Started
 ✔ Container shu11-frontend-1  Started
```

### 3.3 检查服务状态

复制粘贴以下命令，按回车：

```bash
docker-compose ps
```

如果看到两个容器状态都是 `running` 或 `Up`，说明启动成功：

```
NAME                  STATUS    PORTS
shu11-backend-1       Up        0.0.0.0:3001->3001/tcp
shu11-frontend-1      Up        0.0.0.0:80->80/tcp
```

---

## 第四部分：访问应用

### 4.1 本机访问

打开浏览器，访问以下任意地址：

- http://localhost
- http://127.0.0.1

### 4.2 局域网访问（其他设备）

1. 查看 Mac mini 的 IP 地址，在终端输入：
   ```bash
   ipconfig getifaddr en0
   ```
   会显示类似 `192.168.1.100` 的地址

2. 其他设备（手机、其他电脑）在浏览器访问：
   ```
   http://192.168.1.100
   ```
   （替换成你的实际 IP 地址）

### 4.3 公网访问（域名）

如果你有公网 IP 和域名，且域名已解析到 Mac mini：

```
http://你的域名
```

---

## 第五部分：日常使用

### 5.1 查看运行日志

如果遇到问题，可以查看日志：

```bash
docker-compose logs -f
```

按 `Ctrl + C` 退出日志查看

### 5.2 停止服务

```bash
docker-compose stop
```

### 5.3 重启服务

```bash
docker-compose restart
```

### 5.4 更新代码

当开发者（你）更新了代码后，在 Mac mini 上执行：

```bash
cd shu11
git pull
docker-compose up -d --build
```

### 5.5 数据备份

数据库文件在 `data/database.sqlite`，定期备份即可：

```bash
# 备份到桌面
cp data/database.sqlite ~/Desktop/database_backup_$(date +%Y%m%d).sqlite
```

---

## 第六部分：常见问题

### Q1: 运行 docker-compose 提示 "command not found"

**原因**：Docker Desktop 没有正确安装或启动

**解决**：
1. 确保 Docker Desktop 已安装
2. 打开 Docker Desktop 应用
3. 等待启动完成（菜单栏出现小鲸鱼图标）
4. 重新打开终端再试

### Q2: 端口被占用

**错误提示**：`Error: bind: address already in use`

**原因**：80 端口被其他程序占用

**解决**：修改 docker-compose.yml 中的端口映射
```yaml
# 把 "80:80" 改成 "8080:80"
ports:
  - "8080:80"
```
然后访问 http://localhost:8080

### Q3: 无法局域网访问

**原因**：Mac 防火墙阻止了连接

**解决**：
1. 打开「系统设置」→「网络」→「防火墙」
2. 点击「选项」
3. 确保 Docker 相关应用被允许

### Q4: 忘记之前执行到哪一步了

在终端输入：
```bash
pwd
```
会显示当前所在目录

输入：
```bash
ls
```
会显示当前目录下的文件

### Q5: 想重新开始

完全停止并删除容器：
```bash
docker-compose down
```

然后重新运行：
```bash
docker-compose up -d
```

---

## 快速命令速查表

| 操作 | 命令 |
|------|------|
| 进入项目目录 | `cd shu11` |
| 启动服务 | `docker-compose up -d` |
| 停止服务 | `docker-compose stop` |
| 重启服务 | `docker-compose restart` |
| 查看状态 | `docker-compose ps` |
| 查看日志 | `docker-compose logs -f` |
| 更新代码 | `git pull && docker-compose up -d --build` |
| 查看 IP 地址 | `ipconfig getifaddr en0` |

---

## 需要帮助？

如果遇到问题，可以：
1. 查看日志：`docker-compose logs -f`
2. 检查 Docker Desktop 是否正常运行
3. 确认命令是在正确的目录下执行的

---

**部署完成后，记得收藏这份指南！**
