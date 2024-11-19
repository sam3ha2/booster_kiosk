import React from 'react';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';
import Home from './views/Home';
import ProductList from './views/ProductList';
import Admin from './views/Admin';
import PaymentAdmin from './views/PaymentAdmin';

const AppRouter = () => {
  return (
    <Router>
      <Switch>
        <Route exact path='/' component={Home} />
        <Route path='/products' component={ProductList} />
        <Route path='/admin' component={Admin} />
        <Route path='/payment-admin' component={PaymentAdmin} />
      </Switch>
    </Router>
  );
};

export default AppRouter;
