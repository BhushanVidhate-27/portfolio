import React from 'react';
import ReactDOM from 'react-dom/client';
import Hyperspeed from './Hyperspeed.jsx';

const container = document.getElementById('assuranceBgContainer');
if (container) {
  const root = ReactDOM.createRoot(container);
  root.render(
    <React.StrictMode>
      <Hyperspeed />
    </React.StrictMode>
  );
}
