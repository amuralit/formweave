import { createRoot } from 'react-dom/client';
import { App } from './App';

// Import FormWeave CSS — all styles including polished overrides
import '../../../packages/theme/src/styles.css';

createRoot(document.getElementById('root')!).render(<App />);
