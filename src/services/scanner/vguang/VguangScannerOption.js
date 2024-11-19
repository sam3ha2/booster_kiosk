class VguangScannerOption {
  constructor(options = {}) {
    Object.keys(VguangScannerOption.Fields).forEach(k => {
      const paramStruct = VguangScannerOption.Fields[k];
      if (paramStruct.required)
        if (options[k] === undefined)
          throw `VguangScannerOption.fields[${k}] 매개변수는 필수이며, 생략할 수 없습니다!`;
      if (options[k] !== undefined)
        paramStruct.check(options[k]);
      this[k] = options[k];
    });
  }
}
VguangScannerOption.Vid = 1317;
VguangScannerOption.Modes = {
  "tx200": {
    pid: 42156,
  },
  "tx400": {
    pid: 42156,
  }
};
VguangScannerOption.Fields = {
  /**
   * 모델
   */
  mode: {
    required: true,
    type: String,
    check(value) {
      if (!(value in VguangScannerOption.Modes))
        throw `mode는 VguangScannerOption.modes 내의 매개변수만 가능합니다!`;
    }
  },
};

export default VguangScannerOption;
