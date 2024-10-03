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
      상품 목록을 불러오는 중...
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

onMounted(async () => {
  try {
    const response = await ApiService.getProducts()
    products.value = response.list.map(p => new Product(p.idx, p.name, p.description, p.price, p.duration, p.target_mode, p.payment_rf_only))
    loading.value = false
  } catch (err) {
    console.error('상품 목록을 불러오는데 실패했습니다:', err)
    error.value = err
    loading.value = false
  }
})

const selectProduct = (product) => {
  router.push({ name: 'reservation', params: { product: JSON.stringify(product) } })
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
</style>