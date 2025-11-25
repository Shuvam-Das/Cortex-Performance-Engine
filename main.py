import React, { useState, useEffect } from 'react';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

function App() {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    // Fetch products when the component mounts
    fetch(`${API_URL}/api/products`)
      .then(res => res.json())
      .then(data => setProducts(data))
      .catch(err => console.error("Failed to fetch products:", err));
  }, []);

  const handleSearch = () => {
    // Simulate a user searching for a product
    fetch(`${API_URL}/api/products/search?query=top`)
      .then(res => res.json())
      .then(data => console.log("Search results:", data));
  };

  const handleOrder = () => {
    // Simulate a user placing an order
    fetch(`${API_URL}/api/orders`, { method: 'POST', body: JSON.stringify({ productId: 1, quantity: 1 }), headers: {'Content-Type': 'application/json'} })
      .then(res => res.json())
      .then(data => console.log("Order successful:", data));
  };

  return (
    <div>
      <h1>E-Commerce Store</h1>
      <button onClick={handleSearch}>Search for "top"</button>
      <button onClick={handleOrder}>Place Order</button>
      <ul>{products.map(p => <li key={p.id}>{p.name} - ${p.price}</li>)}</ul>
    </div>
  );
}

export default App;