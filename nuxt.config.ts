import { defineNuxtConfig } from 'nuxt/config';

export default defineNuxtConfig({
  compatibilityDate: '2026-05-29',
  devtools: { enabled: true },
  app: {
    pageTransition: { name: 'page', mode: 'out-in' }
  },
  srcDir: 'src/',
  modules: ['@nuxt/eslint'],
  css: ['element-plus/dist/index.css', '~/styles/reset.scss', '~/styles/global.scss'],
  runtimeConfig: {
    sessionSecret: process.env.NUXT_SESSION_SECRET,
    databasePath: process.env.NUXT_DATABASE_PATH || './data/archive.db',
    uploadsDir: process.env.NUXT_UPLOADS_DIR || './uploads',
    public: {
      ownerUserId: process.env.NUXT_OWNER_USER_ID || 'owner'
    }
  },
  vite: {
    css: {
      preprocessorOptions: {
        scss: {
          additionalData: '@use "~/styles/variables.scss" as *; @use "~/styles/mixins.scss" as *;'
        }
      }
    }
  },
  nitro: {
    preset: 'node-server'
  },
  typescript: {
    strict: true,
    typeCheck: true
  }
});
