import React, { useState } from 'react';
import './App.css';

function App() {
  const [productId, setProductId] = useState('123');
  const [apiResponse, setApiResponse] = useState('');

  const fetchProduct = async () => {
    try {
      const response = await fetch(`/api/products/${productId}`);
      const data = await response.json();
      setApiResponse(JSON.stringify(data, null, 2));
    } catch (error) {
      setApiResponse(`Error: ${error.message}`);
    }
  };

  const addToCart = async () => {
    try {
      const response = await fetch('/api/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: parseInt(productId), quantity: 1 }),
      });
      const data = await response.json();
      setApiResponse(JSON.stringify(data, null, 2));
    } catch (error) {
      setApiResponse(`Error: ${error.message}`);
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>E-Commerce Test App</h1>
        <input type="text" value={productId} onChange={(e) => setProductId(e.target.value)} />
        <button onClick={fetchProduct}>Get Product</button>
        <button onClick={addToCart}>Add to Cart</button>
        <pre>{apiResponse}</pre>
      </header>
    </div>
  );
}

export default App;