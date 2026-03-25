import { useState, useEffect } from 'react'

function App() {
  const [tables, setTables] = useState([])
  const [currentTable, setCurrentTable] = useState(null)
  const [fields, setFields] = useState([])
  const [rows, setRows] = useState([])
  const [showNewTableModal, setShowNewTableModal] = useState(false)
  const [showNewFieldModal, setShowNewFieldModal] = useState(false)
  const [newTableName, setNewTableName] = useState('')
  const [newField, setNewField] = useState({ name: '', type: 'text', options: [] })
  const [newOption, setNewOption] = useState('')
  const [loading, setLoading] = useState(false)

  // 加载所有表格
  useEffect(() => {
    fetch('/api/tables')
      .then(res => res.json())
      .then(data => setTables(data))
      .catch(err => console.error('加载表格失败:', err))
  }, [])

  // 选择表格时加载字段和行
  useEffect(() => {
    if (currentTable) {
      Promise.all([
        fetch(`/api/tables/${currentTable.id}/fields`).then(r => r.json()),
        fetch(`/api/tables/${currentTable.id}/rows`).then(r => r.json())
      ])
        .then(([fieldsData, rowsData]) => {
          setFields(fieldsData)
          setRows(rowsData)
        })
        .catch(err => console.error('加载数据失败:', err))
    }
  }, [currentTable])

  // 创建新表格
  const handleCreateTable = async () => {
    if (!newTableName.trim()) return

    setLoading(true)
    try {
      const res = await fetch('/api/tables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newTableName })
      })
      const newTable = await res.json()
      setTables([...tables, newTable])
      setCurrentTable(newTable)
      setNewTableName('')
      setShowNewTableModal(false)
    } catch (err) {
      console.error('创建表格失败:', err)
    }
    setLoading(false)
  }

  // 删除表格
  const handleDeleteTable = async (tableId, e) => {
    e.stopPropagation()
    if (!confirm('确定要删除这个表格吗？')) return

    try {
      await fetch(`/api/tables/${tableId}`, { method: 'DELETE' })
      setTables(tables.filter(t => t.id !== tableId))
      if (currentTable?.id === tableId) {
        setCurrentTable(null)
        setFields([])
        setRows([])
      }
    } catch (err) {
      console.error('删除表格失败:', err)
    }
  }

  // 创建新字段
  const handleCreateField = async () => {
    if (!newField.name.trim()) return

    setLoading(true)
    try {
      const res = await fetch(`/api/tables/${currentTable.id}/fields`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newField)
      })
      const field = await res.json()
      setFields([...fields, { ...field, options: newField.options }])
      setNewField({ name: '', type: 'text', options: [] })
      setShowNewFieldModal(false)
    } catch (err) {
      console.error('创建字段失败:', err)
    }
    setLoading(false)
  }

  // 添加选项
  const handleAddOption = () => {
    if (newOption.trim()) {
      setNewField({
        ...newField,
        options: [...newField.options, newOption.trim()]
      })
      setNewOption('')
    }
  }

  // 创建新行
  const handleAddRow = async () => {
    try {
      const res = await fetch(`/api/tables/${currentTable.id}/rows`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: {} })
      })
      const newRow = await res.json()
      setRows([newRow, ...rows])
    } catch (err) {
      console.error('创建行失败:', err)
    }
  }

  // 更新单元格
  const handleCellUpdate = async (rowId, fieldId, value) => {
    try {
      await fetch(`/api/rows/${rowId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: { [`field_${fieldId}`]: value }
        })
      })
    } catch (err) {
      console.error('更新单元格失败:', err)
    }
  }

  // 删除行
  const handleDeleteRow = async (rowId) => {
    if (!confirm('确定要删除这行吗？')) return

    try {
      await fetch(`/api/rows/${rowId}`, { method: 'DELETE' })
      setRows(rows.filter(r => r.id !== rowId))
    } catch (err) {
      console.error('删除行失败:', err)
    }
  }

  // 渲染单元格内容
  const renderCell = (row, field) => {
    const value = row[`field_${field.id}`] || ''

    if (field.type === 'select') {
      const options = field.options ? JSON.parse(field.options) : []
      return (
        <select
          value={value}
          onChange={(e) => handleCellUpdate(row.id, field.id, e.target.value)}
        >
          <option value="">请选择</option>
          {options.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      )
    }

    if (field.type === 'date') {
      return (
        <input
          type="date"
          value={value}
          onChange={(e) => handleCellUpdate(row.id, field.id, e.target.value)}
        />
      )
    }

    if (field.type === 'number') {
      return (
        <input
          type="number"
          value={value}
          onChange={(e) => handleCellUpdate(row.id, field.id, e.target.value)}
        />
      )
    }

    return (
      <input
        type="text"
        value={value}
        onChange={(e) => handleCellUpdate(row.id, field.id, e.target.value)}
      />
    )
  }

  return (
    <div className="app">
      {/* 侧边栏 */}
      <div className="sidebar">
        <div className="sidebar-header">
          <h1>📊 多维表</h1>
        </div>
        <div className="sidebar-content">
          <ul className="table-list">
            {tables.map(table => (
              <li
                key={table.id}
                className={`table-item ${currentTable?.id === table.id ? 'active' : ''}`}
                onClick={() => setCurrentTable(table)}
              >
                <span className="table-item-icon">📋</span>
                <span className="table-item-name">{table.name}</span>
                <button
                  className="table-item-delete"
                  onClick={(e) => handleDeleteTable(table.id, e)}
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
          <button
            className="add-table-btn"
            onClick={() => setShowNewTableModal(true)}
          >
            <span>+</span>
            <span>新建表格</span>
          </button>
        </div>
      </div>

      {/* 主内容区 */}
      <div className="main-content">
        {currentTable ? (
          <>
            <div className="header">
              <h2 className="header-title">{currentTable.name}</h2>
              <div className="header-actions">
                <button className="btn btn-secondary" onClick={handleAddRow}>
                  + 新增行
                </button>
              </div>
            </div>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: 50 }}>#</th>
                    {fields.map(field => (
                      <th key={field.id}>
                        <div className="field-header">
                          {field.name}
                          <span className="field-type-badge">
                            {field.type === 'text' ? '文本' :
                             field.type === 'select' ? '选择' :
                             field.type === 'date' ? '日期' :
                             field.type === 'number' ? '数字' : field.type}
                          </span>
                        </div>
                      </th>
                    ))}
                    <th className="add-field-column">
                      <button
                        className="add-field-btn"
                        onClick={() => setShowNewFieldModal(true)}
                      >
                        + 添加字段
                      </button>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => (
                    <tr key={row.id}>
                      <td style={{ color: '#999', fontSize: 12 }}>{index + 1}</td>
                      {fields.map(field => (
                        <td key={field.id}>
                          {renderCell(row, field)}
                        </td>
                      ))}
                      <td className="add-field-column">
                        <button
                          className="delete-row-btn"
                          onClick={() => handleDeleteRow(row.id)}
                        >
                          删除
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {rows.length === 0 && (
                <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>
                  暂无数据，点击"新增行"添加数据
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon">📋</div>
            <div className="empty-state-text">选择或创建一个表格开始使用</div>
            <button
              className="btn btn-primary"
              onClick={() => setShowNewTableModal(true)}
            >
              创建新表格
            </button>
          </div>
        )}
      </div>

      {/* 新建表格模态框 */}
      {showNewTableModal && (
        <div className="modal-overlay" onClick={() => setShowNewTableModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">创建新表格</div>
            <div className="modal-body">
              <input
                type="text"
                placeholder="请输入表格名称"
                value={newTableName}
                onChange={(e) => setNewTableName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => setShowNewTableModal(false)}
              >
                取消
              </button>
              <button
                className="btn btn-primary"
                onClick={handleCreateTable}
                disabled={loading}
              >
                创建
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 新建字段模态框 */}
      {showNewFieldModal && (
        <div className="modal-overlay" onClick={() => setShowNewFieldModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">添加新字段</div>
            <div className="modal-body">
              <input
                type="text"
                placeholder="字段名称"
                value={newField.name}
                onChange={(e) => setNewField({ ...newField, name: e.target.value })}
                style={{ marginBottom: 12 }}
              />
              <select
                value={newField.type}
                onChange={(e) => setNewField({ ...newField, type: e.target.value, options: [] })}
                style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid #ddd' }}
              >
                <option value="text">文本</option>
                <option value="number">数字</option>
                <option value="select">下拉选择</option>
                <option value="date">日期</option>
              </select>

              {newField.type === 'select' && (
                <div className="field-config">
                  <label>选项列表</label>
                  {newField.options.map((opt, i) => (
                    <div key={i} style={{
                      display: 'inline-block',
                      background: '#e8f4fd',
                      padding: '4px 10px',
                      borderRadius: 4,
                      margin: '4px 4px 4px 0',
                      fontSize: 13
                    }}>
                      {opt}
                    </div>
                  ))}
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <input
                      type="text"
                      placeholder="添加选项"
                      value={newOption}
                      onChange={(e) => setNewOption(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddOption()}
                    />
                    <button className="btn btn-secondary" onClick={handleAddOption}>添加</button>
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setShowNewFieldModal(false)
                  setNewField({ name: '', type: 'text', options: [] })
                }}
              >
                取消
              </button>
              <button
                className="btn btn-primary"
                onClick={handleCreateField}
                disabled={loading}
              >
                添加
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
