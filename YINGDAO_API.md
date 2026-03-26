# 影刀 API 接口说明

本文档说明如何通过影刀 RPA 自动更新"实时销售"表格数据。

---

## API 基础地址

```
http://你的服务器IP:3001
```

- 本地开发：`http://localhost:3001`
- Mac mini 部署后：`http://shu11.top:180`

---

## 表格字段

| 字段名 | 类型 | 说明 |
|--------|------|------|
| 统计时间 | 日期时间 | 格式：YYYY-MM-DDTHH:MM（如 2026-03-26T14:30） |
| 净支付金额 | 数字 | 金额数值 |

---

## 接口列表

### 1. 添加单条销售记录

**接口地址**：`POST /api/yingdao/sale`

**请求示例**：
```json
{
  "统计时间": "2026-03-26T14:30",
  "净支付金额": 12345.67
}
```

**响应示例**：
```json
{
  "success": true,
  "rowId": 1,
  "message": "销售记录添加成功"
}
```

---

### 2. 批量导入销售记录

**接口地址**：`POST /api/yingdao/sales`

**请求示例**：
```json
{
  "records": [
    {
      "统计时间": "2026-03-26T10:00",
      "净支付金额": 12345.67
    },
    {
      "统计时间": "2026-03-26T11:00",
      "净支付金额": 23456.78
    }
  ]
}
```

**响应示例**：
```json
{
  "success": true,
  "total": 2,
  "imported": 2,
  "failed": 0,
  "results": [...]
}
```

---

### 3. 清空销售数据

**接口地址**：`DELETE /api/yingdao/sales`

**响应示例**：
```json
{
  "success": true,
  "message": "已清空 10 条销售记录"
}
```

---

## 影刀配置步骤

### 方法一：使用「HTTP 请求」组件

1. 在影刀流程中添加 **「HTTP 请求」** 组件
2. 配置如下：

| 配置项 | 值 |
|--------|-----|
| 请求方式 | POST |
| URL | `http://shu11.top:180/api/yingdao/sale` |
| Content-Type | application/json |
| Body | 见下方示例 |

**Body 示例（使用变量）**：
```json
{
  "统计时间": "{{统计时间变量}}",
  "净支付金额": {{净支付金额变量}}
}
```

### 方法二：使用 Python 脚本组件

```python
import requests
import json

# API 地址
api_url = "http://shu11.top:180/api/yingdao/sale"

# 销售数据（从影刀变量获取）
data = {
    "统计时间": 统计时间,        # 影刀变量，格式：2026-03-26T14:30
    "净支付金额": 净支付金额     # 影刀变量，数字类型
}

# 发送请求
response = requests.post(api_url, json=data)
result = response.json()

# 返回结果
if result.get("success"):
    print(f"成功添加记录，ID: {result['rowId']}")
else:
    print(f"添加失败: {result.get('error')}")
```

---

## 使用示例

### cURL 测试命令

```bash
curl -X POST http://localhost:3001/api/yingdao/sale \
  -H "Content-Type: application/json" \
  -d '{"统计时间":"2026-03-26T14:30","净支付金额":12345.67}'
```

---

## 注意事项

1. 确保 Mac mini 的服务正在运行
2. "统计时间"格式为 `YYYY-MM-DDTHH:MM`（如 2026-03-26T14:30）
3. "净支付金额"为数字类型，不要加引号
