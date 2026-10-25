import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load environment variables from frontend directory first
  const envFrontend = loadEnv(mode, path.resolve(import.meta.dirname, '.'), '')
  // Also check workspace root directory (D:\voice-of-kannada)
  const envRoot = loadEnv(mode, path.resolve(import.meta.dirname, '..'), '')

  const supabaseUrl = envFrontend.VITE_SUPABASE_URL || envRoot.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL || ''
  const supabaseAnonKey = envFrontend.VITE_SUPABASE_ANON_KEY || envRoot.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''
  const apiBaseUrl = envFrontend.VITE_API_BASE_URL || envRoot.VITE_API_BASE_URL || process.env.VITE_API_BASE_URL || 'http://localhost:8000'

  return {
    plugins: [react()],
    define: {
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(supabaseUrl),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(supabaseAnonKey),
      'import.meta.env.VITE_API_BASE_URL': JSON.stringify(apiBaseUrl),
    },
  }
})
