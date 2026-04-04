import request from './request'

export const getScenes = () => request.get('/scenes')
export const getScene = (id: number) => request.get(`/scenes/${id}`)
export const createScene = (data: any) => request.post('/scenes', data)
export const updateScene = (id: number, data: any) => request.put(`/scenes/${id}`, data)
export const deleteScene = (id: number) => request.delete(`/scenes/${id}`)
export const switchScene = (id: number) => request.post(`/scenes/switch/${id}`)
export const getSceneStats = (id: number) => request.get(`/scenes/${id}/stats`)
