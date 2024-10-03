<template>
  <div class="product-list">
    <div class="header">
      <button @click="goBack" class="back-button">뒤로</button>
      <h2 class="title">세차 상품 선택</h2>
    </div>
    <div v-if="error" class="error-message">
      <p>에러 코드: {{ error.status }}</p>
      <p>{{ error.message }}</p>
    </div>
    <div v-else-if="loading" class="loading-message">
      <p>{{ loadingMessage }}</p>
    </div>
    <div v-else class="product-grid">
      <div v-for="product in products" :key="product.idx" class="product-item" @click="selectProduct(product)">
        <div class="product-content">
          <h3 class="product-name">{{ product.name }}</h3>
          <p class="product-description">{{ product.description }}</p>
          <p class="product-price">{{ product.price.toLocaleString() }}원</p>
          <p class="product-duration">소요 시간: {{ product.duration }}분</p>
        </div>
      </div>
    </div>

    <!-- 결제 팝업 -->
    <div v-if="showPaymentPopup" class="payment-popup">
      <div class="payment-content">
        <h2>결제</h2>
        <p>선택한 상품: {{ selectedProduct.name }}</p>
        <p>가격: {{ selectedProduct.price.toLocaleString() }}원</p>
        <p>{{ paymentMessage }}</p>
        <button v-if="isDevelopment" @click="processPayment" :disabled="loading">
          개발 모드: 결제 시뮬레이션
        </button>
        <button @click="cancelPayment" :disabled="loading">취소</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Product } from '../../models/models'
import ApiService from '../../utils/api_service'

const router = useRouter()
const products = ref([])
const error = ref(null)
const loading = ref(true)
const loadingMessage = ref('상품 목록을 불러오는 중...')
const showPaymentPopup = ref(false)
const selectedProduct = ref(null)
const paymentMessage = ref('')
const isDevelopment = process.env.NODE_ENV === 'development'

onMounted(async () => {
  try {
    loadingMessage.value = '상품 목록을 불러오는 중...'
    const response = await ApiService.getProducts()
    products.value = response.list.map(p => new Product(p.idx, p.name, p.description, p.price, p.duration, p.target_mode, p.payment_rf_only))
  } catch (err) {
    console.error('상품 목록을 불러오는데 실패했습니다:', err)
    error.value = err
  } finally {
    loading.value = false
  }
})

const selectProduct = (product) => {
  selectedProduct.value = product
  showPaymentPopup.value = true
  if (!isDevelopment) {
    processPayment()
  }
}

const cancelPayment = () => {
  showPaymentPopup.value = false
  selectedProduct.value = null
  paymentMessage.value = ''
}

const processPayment = async () => {
  try {
    loading.value = true
    paymentMessage.value = '결제 처리 중...'

    // 실제 환경에서는 여기에 카드 결제 시퀀스 로직을 구현합니다.
    // 개발 환경에서는 시뮬레이션된 결제 정보를 사용합니다.
    const paymentInfo = await simulatePayment()

    paymentMessage.value = '예약 생성 중...'
    // 예약 요청
    const reservationResponse = await ApiService.createReservation({
      tel: '010-0000-0000', // TODO: 실제 사용자 전화번호 입력 받기
      product_idx: selectedProduct.value.idx,
      payment: paymentInfo
    })

    console.log('예약이 완료되었습니다:', reservationResponse)

    // 예약 완료 페이지로 이동
    router.push({ 
      name: 'reservation-complete', 
      params: { 
        reservationId: reservationResponse.item.idx,
        productName: selectedProduct.value.name,
        price: selectedProduct.value.price
      } 
    })
  } catch (error) {
    console.error('결제 또는 예약 중 오류가 발생했습니다:', error)
    paymentMessage.value = '결제 실패: ' + error.message
  } finally {
    loading.value = false
  }
}

const simulatePayment = () => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        approval_number: 'SIM' + Math.random().toString(36).substr(2, 9),
        card_number: '**** **** **** ' + Math.floor(1000 + Math.random() * 9000),
        card_company_number: '01',
        type: 'CARD',
        amount: selectedProduct.value.price
      })
    }, 2000) // 2초 후 결제 완료 시뮬레이션
  })
}

const goBack = () => {
  router.go(-1)
}
</script>

<style scoped>
.product-list {
  padding: 20px;
  background-color: #f0f0f0;
  min-height: 100vh;
}

.header {
  display: flex;
  align-items: center;
  margin-bottom: 20px;
}

.back-button {
  background-color: #4CAF50;
  border: none;
  color: white;
  padding: 10px 20px;
  text-align: center;
  text-decoration: none;
  display: inline-block;
  font-size: 16px;
  margin-right: 20px;
  cursor: pointer;
  border-radius: 5px;
}

.title {
  font-size: 24px;
  color: #333;
  margin: 0;
}

.product-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
}

.product-item {
  background-color: white;
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  transition: transform 0.3s ease;
}

.product-item:hover {
  transform: translateY(-5px);
}

.product-content {
  padding: 20px;
}

.product-name {
  font-size: 20px;
  color: #333;
  margin-bottom: 10px;
}

.product-description {
  font-size: 14px;
  color: #666;
  margin-bottom: 15px;
}

.product-price {
  font-size: 18px;
  font-weight: bold;
  color: #4CAF50;
  margin-bottom: 10px;
}

.product-duration {
  font-size: 14px;
  color: #888;
}

.error-message, .loading-message {
  text-align: center;
  font-size: 18px;
  color: #333;
  margin-top: 20px;
}

.error-message {
  color: #f44336;
}

.payment-popup {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
}

.payment-content {
  background-color: white;
  padding: 20px;
  border-radius: 10px;
  text-align: center;
}

.payment-content button {
  margin: 10px;
  padding: 10px 20px;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
}

.payment-content button:hover {
  background-color: #45a049;
}
</style>