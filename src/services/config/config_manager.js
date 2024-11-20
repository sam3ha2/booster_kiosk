import EventEmitter from 'events';
import lodash from 'lodash';
import { readFile } from 'node:fs';
import URLSafeBase64 from 'urlsafe-base64';

const { cloneDeep } = lodash;

class ConfigManager extends EventEmitter {
  constructor() {
    super();
    this.config = null;
  }

  decodeIdx(b64encoded) {
    return URLSafeBase64.decode(`${b64encoded}==`)
      .reduce((output, elem) => output + ('0' + elem.toString(16)).slice(-2), '')
      .toUpperCase();
  }

  decodeToken(token) {
    let base64Url = token.split('.')[1];
    let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    let payload = JSON.parse(
      decodeURIComponent(
        atob(base64)
          .split('')
          .map(function (c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
          })
          .join(''),
      ),
    );

    Object.keys(payload).forEach((key) => {
      if (key === 'idx') {
        payload[key] = this.decodeIdx(payload[key]);
      }
    });

    return payload;
  }

  parseHexString(str, minLength) {
    let result = [];
    if (str.length % 2 === 1) {
      str = `0${str}`;
    }
    while (str.length >= 2) {
      result.push(parseInt(str.substring(0, 2), 16));
      str = str.substring(2, str.length);
    }
    if (result.length < minLength) {
      for (; result.length < minLength; ) {
        result.unshift(0x00);
      }
    }
    return result;
  }

  setConfigurations(conf) {
    this.configurations = cloneDeep(conf);
    let tokenInfo = this.decodeToken(this.configurations['token']);
    conf['shopIdx'] = this.shopIdx = tokenInfo['idx'];

    const keys = Object.keys(conf);
    if (!['token', 'shopIdx'].every((k) => keys.includes(k))) {
      return {
        success: false,
        errorMessage: '초기화에 실패 (토큰없음)',
        configuration: null,
      };
    }
    return {
      success: true,
      errorMessage: null,
      configuration: conf,
    };
  }

  async loadConfiguration() {
    const NODE_ENV = process.env.NODE_ENV || 'production';
    const isDevelopment = NODE_ENV !== 'production';
    // console.log(`${isDevelopment ? process.cwd() : 'C:\\kiosk'}/config.json`, NODE_ENV);
    return new Promise((resolve, reject) => {
      readFile(
        `${isDevelopment ? process.cwd() : 'C:\\kiosk'}/config.json`,
        'utf-8',
        (err, content) => {
          try {
            let configurations = JSON.parse(content);
            // console.log(configurations);
            resolve(configurations);
          } catch (error) {
            // console.log(error);
            reject('초기화에 실패했습니다.');
          }
        },
      );
    })
      .then((conf) => {
        // configuration 세팅
        // console.log(conf);
        return this.setConfigurations(conf);
      })
      .catch((err) => {
        return {
          success: false,
          errorMessage: err.message,
          configuration: null,
        };
      });
  }
}

export default ConfigManager;
