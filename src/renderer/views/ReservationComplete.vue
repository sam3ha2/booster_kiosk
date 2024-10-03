<template>
  <div class="reservation-complete">
    <h2>예약이 완료되었습니다</h2>
    <div class="reservation-details">
      <p><strong>예약 번호:</strong> {{ reservationId }}</p>
      <p><strong>선택한 상품:</strong> {{ productName }}</p>
      <p><strong>가격:</strong> {{ price.toLocaleString() }}원</p>
    </div>
    <p>세차를 시작하려면 세차기로 이동해주세요.</p>
    <button @click="goToHome" class="home-button">홈으로 돌아가기</button>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()

const reservationId = route.params.reservationId
const productName = route.params.productName
const price = Number(route.params.price)

onMounted(() => {
  console.log('예약 완료 페이지가 로드되었습니다.')
})

const goToHome = () => {
  router.push('/')
}
</script>

<style scoped>
.reservation-complete {
  padding: 20px;
  text-align: center;
}

.reservation-details {
  margin: 20px 0;
  padding: 20px;
  background-color: #f0f0f0;
  border-radius: 10px;
}

.home-button {
  background-color: #4CAF50;
  border: none;
  color: white;
  padding: 15px 32px;
  text-align: center;
  text-decoration: none;
  display: inline-block;
  font-size: 16px;
  margin: 4px 2px;
  cursor: pointer;
  border-radius: 5px;
}
</style>