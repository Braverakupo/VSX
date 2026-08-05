import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  base: '/VSX/',
  resolve: {
    alias: {
      // cssScripts.ts runtime templates need the FULL Vue build (vue.esm-bundler)
      vue: 'vue/dist/vue.esm-bundler.js'
    }
  },
  server: {
    allowedHosts: true,
    watch: {
      // better-sqlite3 holds exclusive file locks on Windows — ignore DB files
      // to prevent EBUSY / SQLITE_BUSY conflicts.
      ignored: ['**/*.db', '**/*.db-journal', '**/*.db-wal']
    }
  }
})
