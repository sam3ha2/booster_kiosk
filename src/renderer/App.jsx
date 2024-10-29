import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './views/Home';
import ProductList from './views/ProductList';

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/products" element={<ProductList />} />
      </Routes>
    </Router>
  );
};

export default App;