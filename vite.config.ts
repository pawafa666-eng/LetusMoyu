import {defineConfig} from 'vite'
import vue from '@vitejs/plugin-vue'
import {createRequire} from 'node:module'
const require=createRequire(import.meta.url)
export default defineConfig(({command})=>({cacheDir:'node_modules/.vite-game',plugins:[vue(),...(command==='serve'?[require('./scripts/preview.cjs')()]:[])],base:'./',server:{host:'0.0.0.0'},build:{target:'es2022'}}))
