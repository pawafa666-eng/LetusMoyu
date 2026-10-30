import {defineConfig} from 'vite'
import vue from '@vitejs/plugin-vue'
import {fileURLToPath} from 'node:url'
export default defineConfig({cacheDir:'node_modules/.vite-mailroom',plugins:[vue()],base:'./',server:{host:'0.0.0.0',port:5174,open:false},build:{target:'es2022',outDir:'dist-mailroom',rolldownOptions:{input:fileURLToPath(new URL('./office.html',import.meta.url))}}})
