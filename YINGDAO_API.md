# 影刀 API 接口说明

本文档说明如何通过影刀 RPA 自动更新多维表格数据。

---

## API 基础地址

```
http://你的服务器IP:3001
```

- 本地开发：`http://localhost:3001`
- Mac mini 部署后：`http://shu11.top:180`

---

## 动态表格支持

所有影刀 API 都支持通过 `tableName` 参数指定要操作的表格名称。

- 如果不指定，默认操作 **"实时销售"** 表格
- 可以指定其他表格名称，如："30天净支付"、"订单管理"等

---

## 接口列表

### 1. 添加单条记录

**接口地址**：`POST /api/yingdao/sale`

**请求示例**（实时销售表格）：
```json
{
  "统计时间": "2026-03-26T14:30",
  "净支付金额": 12345.67
}
```

**请求示例**（指定其他表格）：
```json
{
  "tableName": "30天净支付",
  "字段名1": "值1",
  "字段名2": "值2"
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

### 2. 批量导入记录

**接口地址**：`POST /api/yingdao/sales`

**请求示例**（实时销售表格）：
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

**请求示例**（指定其他表格）：
```json
{
  "tableName": "订单管理",
  "records": [
    {
      "订单号": "DD20260326001",
      "客户": "张三",
      "金额": 999.99
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

### 3. 清空数据

**接口地址**：`DELETE /api/yingdao/sales`

**请求示例**（清空实时销售表格）：
```json
{}
```

**请求示例**（清空指定表格）：
```json
{
  "tableName": "30天净支付"
}
```

**响应示例**：
```json
{
  "success": true,
  "message": "已清空 10 条销售记录"
}
```

---

### 4. 获取字段列表

**接口地址**：`GET /api/yingdao/fields`

**请求示例**（实时销售表格）：
```
GET /api/yingdao/fields
```

**请求示例**（指定表格）：
```
GET /api/yingdao/fields?tableName=30天净支付
```

**响应示例**：
```json
[
  {"id": 1, "name": "统计时间", "type": "datetime", "options": null},
  {"id": 2, "name": "净支付金额", "type": "number", "options": null}
]
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
| 协议头 | `Content-Type: application/json` |
| 协议体 | 见下方示例 |

**Body 示例（实时销售）**：
```json
{
  "统计时间": "{{统计时间变量}}",
  "净支付金额": {{净支付金额变量}}
}
```

**Body 示例（指定其他表格）**：
```json
{
  "tableName": "{{表格名称变量}}",
  "字段名1": "{{变量1}}",
  "字段名2": {{变量2}}
}
```

### 方法二：使用 Python 脚本组件

```python
import requests
import json

# API 地址
api_url = "http://shu11.top:180/api/yingdao/sale"

# 通用数据写入函数
def add_record(table_name, data):
    """
    table_name: 表格名称，如"实时销售"、"30天净支付"
    data: 字典，包含字段名和值
    """
    payload = {
        "tableName": table_name,
        **data
    }

    response = requests.post(api_url, json=payload, timeout=10)
    result = response.json()

    if result.get("success"):
        print(f"✅ 成功添加记录到 [{table_name}]，ID: {result['rowId']}")
    else:
        print(f"❌ 失败: {result.get('error')}")
    return result

# 示例1：写入实时销售表格
add_record("实时销售", {
    "统计时间": "2026-03-26T15:00",
    "净支付金额": 12345.67
})

# 示例2：写入其他表格
add_record("30天净支付", {
    "日期": "2026-03-26",
    "金额": 9999.99
})
```

---

## 使用示例

### cURL 测试命令

**测试实时销售表格：**
```bash
curl -X POST http://shu11.top:180/api/yingdao/sale \
  -H "Content-Type: application/json" \
  -d '{"统计时间":"2026-03-26T14:30","净支付金额":12345.67}'
```

**测试指定其他表格：**
```bash
curl -X POST http://shu11.top:180/api/yingdao/sale \
  -H "Content-Type: application/json" \
  -d '{"tableName":"30天净支付","日期":"2026-03-26","金额":8888.88}'
```

**获取指定表格的字段列表：**
```bash
curl "http://shu11.top:180/api/yingdao/fields?tableName=30天净支付"
```

---

## 注意事项

1. **确保 Mac mini 的服务正在运行**
2. **表格名称必须完全匹配**（区分大小写）
3. **字段名称必须完全匹配**表格中定义的字段名
4. **日期时间格式**：`YYYY-MM-DDTHH:MM`（如 2026-03-26T14:30）
5. **数字类型**不要加引号
6. **如果不指定 tableName**，默认操作"实时销售"表格

---

## 多表格操作场景

如果你有多个表格需要影刀同步，比如：
- **实时销售** - 记录实时交易数据
- **30天净支付** - 统计月度数据
- **订单管理** - 管理订单信息
- **库存管理** - 管理库存数据

只需要在请求体中添加 `"tableName": "表格名称"` 即可灵活切换！
