import amqp from 'amqplib';

class RabbitMQService {
  constructor() {
    this.connection = null;
    this.channel = null;
  }

  async connect() {
    // RabbitMQ 연결 설정
  }

  async publish_status(status) {
    // 상태 메시지 발행
  }

  async subscribe_to_commands(callback) {
    // 명령 메시지 구독
  }
}

export default RabbitMQService;
