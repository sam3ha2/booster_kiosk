import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { VueQrcodeReader } from "vue-qrcode-reader";

const app = createApp(App)
app.use(router)
app.use(VueQrcodeReader)
app.mount('#app')