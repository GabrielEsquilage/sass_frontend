import { defineConfig, loadEnv } from 'vite';
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return { server: { proxy: { '/api': { target: env.CLOUD_API_URL || 'http://127.0.0.1:4000', changeOrigin: true } } } };
});
