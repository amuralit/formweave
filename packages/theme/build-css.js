import { copyFileSync, mkdirSync } from 'fs';
mkdirSync('dist', { recursive: true });
copyFileSync('src/styles.css', 'dist/styles.css');
