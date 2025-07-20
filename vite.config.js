import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Eliminamos la sección 'build.rollupOptions.external'
  // porque Firebase y Lucide React ahora se cargan directamente en index.html
});
