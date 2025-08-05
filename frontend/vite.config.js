import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import eslint from 'vite-plugin-eslint2';

// https://vite.dev/config/
export default defineConfig({
    plugins: [react(), eslint()],
    server: {
        host: '0.0.0.0', // This will bind the server to all network interfaces
        port: 4000,
    },
});
