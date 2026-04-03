import express from 'express'
import multer from 'multer'
import fs from 'fs'
import path from 'path'

const router = express.Router()

// 配置文件上传
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/'
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir)
    }
    cb(null, uploadDir)
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname)
    cb(null, Date.now() + ext)
  }
})

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif']
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('只允许上传jpg/png/gif格式的图片'), false)
    }
  }
})

// 上传文件
router.post('/', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '请选择文件' })
    }

    const fileUrl = `/uploads/${req.file.filename}`
    res.json({ success: true, file_url: fileUrl })
  } catch (error) {
    console.error('上传文件失败:', error)
    res.status(500).json({ error: '上传文件失败' })
  }
})

export default router
