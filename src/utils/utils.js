const Utils = {
  getVatAmount(amount) {
    return Math.floor(amount / 110 * 10);
  }
}

export default Utils;