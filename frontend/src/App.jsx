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

  // 视图模式状态
  const [viewMode, setViewMode] = useState('table') // 'table' | 'kanban' | 'calendar'
  const [kanbanField, setKanbanField] = useState(null) // 看板分组字段
  const [dateField, setDateField] = useState(null) // 日历日期字段
  const [currentMonth, setCurrentMonth] = useState(new Date()) // 日历当前月份

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
          // 自动选择看板字段（第一个select类型）
          const selectField = fieldsData.find(f => f.type === 'select')
          setKanbanField(selectField || null)
          // 自动选择日期字段
          const dateFld = fieldsData.find(f => f.type === 'date')
          setDateField(dateFld || null)
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
      // 更新本地状态
      setRows(rows.map(r => {
        if (r.id === rowId) {
          return { ...r, [`field_${fieldId}`]: value }
        }
        return r
      }))
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

  // 获取字段值
  const getFieldValue = (row, fieldId) => {
    return row[`field_${fieldId}`] || ''
  }

  // 渲染看板视图
  const renderKanbanView = () => {
    if (!kanbanField) {
      return (
        <div className="kanban-empty">
          <p>需要添加「下拉选择」类型的字段才能使用看板视图</p>
        </div>
      )
    }

    const options = kanbanField.options ? JSON.parse(kanbanField.options) : []
    const nameField = fields.find(f => f.type === 'text') // 用于显示卡片标题

    return (
      <div className="kanban-container">
        <div className="kanban-settings">
          <label>分组字段：</label>
          <select
            value={kanbanField.id}
            onChange={(e) => setKanbanField(fields.find(f => f.id === parseInt(e.target.value)))}
          >
            {fields.filter(f => f.type === 'select').map(f => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
        </div>
        <div className="kanban-board">
          {options.map(option => {
            const columnRows = rows.filter(r => getFieldValue(r, kanbanField.id) === option)
            return (
              <div key={option} className="kanban-column">
                <div className="kanban-column-header">
                  <span className="kanban-column-title">{option}</span>
                  <span className="kanban-column-count">{columnRows.length}</span>
                </div>
                <div className="kanban-cards">
                  {columnRows.map(row => (
                    <div key={row.id} className="kanban-card">
                      <div className="kanban-card-title">
                        {nameField ? getFieldValue(row, nameField.id) || '未命名' : `记录 #${row.id}`}
                      </div>
                      {fields.filter(f => f.id !== kanbanField.id && f.id !== nameField?.id).slice(0, 3).map(field => (
                        <div key={field.id} className="kanban-card-field">
                          <span className="kanban-card-field-label">{field.name}:</span>
                          <span className="kanban-card-field-value">
                            {field.type === 'select' ? (
                              <span className={`status-badge status-${getFieldValue(row, field.id)}`}>
                                {getFieldValue(row, field.id) || '-'}
                              </span>
                            ) : getFieldValue(row, field.id) || '-'}
                          </span>
                        </div>
                      ))}
                      <button
                        className="kanban-card-delete"
                        onClick={() => handleDeleteRow(row.id)}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  {columnRows.length === 0 && (
                    <div className="kanban-card-empty">暂无数据</div>
                  )}
                </div>
              </div>
            )
          })}
          {/* 未分类列 */}
          <div className="kanban-column">
            <div className="kanban-column-header">
              <span className="kanban-column-title">未分类</span>
              <span className="kanban-column-count">
                {rows.filter(r => !getFieldValue(r, kanbanField.id)).length}
              </span>
            </div>
            <div className="kanban-cards">
              {rows.filter(r => !getFieldValue(r, kanbanField.id)).map(row => (
                <div key={row.id} className="kanban-card">
                  <div className="kanban-card-title">
                    {nameField ? getFieldValue(row, nameField.id) || '未命名' : `记录 #${row.id}`}
                  </div>
                  <button
                    className="kanban-card-delete"
                    onClick={() => handleDeleteRow(row.id)}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // 渲染日历视图
  const renderCalendarView = () => {
    if (!dateField) {
      return (
        <div className="calendar-empty">
          <p>需要添加「日期」类型的字段才能使用日历视图</p>
        </div>
      )
    }

    const getDaysInMonth = (date) => {
      const year = date.getFullYear()
      const month = date.getMonth()
      const firstDay = new Date(year, month, 1)
      const lastDay = new Date(year, month + 1, 0)
      const daysInMonth = lastDay.getDate()
      const startingDay = firstDay.getDay()

      const days = []
      // 前置空白
      for (let i = 0; i < startingDay; i++) {
        days.push(null)
      }
      // 月份日期
      for (let i = 1; i <= daysInMonth; i++) {
        days.push(i)
      }
      return days
    }

    const getRowsForDate = (day) => {
      if (!day) return []
      const year = currentMonth.getFullYear()
      const month = currentMonth.getMonth() + 1
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      return rows.filter(r => getFieldValue(r, dateField.id) === dateStr)
    }

    const prevMonth = () => {
      setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))
    }

    const nextMonth = () => {
      setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))
    }

    const nameField = fields.find(f => f.type === 'text')
    const days = getDaysInMonth(currentMonth)
    const weekDays = ['日', '一', '二', '三', '四', '五', '六']
    const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']

    return (
      <div className="calendar-container">
        <div className="calendar-settings">
          <label>日期字段：</label>
          <select
            value={dateField.id}
            onChange={(e) => setDateField(fields.find(f => f.id === parseInt(e.target.value)))}
          >
            {fields.filter(f => f.type === 'date').map(f => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
        </div>
        <div className="calendar-header">
          <button className="calendar-nav-btn" onClick={prevMonth}>‹</button>
          <span className="calendar-title">
            {currentMonth.getFullYear()}年 {monthNames[currentMonth.getMonth()]}
          </span>
          <button className="calendar-nav-btn" onClick={nextMonth}>›</button>
        </div>
        <div className="calendar-grid">
          <div className="calendar-weekdays">
            {weekDays.map(day => (
              <div key={day} className="calendar-weekday">{day}</div>
            ))}
          </div>
          <div className="calendar-days">
            {days.map((day, index) => {
              const dayRows = getRowsForDate(day)
              return (
                <div key={index} className={`calendar-day ${day ? '' : 'empty'} ${day === new Date().getDate() && currentMonth.getMonth() === new Date().getMonth() && currentMonth.getFullYear() === new Date().getFullYear() ? 'today' : ''}`}>
                  {day && (
                    <>
                      <div className="calendar-day-number">{day}</div>
                      <div className="calendar-day-events">
                        {dayRows.slice(0, 3).map(row => (
                          <div key={row.id} className="calendar-event">
                            {nameField ? getFieldValue(row, nameField.id) || '未命名' : `记录 #${row.id}`}
                          </div>
                        ))}
                        {dayRows.length > 3 && (
                          <div className="calendar-event-more">+{dayRows.length - 3} 更多</div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  // 渲染表格视图
  const renderTableView = () => (
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
  )

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
                {/* 视图切换 */}
                <div className="view-switcher">
                  <button
                    className={`view-btn ${viewMode === 'table' ? 'active' : ''}`}
                    onClick={() => setViewMode('table')}
                    title="表格视图"
                  >
                    ⊞
                  </button>
                  <button
                    className={`view-btn ${viewMode === 'kanban' ? 'active' : ''}`}
                    onClick={() => setViewMode('kanban')}
                    title="看板视图"
                  >
                    ☰
                  </button>
                  <button
                    className={`view-btn ${viewMode === 'calendar' ? 'active' : ''}`}
                    onClick={() => setViewMode('calendar')}
                    title="日历视图"
                  >
                    📅
                  </button>
                </div>
                <button className="btn btn-secondary" onClick={handleAddRow}>
                  + 新增行
                </button>
              </div>
            </div>
            {viewMode === 'table' && renderTableView()}
            {viewMode === 'kanban' && renderKanbanView()}
            {viewMode === 'calendar' && renderCalendarView()}
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
