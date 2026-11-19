import React from 'react';
import { createRoot } from 'react-dom/client';
import { loadRemoteContent } from './lib/remoteContent';
import './styles.css';

// Content edited by teachers (Supabase) is loaded first, then the app modules,
// so every page sees the same topics. Root is imported afterwards on purpose.
const root = createRoot(document.getElementById('root'));

loadRemoteContent()
  .then(() => import('./Root'))
  .then(({ default: Root }) => {
    root.render(
      <React.StrictMode>
        <Root />
      </React.StrictMode>,
    );
  });
