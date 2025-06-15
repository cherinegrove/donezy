
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    watch: {
      // Disable polling completely to reduce file system load
      usePolling: false,
      // Increase intervals significantly to reduce file system pressure
      interval: 1000,
      binaryInterval: 2000,
      // Ignore more directories to reduce watched files
      ignored: [
        '**/node_modules/**',
        '**/dist/**',
        '**/build/**',
        '**/.git/**',
        '**/coverage/**',
        '**/public/**',
        '**/supabase/**',
        '**/*.log',
        '**/tmp/**',
        '**/temp/**',
        '**/.cache/**',
        '**/.*',
      ],
      // Reduce the number of watchers
      followSymlinks: false,
    },
    // Add file system limits
    fs: {
      strict: true,
      allow: ['..'],
    },
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // More aggressive optimization
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react-router-dom",
      "@tanstack/react-query",
      "@supabase/supabase-js"
    ],
    // Force specific dependencies to be pre-bundled
    force: true,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom"],
          router: ["react-router-dom"],
          query: ["@tanstack/react-query"],
          supabase: ["@supabase/supabase-js"],
        },
      },
    },
    // Reduce build overhead
    sourcemap: false,
    minify: 'esbuild',
  },
  // Reduce module resolution overhead
  esbuild: {
    logOverride: { 'this-is-undefined-in-esm': 'silent' }
  },
}));
