import request from './request'

export interface FieldConfig {
  id?: number
  scene_id: number
  field_key: string
  field_name: string
  field_type: 'text' | 'number' | 'select' | 'json' | 'date' | 'textarea'
  required: boolean
  placeholder?: string
  default_value?: string
  validation_rule?: string
  options?: any
  sort_order: number
}

export const getFieldConfigs = (sceneId: number) => 
  request.get(`/field-configs/scene/${sceneId}`)

export const createFieldConfig = (sceneId: number, data: Partial<FieldConfig>) => 
  request.post(`/field-configs/scene/${sceneId}`, data)

export const updateFieldConfig = (id: number, data: Partial<FieldConfig>) => 
  request.put(`/field-configs/${id}`, data)

export const deleteFieldConfig = (id: number) => 
  request.delete(`/field-configs/${id}`)
