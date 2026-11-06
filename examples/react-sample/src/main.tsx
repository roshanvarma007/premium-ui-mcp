import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './theme/fonts.css';
import './theme/tokens.css';
import './theme/base.css';
import './app.css';
import { App } from './App';
import { ThemeProvider } from './theme/theme';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>,
);
