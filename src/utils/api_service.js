import axios from 'axios'

// const API_BASE_URL = 'https://api.boosteron.co.kr/api'
const API_BASE_URL = 'http://127.0.0.1:5000'

const api = axios.create({
  baseURL: API_BASE_URL,
})

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // const token = localStorage.getItem('token') // 토큰을 로컬 스토리지에서 가져옵니다.
    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0eXBlIjoiZGV2aWNlIiwiaWR4IjoiVWRkczJMeDlUV1M3VDFud2I3bWRMdyIsImlhdCI6MTcyMTkwNjU0Mn0.9eTYxhO5Sh6C7qCNWpZGpqCXIhgf2_9g7LOXRxNJiYU'
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      // 서버 응답이 있는 경우
      console.error('API Error:', error.response.data)
      return Promise.reject(error.response.data)
    } else if (error.request) {
      // 요청은 보냈지만 응답을 받지 못한 경우
      console.error('No response received:', error.request)
      return Promise.reject({ code: 'NO_RESPONSE', message: '서버로부터 응답을 받지 못했습니다.' })
    } else {
      // 요청 설정 중 오류가 발생한 경우
      console.error('Request error:', error.message)
      return Promise.reject({ code: 'REQUEST_ERROR', message: '요청 중 오류가 발생했습니다.' })
    }
  }
)

const ApiService = {
  async getProducts() {
    try {
      const response = await api.get('/kiosk/products')
      return response.data
    } catch (error) {
      throw error // 이제 error 객체에 code와 message가 포함됩니다.
    }
  },

  async getReservation(params) {
    try {
      const response = await api.get('/kiosk/reservations', { params })
      return response.data
    } catch (error) {
      throw error
    }
  },

  async updateReservationStatus(idx, params) {
    try {
      const response = await api.patch(`/kiosk/reservations/${idx}`, params)
      return response.data
    } catch (error) {
      throw error
    }
  },

  async createReservation(data) {
    try {
      const response = await api.post('/kiosk/reservations', {
        tel: data.tel,
        product_idx: data.product_idx,
        payment: {
          approval_number: data.payment.approval_number,
          card_number: data.payment.card_number,
          card_company_number: data.payment.card_company_number,
          type: data.payment.type,
          amount: data.payment.amount
        },
        status: data.status
      });
      return response.data;
    } catch (error) {
      console.error('예약 생성 실패:', error);
      throw error;
    }
  },
}

export default ApiService