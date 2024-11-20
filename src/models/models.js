// 영수증 정보 모델
export class ReceiptInfo {
  constructor(registrationNumber, representativeName, shopName, shopTel, shopAddress) {
    this.registrationNumber = registrationNumber;
    this.representativeName = representativeName;
    this.shopName = shopName;
    this.shopTel = shopTel;
    this.shopAddress = shopAddress;
  }
}

// 상품 모델
export class Product {
  constructor(idx, name, description, price, duration, targetMode, paymentRfOnly) {
    this.idx = idx;
    this.name = name;
    this.description = description;
    this.price = price;
    this.duration = duration;
    this.targetMode = targetMode;
    this.paymentRfOnly = paymentRfOnly;
  }
}

// 예약 모델
export class Reservation {
  constructor(idx, product) {
    this.idx = idx;
    this.product = product;
  }
}

// 결제 정보 모델
export class Payment {
  constructor(approvalNumber, cardNumber, cardCompanyNumber, type, amount) {
    this.approvalNumber = approvalNumber;
    this.cardNumber = cardNumber;
    this.cardCompanyNumber = cardCompanyNumber;
    this.type = type;
    this.amount = amount;
  }
}

// 예약 상태 변경 요청 모델
export class ReservationStatusUpdate {
  constructor(status, hipassIdx) {
    this.status = status;
    this.hipassIdx = hipassIdx;
  }
}

// 영수증 발급 요청 모델
export class ReceiptRequest {
  constructor(tel) {
    this.tel = tel;
  }
}
