import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './AuthContext';
import App from './App.jsx';
import CrashCatcher from './CrashCatcher.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <AuthProvider>
      <CrashCatcher>
        <App />
      </CrashCatcher>
    </AuthProvider>
  </BrowserRouter>
);