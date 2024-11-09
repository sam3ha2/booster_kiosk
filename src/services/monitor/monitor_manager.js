import SimpleStore from '../database/simple_store.js';
import { STORE_KEYS } from '../../constants/constants.js';
import displayControl from 'display-control';

class MonitorManager {
  constructor() {
    this.isMonitorOn = true;
    this.scheduleTimer = null;
  }

  async initialize() {
    try {
      // electron-store에서 운영 시간 정보 가져오기
      const operatingHours = SimpleStore.getInstance().get(STORE_KEYS.OPERATING_HOURS);
      let startTime = 900; // 기본값 09:00
      let endTime = 2300; // 기본값 23:00

      if (operatingHours) {
        startTime = operatingHours.start_time;
        endTime = operatingHours.end_time;
      }

      console.log(`운영 시간 설정: ${startTime} - ${endTime}`);
      this.setSchedule(startTime, endTime);
    } catch (error) {
      console.error('운영 시간 초기화 실패:', error);
      this.setSchedule(900, 2300); // 에러 시 기본값
    }
  }

  turnOffMonitor() {
    displayControl.sleep();
  }

  turnOnMonitor() {
    displayControl.wake();
  }

  setSchedule(startTime, endTime) {
    // 스케줄 저장
    SimpleStore.getInstance().set(STORE_KEYS.OPERATING_HOURS, {
      start_time: startTime,
      end_time: endTime,
    });

    if (this.scheduleTimer) {
      clearInterval(this.scheduleTimer);
    }

    this.scheduleTimer = setInterval(() => {
      const now = new Date();
      const currentTime = now.getHours() * 100 + now.getMinutes();

      if (currentTime === endTime && this.isMonitorOn) {
        this.turnOffMonitor();
      } else if (currentTime === startTime && !this.isMonitorOn) {
        this.turnOnMonitor();
      }
    }, 60000); // 1분마다 체크
  }

  clearSchedule() {
    if (this.scheduleTimer) {
      clearInterval(this.scheduleTimer);
      this.scheduleTimer = null;
    }
  }
}

export default MonitorManager;
