import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      // Aquí le decimos a Vite que no intente empaquetar estas librerías,
      // porque se cargarán de forma externa en el navegador.
      // ¡Ahora incluye 'lucide-react' para solucionar el error!
      external: ['firebase/app', 'firebase/auth', 'firebase/firestore', 'lucide-react'],
    },
  },
});