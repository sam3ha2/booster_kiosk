import VguangScanner from './vguang/VguangScanner.js';
import EventEmitter from 'events';

class ScannerManager extends EventEmitter {
  constructor() {
    super();
    this.scanner = null;
  }

  initialize() {
    if (this.scanner) {
      console.log('Scanner already initialized');
      return;
    }

    console.log('Initializing scanner...');
    try {
      this.scanner = new VguangScanner({ mode: 'tx400' });
      this.scanner.on('ready', () => {
        console.log('스캐너가 준비되었습니다.');
        this.emit('ready');
      });

      let is = true;
      this.scanner.on('data', (data) => {
        if (is) {
          is = false;
          this.emit('data', data);
          setTimeout(() => (is = true), 2000);
        }
      });

      this.scanner.on('error', (error) => {
        console.error('스캐너 오류:', error);
        this.emit('error', error);
      });
    } catch (error) {
      console.log('스캐너 초기화 실패:', error);
      throw error;
    }
  }

  close() {
    if (this.scanner) {
      this.scanner.toggleLight(false);
      this.scanner.removeAllListeners();
      this.scanner = null;
    }
  }

  beep() {
    if (this.scanner) {
      this.scanner.beep(1);
    }
  }

  toggleLight(isOn) {
    if (this.scanner) {
      this.scanner.toggleLight(isOn);
    }
  }

  getDeviceStatus() {
    return {
      connected: this.scanner !== null,
    };
  }
}

export default ScannerManager;
