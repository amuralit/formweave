import { createRoot } from 'react-dom/client';
import { App } from './App';

// Import FormWeave CSS (direct path for Vite dev)
import '../../../packages/theme/src/styles.css';
// Override CSS — unlayered, guarantees visual quality
import './overrides.css';

createRoot(document.getElementById('root')!).render(<App />);
