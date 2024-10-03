<template>
  <div class="home">
    <div class="content">
      <div class="logo">BOOSTER</div>
      <h1>부스터 세차</h1>
      <p>최고의 세차 서비스를 경험해보세요</p>
      <div class="button-container">
        <button @click="startWash" class="main-button">세차 시작하기</button>
        <button @click="checkReservation" class="main-button">예약 확인</button>
      </div>
    </div>

    <!-- QR 코드 스캐너 모달 -->
    <div v-if="showQrScanner" class="qr-scanner-modal">
      <div class="qr-scanner-content">
        <button @click="closeQrScanner" class="close-button">
          <span class="close-icon">&#10005;</span>
        </button>
        <h2>QR 코드를 스캔해주세요</h2>
        <p class="scanner-instruction">예약 확인을 위해 QR 코드를 카메라에 보여주세요.</p>
        <qrcode-stream v-if="isDevelopment" @decode="onDecode" @init="onInit"></qrcode-stream>
        <div v-else class="qr-placeholder">
          <p>카메라가 활성화되었습니다. QR 코드를 스캔해주세요.</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { QrcodeStream } from 'vue-qrcode-reader'
import ApiService from '../../utils/api_service'

const router = useRouter()
const showQrScanner = ref(false)
const isDevelopment = process.env.NODE_ENV === 'development'

const startWash = () => {
  router.push('/products')
}

const checkReservation = () => {
  showQrScanner.value = true
}

const closeQrScanner = () => {
  showQrScanner.value = false
}

const onInit = async (promise) => {
  try {
    await promise
  } catch (error) {
    if (error.name === 'NotAllowedError') {
      console.error('카메라 접근 권한이 없습니다.')
    } else if (error.name === 'NotFoundError') {
      console.error('카메라를 찾을 수 없습니다.')
    } else if (error.name === 'NotSupportedError') {
      console.error('보안 컨텍스트에서 실행되지 않습니다.')
    } else if (error.name === 'NotReadableError') {
      console.error('카메라가 이미 사용 중입니다.')
    } else if (error.name === 'OverconstrainedError') {
      console.error('설치된 카메라가 없습니다.')
    } else if (error.name === 'StreamApiNotSupportedError') {
      console.error('브라우저가 필요한 API를 지원하지 않습니다.')
    } else {
      console.error('QR 코드 스캐너 초기화 중 오류가 발생했습니다:', error)
    }
  }
}

const onDecode = async (decodedString) => {
  try {
    const [qrIdx, qrCreatedAt, qrChecksum] = decodedString.split('|')
    
    const reservationResponse = await ApiService.getReservation({
      qr_idx: qrIdx,
      qr_created_at: qrCreatedAt,
      qr_checksum: qrChecksum
    })
    
    if (reservationResponse.item) {
      const updateResponse = await ApiService.updateReservationStatus(
        reservationResponse.item.idx,
        'COMPLETE',
        null
      )
      
      if (updateResponse.type === 'SUCCESS') {
        const controlResponse = await ApiService.controlCarWash('START')
        
        if (controlResponse.success) {
          alert('예약이 확인되었습니다. 세차를 시작합니다.')
        } else {
          alert('세차기 시작에 실패했습니다. 관리자에게 문의해주세요.')
        }
      } else {
        alert('예약 상태 업데이트에 실패했습니다. 다시 시도해주세요.')
      }
    } else {
      alert('유효하지 않은 QR 코드입니다.')
    }
    
    closeQrScanner()
  } catch (error) {
    console.error('예약 확인 중 오류가 발생했습니다:', error)
    alert('예약 확인 중 오류가 발생했습니다. 다시 시도해주세요.')
  }
}
</script>

<style scoped>
.home {
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: #f0f0f0;
  color: #333;
  text-align: center;
}

.content {
  width: 80%;
  max-width: 600px;
}

.logo {
  font-size: 3rem;
  font-weight: bold;
  color: #4CAF50;
  margin-bottom: 1rem;
}

h1 {
  font-size: 2.5rem;
  margin-bottom: 1rem;
}

p {
  font-size: 1.2rem;
  margin-bottom: 2rem;
  color: #666;
}

.button-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.main-button {
  background-color: #4CAF50;
  border: none;
  color: white;
  padding: 15px 32px;
  text-align: center;
  text-decoration: none;
  display: inline-block;
  font-size: 1.2rem;
  margin: 4px 2px;
  cursor: pointer;
  border-radius: 5px;
  width: 100%;
  max-width: 300px;
  transition: background-color 0.3s;
}

.main-button:hover {
  background-color: #45a049;
}

.qr-scanner-modal {
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

.qr-scanner-content {
  background-color: white;
  padding: 20px;
  border-radius: 10px;
  text-align: center;
  position: relative;
  width: 80%;
  max-width: 400px;
}

.close-button {
  position: absolute;
  top: 10px;
  right: 10px;
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  padding: 5px;
}

.close-icon {
  color: #333;
}

.scanner-instruction {
  margin-bottom: 20px;
  color: #666;
}

.qr-placeholder {
  border: 2px dashed #ccc;
  padding: 20px;
  margin-top: 20px;
  border-radius: 5px;
}
</style>