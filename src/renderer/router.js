import React from 'react';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';
import Home from './views/Home';
import ProductList from './views/ProductList';

const AppRouter = () => {
  return (
    <Router>
      <Switch>
        <Route exact path="/" component={Home} />
        <Route path="/products" component={ProductList} />
        {/* 다른 라우트 추가 */}
      </Switch>
    </Router>
  );
};

export default AppRouter;