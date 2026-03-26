const express = require('express');
const cors = require('cors');
const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3001;

// 中间件
app.use(cors());
app.use(express.json());

// 数据库文件路径（Docker 环境使用 /app/data 目录）
const DB_PATH = process.env.NODE_ENV === 'production' ? '/app/data/database.sqlite' : './database.sqlite';

let db;

// 初始化数据库
async function initDB() {
  const SQL = await initSqlJs();

  // 尝试加载现有数据库
  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  // 创建表（如果不存在）
  db.run(`
    CREATE TABLE IF NOT EXISTS tables (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS fields (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      table_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'text',
      options TEXT,
      "order" INTEGER DEFAULT 0,
      FOREIGN KEY (table_id) REFERENCES tables(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS rows (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      table_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (table_id) REFERENCES tables(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS cells (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      row_id INTEGER NOT NULL,
      field_id INTEGER NOT NULL,
      value TEXT,
      FOREIGN KEY (row_id) REFERENCES rows(id),
      FOREIGN KEY (field_id) REFERENCES fields(id),
      UNIQUE(row_id, field_id)
    )
  `);

  saveDB();
}

// 保存数据库到文件
function saveDB() {
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

// 辅助函数：执行查询并返回所有结果
function queryAll(sql, params = []) {
  const stmt = db.prepare(sql);
  if (params.length > 0) {
    stmt.bind(params);
  }
  const results = [];
  while (stmt.step()) {
    const row = stmt.getAsObject();
    results.push(row);
  }
  stmt.free();
  return results;
}

// 辅助函数：执行查询并返回单个结果
function queryOne(sql, params = []) {
  const results = queryAll(sql, params);
  return results.length > 0 ? results[0] : null;
}

// 辅助函数：执行插入/更新/删除并返回最后插入的 ID
function runSQL(sql, params = []) {
  db.run(sql, params);
  // 必须在 saveDB 之前获取 lastInsertRowid
  const result = db.exec("SELECT last_insert_rowid() as id");
  const lastId = result[0]?.values[0]?.[0] || 0;
  saveDB();
  console.log(`runSQL: ${sql}, lastId: ${lastId}`);
  return { lastInsertRowid: lastId };
}

// ==================== 表格 API ====================

// 获取所有表格
app.get('/api/tables', (req, res) => {
  const tables = queryAll('SELECT * FROM tables ORDER BY created_at DESC');
  res.json(tables);
});

// 创建新表格
app.post('/api/tables', (req, res) => {
  const { name } = req.body;
  const result = runSQL('INSERT INTO tables (name) VALUES (?)', [name]);
  res.json({ id: result.lastInsertRowid, name });
});

// 删除表格
app.delete('/api/tables/:id', (req, res) => {
  const { id } = req.params;

  // 获取该表的所有字段
  const fields = queryAll('SELECT id FROM fields WHERE table_id = ?', [id]);
  const fieldIds = fields.map(f => f.id);

  // 获取该表的所有行
  const rows = queryAll('SELECT id FROM rows WHERE table_id = ?', [id]);
  const rowIds = rows.map(r => r.id);

  // 删除相关数据
  if (rowIds.length > 0) {
    const placeholders = rowIds.map(() => '?').join(',');
    runSQL(`DELETE FROM cells WHERE row_id IN (${placeholders})`, rowIds);
    runSQL('DELETE FROM rows WHERE table_id = ?', [id]);
  }

  if (fieldIds.length > 0) {
    runSQL('DELETE FROM fields WHERE table_id = ?', [id]);
  }

  runSQL('DELETE FROM tables WHERE id = ?', [id]);
  res.json({ success: true });
});

// ==================== 字段 API ====================

// 获取表格的所有字段
app.get('/api/tables/:tableId/fields', (req, res) => {
  const { tableId } = req.params;
  const fields = queryAll('SELECT * FROM fields WHERE table_id = ? ORDER BY "order"', [tableId]);
  res.json(fields);
});

// 添加字段
app.post('/api/tables/:tableId/fields', (req, res) => {
  const { tableId } = req.params;
  const { name, type, options } = req.body;

  const maxOrder = queryOne('SELECT MAX("order") as maxOrder FROM fields WHERE table_id = ?', [tableId]);
  const order = (maxOrder?.maxOrder || 0) + 1;

  const result = runSQL(
    'INSERT INTO fields (table_id, name, type, options, "order") VALUES (?, ?, ?, ?, ?)',
    [tableId, name, type, JSON.stringify(options) || null, order]
  );

  res.json({ id: result.lastInsertRowid, name, type, options });
});

// 更新字段
app.put('/api/fields/:id', (req, res) => {
  const { id } = req.params;
  const { name, type, options } = req.body;

  runSQL(
    'UPDATE fields SET name = ?, type = ?, options = ? WHERE id = ?',
    [name, type, JSON.stringify(options) || null, id]
  );

  res.json({ success: true });
});

// 删除字段
app.delete('/api/fields/:id', (req, res) => {
  const { id } = req.params;
  runSQL('DELETE FROM cells WHERE field_id = ?', [id]);
  runSQL('DELETE FROM fields WHERE id = ?', [id]);
  res.json({ success: true });
});

// ==================== 行 API ====================

// 获取表格的所有行（包含单元格数据）
app.get('/api/tables/:tableId/rows', (req, res) => {
  const { tableId } = req.params;
  const rows = queryAll('SELECT * FROM rows WHERE table_id = ? ORDER BY created_at DESC', [tableId]);

  const result = rows.map(row => {
    const cells = queryAll(`
      SELECT c.field_id, c.value, f.type, f.options
      FROM cells c
      JOIN fields f ON c.field_id = f.id
      WHERE c.row_id = ?
    `, [row.id]);

    const rowData = { id: row.id, created_at: row.created_at };
    cells.forEach(cell => {
      rowData[`field_${cell.field_id}`] = cell.value;
    });
    return rowData;
  });

  res.json(result);
});

// 添加行
app.post('/api/tables/:tableId/rows', (req, res) => {
  const { tableId } = req.params;
  const { data } = req.body;

  const rowResult = runSQL('INSERT INTO rows (table_id) VALUES (?)', [tableId]);
  const rowId = rowResult.lastInsertRowid;

  if (data) {
    for (const [key, value] of Object.entries(data)) {
      if (key.startsWith('field_')) {
        const fieldId = parseInt(key.replace('field_', ''));
        runSQL('INSERT INTO cells (row_id, field_id, value) VALUES (?, ?, ?)', [rowId, fieldId, String(value)]);
      }
    }
  }

  res.json({ id: rowId, ...data });
});

// 更新行
app.put('/api/rows/:id', (req, res) => {
  const { id } = req.params;
  const { data } = req.body;

  if (data) {
    for (const [key, value] of Object.entries(data)) {
      if (key.startsWith('field_')) {
        const fieldId = parseInt(key.replace('field_', ''));

        // 先检查是否存在
        const existing = queryOne('SELECT id FROM cells WHERE row_id = ? AND field_id = ?', [id, fieldId]);

        if (existing) {
          runSQL('UPDATE cells SET value = ? WHERE row_id = ? AND field_id = ?', [String(value), id, fieldId]);
        } else {
          runSQL('INSERT INTO cells (row_id, field_id, value) VALUES (?, ?, ?)', [id, fieldId, String(value)]);
        }
      }
    }
  }

  res.json({ success: true });
});

// 删除行
app.delete('/api/rows/:id', (req, res) => {
  const { id } = req.params;
  runSQL('DELETE FROM cells WHERE row_id = ?', [id]);
  runSQL('DELETE FROM rows WHERE id = ?', [id]);
  res.json({ success: true });
});

// ==================== 影刀 API ====================

// 影刀批量导入销售数据
app.post('/api/yingdao/sales', (req, res) => {
  const { records } = req.body;

  if (!Array.isArray(records) || records.length === 0) {
    return res.status(400).json({ error: '请提供销售记录数组' });
  }

  const results = [];
  const tableId = 7; // 实时销售表的ID



  for (const record of records) {
    try {
      // 创建新行
      const rowResult = runSQL('INSERT INTO rows (table_id) VALUES (?)', [tableId]);
      const rowId = rowResult.lastInsertRowid;

      // 插入每个字段的数据
      for (const [fieldName, value] of Object.entries(record)) {
        // 查找字段ID
        const field = queryOne('SELECT id FROM fields WHERE table_id = ? AND name = ?', [tableId, fieldName]);
        if (field && value !== undefined && value !== null && value !== '') {
          runSQL('INSERT INTO cells (row_id, field_id, value) VALUES (?, ?, ?)', [rowId, field.id, String(value)]);
        }
      }

      results.push({ success: true, rowId, data: record });
    } catch (err) {
      results.push({ success: false, error: err.message, data: record });
    }
  }

  res.json({
    success: true,
    total: records.length,
    imported: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length,
    results
  });
});

// 影刀快速添加单条销售记录
app.post('/api/yingdao/sale', (req, res) => {
  const { 统计时间, 净支付金额 } = req.body;

  const tableId = 7; // 实时销售表的ID



  try {
    // 创建新行
    const rowResult = runSQL('INSERT INTO rows (table_id) VALUES (?)', [tableId]);
    const rowId = rowResult.lastInsertRowid;

    // 插入数据
    const fields = { 统计时间, 净支付金额 };
    for (const [fieldName, value] of Object.entries(fields)) {
      if (value !== undefined && value !== null && value !== '') {
        const field = queryOne('SELECT id FROM fields WHERE table_id = ? AND name = ?', [tableId, fieldName]);
        if (field) {
          runSQL('INSERT INTO cells (row_id, field_id, value) VALUES (?, ?, ?)', [rowId, field.id, String(value)]);
        }
      }
    }

    res.json({ success: true, rowId, message: '销售记录添加成功' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 影刀清空销售数据（可选）
app.delete('/api/yingdao/sales', (req, res) => {
  const tableId = 0;

  try {
    const rows = queryAll('SELECT id FROM rows WHERE table_id = ?', [tableId]);
    const rowIds = rows.map(r => r.id);

    if (rowIds.length > 0) {
      const placeholders = rowIds.map(() => '?').join(',');
      runSQL(`DELETE FROM cells WHERE row_id IN (${placeholders})`, rowIds);
      runSQL('DELETE FROM rows WHERE table_id = ?', [tableId]);
    }

    res.json({ success: true, message: `已清空 ${rowIds.length} 条销售记录` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 影刀获取字段列表
app.get('/api/yingdao/fields', (req, res) => {
  const tableId = 0;
  const fields = queryAll('SELECT id, name, type, options FROM fields WHERE table_id = ? ORDER BY "order"', [tableId]);
  res.json(fields);
});

// 初始化并启动服务器
initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 服务器运行在 http://localhost:${PORT}`);
    console.log(`📊 多维表 API 已就绪`);
  });
}).catch(err => {
  console.error('数据库初始化失败:', err);
  process.exit(1);
});
