import { defineConfig, PluginOption } from "vite";
import { enterDevPlugin, enterProdPlugin } from 'vite-plugin-enter-dev';
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const plugins = [
    ...enterProdPlugin({ injectGoogleFonts: false }),
  ];
  if (mode === 'development') {
    plugins.push(...enterDevPlugin());
  }
  return {
    server: {
      host: "::",
      port: 8080,
      proxy: {
        "/supabase-storage": {
          target: "https://spb-t4n3zw7otj123173.supabase.opentrust.net/storage/v1/object/public",
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/supabase-storage/, ""),
        },
      },
    },
    plugins: plugins.filter(Boolean) as PluginOption[],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    base: '/',
    build: {
      outDir: 'dist',
      rollupOptions: {
        output: {
          // Separa os fornecedores em blocos próprios: o navegador reaproveita o cache
          // entre versões do site, em vez de baixar tudo de novo a cada publicação.
          manualChunks: {
            react: ['react', 'react-dom', 'react-router-dom'],
            backend: ['@supabase/supabase-js'],
            data: ['@tanstack/react-query'],
          },
        },
      },
    }
  };
});