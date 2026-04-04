import request from './request'

export const getTables = () => request.get('/database/tables')

export const getTableData = (name: string, page = 1, pageSize = 50) => 
  request.get(`/database/table/${name}`, { params: { page, pageSize } })

export const executeSql = (sql: string) => 
  request.post('/database/execute', { sql })

export const exportDatabase = () => 
  request.get('/database/export', { responseType: 'blob' })

export const importDatabase = (backup: string) => 
  request.post('/database/import', { backup })

export const getSchema = () => request.get('/database/schema')

export const getDatabaseInfo = () => request.get('/database/info')
