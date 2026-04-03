import express from 'express'
import fs from 'fs'
import path from 'path'

const router = express.Router()
const configPath = path.join(process.cwd(), 'config.json')

// 读取配置
const readConfig = () => {
  if (fs.existsSync(configPath)) {
    const config = fs.readFileSync(configPath, 'utf8')
    return JSON.parse(config)
  }
  return {
    theme: 'default',
    primaryColor: '#3B82F6',
    secondaryColor: '#10B981',
    backgroundType: 'gradient',
    backgroundColor: '#ffffff',
    gradientStartColor: '#3B82F6',
    gradientEndColor: '#10B981',
    backgroundImage: '',
    animationType: 'grid',
    animationSpeed: 5,
    animationEffects: ['confetti']
  }
}

// 保存配置
const saveConfig = (config) => {
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2))
}

// 获取配置
router.get('/', (req, res) => {
  try {
    const config = readConfig()
    res.json(config)
  } catch (error) {
    console.error('获取配置失败:', error)
    res.status(500).json({ error: '获取配置失败' })
  }
})

// 更新配置
router.put('/', (req, res) => {
  try {
    const newConfig = req.body
    saveConfig(newConfig)
    res.json({ success: true, config: newConfig })
  } catch (error) {
    console.error('更新配置失败:', error)
    res.status(500).json({ error: '更新配置失败' })
  }
})

export default router
