const VguangScanner = require('./vguang/VguangScanner');
const EventEmitter = require('events');
const { ipcMain } = require('electron');

class ScannerManager extends EventEmitter {
  constructor() {
    super();
    this.scanner = null;
    this.initRetries = 0;
    this.MAX_INIT_RETRIES = 3;
    this.INIT_RETRY_DELAY = 2000; // 2초
    this.setupIpcHandlers();
  }

  setupIpcHandlers() {
    ipcMain.handle('getInitialScannerState', () => {
      return { isInitialized: this.isInitialized() };
    });

    ipcMain.handle('beep', () => {
      this.beep();
      return true;
    });

    ipcMain.handle('toggleLight', (event, isOn) => {
      this.toggleLight(isOn);
      return true;
    });
  }

  initialize() {
    if (this.scanner) {
      console.log("Scanner already initialized");
      return true;
    }

    console.log("Initializing scanner...");
    try {
      this.scanner = new VguangScanner({ mode: "tx400" });
      this.scanner.on("ready", () => {
        console.log("스캐너가 준비되었습니다.");
        this.emit('ready');
      });

      this.scanner.on("data", (data) => {
        this.emit('data', data);
      });

      this.scanner.on("error", (error) => {
        console.error("스캐너 오류:", error);
        this.emit('error', error);
      });

      return true;
    } catch (error) {
      console.log("스캐너 초기화 실패:", error);

      if (this.initRetries < this.MAX_INIT_RETRIES) {
        this.initRetries++;
        console.log(`스캐너 초기화 재시도 (${this.initRetries}/${this.MAX_INIT_RETRIES})...`);
        setTimeout(() => this.initialize(), this.INIT_RETRY_DELAY);
      } else {
        this.initRetries = 0;
        console.error('최대 재시도 횟수를 초과했습니다. QR 스캐너 초기화 실패.');
        this.emit('initFailed', '스캐너 초기화에 실패했습니다. 관리자에게 문의해주세요.');
      }
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

  isInitialized() {
    return this.scanner !== null;
  }
}

module.exports = ScannerManager;
