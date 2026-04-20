import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { App } from './App';
import { ErrorBoundary } from './components/ui/ErrorBoundary';

const root = document.getElementById('root');
if (!root) throw new Error('Root element not found');

// Outer-most ErrorBoundary: catches failures thrown during App init,
// route setup, or StrictMode's double-invoke passes — anything that
// would otherwise white-screen the app before the per-route
// boundaries mount. Per-route boundaries still live inside App.tsx.
createRoot(root).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
