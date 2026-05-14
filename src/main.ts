import { createApp } from 'vue';
import { createPinia } from 'pinia';
import ElementPlus from 'element-plus';
import zhCn from 'element-plus/dist/locale/zh-cn.mjs';
import 'element-plus/dist/index.css';
import * as ElIcons from '@element-plus/icons-vue';

import App from './App.vue';
import router from './router';
import { useAuthStore } from '@/stores/auth';

import './styles.css';

const app = createApp(App);
const pinia = createPinia();
app.use(pinia);

useAuthStore().restore();

app.use(router);
app.use(ElementPlus, { locale: zhCn });

for (const [key, comp] of Object.entries(ElIcons)) {
  app.component(`Icon${key}`, comp);
}

app.mount('#app');
