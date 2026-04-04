import * as XLSX from 'xlsx'

export interface TemplateField {
  name: string
  description: string
  example: string
}

export const downloadTemplate = (filename: string, fields: TemplateField[], format: 'xlsx' | 'csv' = 'xlsx') => {
  const headers = fields.map(f => f.name)
  const examples = fields.map(f => f.example)
  const descriptions = fields.map(f => f.description)
  
  const wsData = [
    headers,
    examples,
    descriptions
  ]
  
  const ws = XLSX.utils.aoa_to_sheet(wsData)
  
  const colWidths = fields.map(f => ({ wch: Math.max(f.name.length, f.example.length, f.description.length) + 4 }))
  ws['!cols'] = colWidths
  
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '模板')
  
  if (format === 'csv') {
    const csv = XLSX.utils.sheet_to_csv(ws)
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' })
    downloadBlob(blob, `${filename}.csv`)
  } else {
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
    const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    downloadBlob(blob, `${filename}.xlsx`)
  }
}

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export const prizeTemplateFields: TemplateField[] = [
  { name: '名称', description: '奖品名称（必填）', example: 'iPhone 15' },
  { name: '描述', description: '奖品描述', example: '苹果最新手机' },
  { name: '数量', description: '奖品数量', example: '1' },
  { name: '等级', description: '特等奖/一等奖/二等奖/三等奖/参与奖', example: '特等奖' }
]

export const participantTemplateFields: TemplateField[] = [
  { name: '姓名', description: '参与者姓名（必填）', example: '张三' },
  { name: '邮箱', description: '邮箱地址', example: 'zhangsan@example.com' },
  { name: '电话', description: '联系电话', example: '13800138001' },
  { name: '权重', description: '中奖权重（数字越大几率越高）', example: '1' }
]

export const downloadPrizeTemplate = (format: 'xlsx' | 'csv' = 'xlsx') => {
  downloadTemplate('奖品导入模板', prizeTemplateFields, format)
}

export const downloadParticipantTemplate = (format: 'xlsx' | 'csv' = 'xlsx') => {
  downloadTemplate('人员导入模板', participantTemplateFields, format)
}
