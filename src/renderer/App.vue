<template>
  <div id="app">
    <header>
      <h1>부스터 키오스크</h1>
    </header>
    <div class="main-content">
      <router-view></router-view>
    </div>
    <div class="ad-area">
      <video-ad></video-ad>
    </div>
  </div>
</template>

<script setup>
import VideoAd from './components/VideoAd.vue'
</script>

<style>
#app {
  font-family: 'Avenir', Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  display: flex;
  flex-direction: column;
  height: 100vh;
}

header {
  background-color: #4CAF50;
  color: white;
  padding: 10px;
}

.main-content {
  flex-grow: 1;
  overflow-y: auto;
}

.ad-area {
  height: 200px;
  background-color: #f0f0f0;
}
</style>