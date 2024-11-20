const Utils = {
  getVatAmount(amount) {
    return Math.floor((amount / 110) * 10);
  },
};

Date.prototype.format = function ({ locale = 'ko-KR', pattern = 'yyyy-MM-dd HH:mm:ss' }) {
  // 기본적으로 로케일에 맞춰 날짜 요소를 생성
  const options = {
    yyyy: this.getFullYear(),
    MM: String(this.getMonth() + 1).padStart(2, '0'),
    dd: String(this.getDate()).padStart(2, '0'),
    HH: String(this.getHours()).padStart(2, '0'),
    mm: String(this.getMinutes()).padStart(2, '0'),
    ss: String(this.getSeconds()).padStart(2, '0'),
  };

  // 패턴을 적용하여 날짜 형식 지정
  return pattern.replace(/yyyy|MM|dd|HH|mm|ss/g, (match) => options[match]);
};

export default Utils;
