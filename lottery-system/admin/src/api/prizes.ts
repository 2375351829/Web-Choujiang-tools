import request from './request'

export const getPrizes = (sceneId?: number) => {
  const params = sceneId ? { scene_id: sceneId } : {}
  return request.get('/prizes', { params })
}
export const getPrize = (id: number) => request.get(`/prizes/${id}`)
export const createPrize = (data: any) => request.post('/prizes', data)
export const updatePrize = (id: number, data: any) => request.put(`/prizes/${id}`, data)
export const deletePrize = (id: number) => request.delete(`/prizes/${id}`)
