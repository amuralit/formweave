import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@formweave/core': path.resolve(__dirname, '../../packages/core/src'),
      '@formweave/widgets': path.resolve(__dirname, '../../packages/widgets/src'),
      '@formweave/theme': path.resolve(__dirname, '../../packages/theme/src'),
      '@formweave/react': path.resolve(__dirname, '../../packages/react/src'),
      '@formweave/ag-ui': path.resolve(__dirname, '../../packages/ag-ui/src'),
      'formweave': path.resolve(__dirname, '../../packages/formweave/src'),
    },
  },
});
