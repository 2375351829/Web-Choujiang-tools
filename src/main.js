import { createApp } from 'vue'
import App from './App.vue'
import { io } from 'socket.io-client'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'

// 全局注册Socket.io
const app = createApp(App)
app.config.globalProperties.io = io
app.use(ElementPlus)
app.mount('#app')