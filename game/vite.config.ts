import { defineConfig } from 'vite';

export default defineConfig({
    base: './',
    build: {
        target: 'es2022',
        assetsInlineLimit: 0,
        chunkSizeWarningLimit: 2000,
        rollupOptions: {
            output: {
                manualChunks: (id) => (id.includes('node_modules/phaser') ? 'phaser' : undefined)
            }
        }
    },
    server: { port: 8080, host: '127.0.0.1' }
});
