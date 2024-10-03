import { createRouter, createWebHashHistory } from 'vue-router'
import Home from './views/Home.vue'
import ProductList from './views/ProductList.vue'
import Reservation from './views/Reservation.vue'
import Payment from './views/Payment.vue'
import ReservationComplete from './views/ReservationComplete.vue'

const routes = [
  {
    path: '/',
    name: 'home',
    component: Home
  },
  {
    path: '/products',
    name: 'products',
    component: ProductList
  },
  {
    path: '/reservation',
    name: 'reservation',
    component: Reservation
  },
  {
    path: '/payment',
    name: 'payment',
    component: Payment
  },
  {
    path: '/reservation-complete',
    name: 'reservation-complete',
    component: ReservationComplete
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router