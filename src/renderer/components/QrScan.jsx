import imgQrCertification from '../../assets/images/img_qr_certification.png';
import icDoubleDirectionDown from '../../assets/images/ic_double_direction_down.png';

export const QrScan = () => (
  <div className='container'>
    {/* 텍스트 중앙 정렬 */}
    <div className='text-center text-white text-3xl font-medium'>
      APP에서 QR을 확인해서<br/>모니터 왼쪽 하단에 화면을 보여주세요.
    </div>

    <div className='flex mt-16'>
      {/* QR 그룹 (QR 코드 + 스캔 효과 + 화살표) - 왼쪽 정렬 */}
      <div className='flex-1'>
        <div className='flex flex-none'>
          {/* QR 이미지 및 스캔 효과 */}
          <img src={imgQrCertification} alt='QR인증' className='w-[100%] h-auto object-contain' />
        </div>
        <div className='flex flex-none justify-center'>
          {/* 화살표 이미지 */}
          <img src={icDoubleDirectionDown} alt='화살표' className='w-[30%] h-auto mt-4' />
        </div>
      </div>
      <div className='flex-1' />
    </div>
  </div>
);
