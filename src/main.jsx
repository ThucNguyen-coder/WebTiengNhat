import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { ProgressProvider } from './lib/store';
import { AuthProvider } from './lib/auth';
import './styles.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <ProgressProvider>
        <App />
      </ProgressProvider>
    </AuthProvider>
  </React.StrictMode>,
);
