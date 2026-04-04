import request from './request'

export const getConfig = () => request.get('/config')
export const updateConfig = (data: any) => request.put('/config', data)
