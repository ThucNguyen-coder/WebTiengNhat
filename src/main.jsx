import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { ProgressProvider } from './lib/store';
import './styles.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ProgressProvider>
      <App />
    </ProgressProvider>
  </React.StrictMode>,
);
