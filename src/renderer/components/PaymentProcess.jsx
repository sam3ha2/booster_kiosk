import imgPaymentProcess from '../../assets/images/img_qr_certification.png';
import icDoubleDirectionDown from '../../assets/images/ic_double_direction_down.png';

export const PaymentProcess = () => (
  <div className='container'>
    <div className='text-center text-white text-3xl font-medium'>
      모니터 오른쪽 하단에<br />카드를 삽입 또는 터치해주세요.
    </div>

    <div className='flex mt-16'>
      <div className='flex-1' />
      <div className='flex-1'>
        <div className='flex flex-none'>
          <img src={imgPaymentProcess} alt='결제요청' className='w-[100%] h-auto object-contain' />
        </div>
        <div className='flex flex-none justify-center'>
          <img src={icDoubleDirectionDown} alt='화살표' className='w-[30%] h-auto mt-4' />
        </div>
      </div>
    </div>
  </div>
);
