<template>
  <div class="video-ad">
    <video :src="adVideoSrc" autoplay loop muted></video>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const adVideoSrc = ref('path/to/your/ad/video.mp4')
</script>

<style scoped>
.video-ad {
  width: 100%;
  height: 100%;
}

video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
</style>