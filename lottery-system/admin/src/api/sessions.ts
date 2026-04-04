import request from './request'

export const getSessions = (sceneId?: number) => {
  const params = sceneId ? { scene_id: sceneId } : {}
  return request.get('/sessions', { params })
}
export const getSession = (id: number) => request.get(`/sessions/${id}`)
export const createSession = (data: any) => request.post('/sessions', data)
export const deleteSession = (id: number) => request.delete(`/sessions/${id}`)
export const addParticipants = (sessionId: number, participantIds: number[]) => 
  request.post(`/sessions/${sessionId}/participants`, { participant_ids: participantIds })
export const addPrize = (sessionId: number, prizeId: number, quantity = 1) => 
  request.post(`/sessions/${sessionId}/prizes`, { prize_id: prizeId, quantity })
export const removePrize = (sessionId: number, prizeId: number) => 
  request.delete(`/sessions/${sessionId}/prizes/${prizeId}`)
export const drawLottery = (sessionId: number, prizeId: number) => 
  request.post(`/sessions/${sessionId}/draw`, { prize_id: prizeId })
export const resetSession = (sessionId: number) => 
  request.post(`/sessions/${sessionId}/reset`)
export const getPrizeLevels = (sessionId: number) => 
  request.get(`/sessions/${sessionId}/prize-levels`)

export const drawBatch = (sessionId: number, prizeId: number, count: number, excludePreviousWinners = true) => 
  request.post(`/sessions/${sessionId}/draw/batch`, { 
    prize_id: prizeId, 
    count, 
    exclude_previous_winners: excludePreviousWinners 
  })

export const drawByLevel = (sessionId: number, level: string, count: number, excludePreviousWinners = true) => 
  request.post(`/sessions/${sessionId}/draw/by-level`, { 
    level, 
    count, 
    exclude_previous_winners: excludePreviousWinners 
  })

export const drawMultiPrizes = (sessionId: number, draws: Array<{ prize_id: number; count: number }>) => 
  request.post(`/sessions/${sessionId}/draw/multi-prizes`, { draws })
