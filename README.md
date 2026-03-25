# 多维表 Demo

一个类似钉钉多维表的轻量级实现。

## 技术栈

- **前端**: React + Vite + Nginx
- **后端**: Node.js + Express
- **数据库**: SQLite (本地文件数据库)
- **部署**: Docker + docker-compose

## 快速开始

### 方式一：Docker 部署（推荐）

**前置条件**：安装 Docker Desktop

```bash
# 1. 克隆项目
git clone 你的仓库地址
cd multitable-demo

# 2. 创建数据目录
mkdir -p data

# 3. 一键启动
docker-compose up -d

# 4. 查看状态
docker-compose ps
```

访问: http://localhost 或 http://你的域名

**更新代码后**：
```bash
git pull
docker-compose up -d --build
```

### 方式二：本地开发

```bash
# 安装后端依赖
cd backend && npm install

# 安装前端依赖
cd ../frontend && npm install

# 启动后端（终端1）
cd backend && npm start

# 启动前端（终端2）
cd frontend && npm run dev
```

访问: http://localhost:3000

## API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/tables | 获取所有表格 |
| POST | /api/tables | 创建新表格 |
| DELETE | /api/tables/:id | 删除表格 |
| GET | /api/tables/:id/fields | 获取字段列表 |
| POST | /api/tables/:id/fields | 添加字段 |
| GET | /api/tables/:id/rows | 获取行数据 |
| POST | /api/tables/:id/rows | 添加行 |
| PUT | /api/rows/:id | 更新行 |
| DELETE | /api/rows/:id | 删除行 |

### 示例：添加一行数据

```bash
curl -X POST http://localhost:3001/api/tables/1/rows \
  -H "Content-Type: application/json" \
  -d '{"data":{"field_1":"任务名称","field_2":"进行中","field_3":"张三"}}'
```

## 目录结构

```
multitable-demo/
├── backend/              # 后端服务
│   ├── Dockerfile
│   ├── server.js
│   └── package.json
│
├── frontend/             # 前端应用
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── src/
│   └── package.json
│
├── data/                 # 数据库目录（Docker 挂载）
├── docker-compose.yml    # Docker 编排文件
└── README.md
```

## 配置域名（可选）

如果你有域名和 SSL 证书，可以配置 HTTPS：

1. 将 SSL 证书放到 `./ssl/` 目录
2. 修改 `frontend/nginx.conf` 添加 SSL 配置
3. 重启容器：`docker-compose restart frontend`

## 数据备份

数据库文件在 `./data/database.sqlite`，定期备份此文件即可。

```bash
# 备份
cp ./data/database.sqlite ./backup/database_$(date +%Y%m%d).sqlite

# 恢复
cp ./backup/database_20240101.sqlite ./data/database.sqlite
docker-compose restart backend
```
