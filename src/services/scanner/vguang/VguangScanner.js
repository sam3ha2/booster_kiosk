import events from 'events';
import * as HID from 'node-hid';
import VguangScannerOption from './VguangScannerOption.js';
import { platform } from 'os';

const { EventEmitter } = events;

class VguangScanner extends EventEmitter {
  constructor(options) {
    super();
    this.options = new VguangScannerOption(options);
    this._device = null;
    this._findDevice();
    this._listen();
    // 스캐너 내장 스캔 후 비프음, 표시등 피드백 비활성화
    // this._write([0x24, '00000001']);
    this._write([0x25, 1]);
    process.on('exit', () => {
      this._write([0x24, '00000000']);
      this._device.close();
    });
  }

  _error (err) {
    this._device && this._device.close();
    const errorEventName = VguangScanner.Events['ERROR'];
    if (this.listenerCount(errorEventName) > 0) {
      this.emit(errorEventName, err);
    } else {
      throw `[${this.__proto__.constructor.name}] 오류: ${err}`;
    }
  }

  /**
   * 스캐너 초기화
   */
  _findDevice () {
    const 
      { pid } = VguangScannerOption.Modes[this.options.mode],
      vid = VguangScannerOption.Vid;
            
    if (['linux', 'win32'].includes(platform)) {
      const { path } = HID.devices().filter(item => item.vendorId === vid && item.productId === pid).pop();
      try {
        this._device = new HID.HID(path);
      } catch(err) {
        this._error(err);
      }
    } 
    else {
      try {
        this._device = new HID.HID(vid, pid);
      } catch(err) {
        this._error(err);
      }
    }
    this._device.on('error', this._error.bind(this));
  }

  /**
   * 스캐너 리스닝 시작
   */
  _listen () {
    this._device.on('data', chunk => {
      const data = this._parseBytes(chunk).replace('\x00', '');
      if (data) this.emit(VguangScanner.Events['DATA'], data);
    });
  }   

  /**
   * 스캐너로 보낼 데이터 패킷 구성
   * 
   * @param  {Array<Number>} bins
   * @return {Array}
   */
  _buildBytes (bins = []) {
    const 
    bytes = [0x00], 
    data = [];
    // 먼저 명령어 추출
    if (bins[0]) bytes.push(bins.shift());
    bins.forEach(item =>{
      if (typeof item === 'number') data.push(item);
      if (typeof item === 'string') data.push(parseInt(item, 2));
    });
    bytes.push(data.length & 0xff, data.length >> 8 & 0xff);
    bytes.splice(1, 0, 0x55, 0xaa);
    bytes.push(...data);
    bytes.push(getXor(bytes));
    return bytes;
    function getXor (bytes = []) {
      let tmp = 0;
      bytes.forEach(bin => tmp ^= bin);
      return tmp;
    }
  }

  /**
   * 스캐너에서 반환된 패킷 데이터 파싱
   * 
   * @param  {Buffer} buf
   * @return {String}
   */
  _parseBytes (buf) {
    const isSuccess = buf.readInt8(3) === 0;
    if (isSuccess) {
      const len = buf.readUInt16LE(4);
      const d = buf.slice(5, 5 + len + 1);
      return d.toString();
    } else {
      return;
    }
  }

  /**
   * 데이터 쓰기, 명령어와 데이터만 전달하면 됨
   * 
   * @param {Array<Number>} bins
   */
  _write (bins = []) {
    const dataBins = this._buildBytes(bins);
    this._device.write(dataBins);
  }

  /**
   * 비프음
   * 
   * @param {Number} num  (선택) 비프음 횟수
   * @param {Number} time (선택) 각 비프음 지속 시간, ms
   * @param {Number} interval (선택) 비프음 간격, ms
   */
  beep (num = 1, time = 200, interval = 50) {
    this._write([0x04, '00001000', 0xff & num, time / 50, interval / 50, 0]);
  }

  /**
   * 빨간 불 깜빡임, 실제로는 빨간색 배경 조명
   * 
   * @param {Number} num
   * @param {Number} time 
   * @param {Number} interval
   */
  blinkRed (num = 1, time = 200, interval = 50) {
    this._write([0x04, '00000010', 0xff & num, time / 50, interval / 50, 0]);
  }

  /**
   * 녹색 불 깜빡임, 실제로는 패널의 표시등(전원 표시등 옆)
   * 
   * @param {Number} num
   * @param {Number} time 
   * @param {Number} interval
   */
  blinkGreen (num = 1, time = 200, interval = 50) {
    this._write([0x04, '00000100', 0xff & num, time / 50, interval / 50, 0]);
  }

  /**
   * 흰색 배경 조명 켜기/끄기
   * 
   * @param {Boolean} is
   */
  toggleLight (is = true) {
    this._write([0x24, '00000000' + (is ? 1 : 0)]);
  }
}
VguangScanner.Events = {
  'DATA': 'data',
  'ERROR': 'error'
};

VguangScanner.VguangScannerOption = VguangScannerOption;

export default VguangScanner;
