import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import ChatWidget from './components/ChatWidget';
import { ProgressProvider } from './lib/store';
import { AuthProvider } from './lib/auth';
import './styles.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <ProgressProvider>
        <App />
        <ChatWidget />
      </ProgressProvider>
    </AuthProvider>
  </React.StrictMode>,
);