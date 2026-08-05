import { createApp } from 'vue'
import App from './App.vue'
import { install } from './composables/cssScripts'
import './templatecss.css'
import './style.css'

const app = createApp(App)
install(app)
app.mount('#app')
