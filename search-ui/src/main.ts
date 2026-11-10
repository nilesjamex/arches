import './styles/main.scss'

import { createApp } from 'vue'
import App from './App.vue'
import { createAppRouter } from './router'
import './composables/useTheme' // applies the saved or system theme before first render

createApp(App).use(createAppRouter()).mount('#app')
