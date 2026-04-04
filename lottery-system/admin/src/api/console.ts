import request from './request'

export const startDraw = (sessionId: number, prizeId: number, prizeName?: string, prizeLevel?: string) => 
  request.post('/console/start', { 
    session_id: sessionId, 
    prize_id: prizeId,
    prize_name: prizeName,
    prize_level: prizeLevel
  })

export const stopDraw = (sessionId: number, prizeId: number, count: number = 1, allowRepeat: boolean = false) => 
  request.post('/console/stop', { 
    session_id: sessionId, 
    prize_id: prizeId,
    count,
    allow_repeat: allowRepeat
  })

export const pauseDraw = () => 
  request.post('/console/pause')

export const resetDraw = () => 
  request.post('/console/reset')
