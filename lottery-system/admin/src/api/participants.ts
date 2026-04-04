import request from './request'

export const getParticipants = (params?: any) => request.get('/participants', { params })
export const getParticipant = (id: number) => request.get(`/participants/${id}`)
export const createParticipant = (data: any) => request.post('/participants', data)
export const updateParticipant = (id: number, data: any) => request.put(`/participants/${id}`, data)
export const deleteParticipant = (id: number) => request.delete(`/participants/${id}`)
export const updateStatus = (id: number, status: string) => request.put(`/participants/${id}/status`, { status })
export const updateBlacklist = (id: number, is_blacklisted: boolean) => request.put(`/participants/${id}/blacklist`, { is_blacklisted })
export const importParticipants = (formData: FormData) => request.post('/participants/import', formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
})
export const exportParticipants = (data: { scene_id: number; ids?: number[] }) => request.post('/participants/export', data)
export const batchDeleteParticipants = (ids: number[]) => request.post('/participants/batch-delete', { ids })
export const batchUpdateStatus = (ids: number[], status: string) => request.post('/participants/batch-status', { ids, status })
export const downloadTemplate = (sceneId: number) => {
  window.open(`/api/participants/template/${sceneId}`, '_blank')
}
