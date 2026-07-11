import React from 'react';
import ReactDOM from 'react-dom/client';
import Lanyard from './Lanyard.jsx';

const container = document.getElementById('lanyardContainer');
if (container) {
  const root = ReactDOM.createRoot(container);
  root.render(
    <React.StrictMode>
      <Lanyard
        position={[0, 0, 20]}
        gravity={[0, -40, 0]}
        frontImage="/lanyard_card_front.png"
        backImage="/6a101c34913dd6111b16324e_chwing.webp"
        lanyardWidth={1.2}
      />
    </React.StrictMode>
  );
}
