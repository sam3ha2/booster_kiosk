import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AppBar from '../components/AppBar';

const Admin = () => {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(process.env.NODE_ENV === 'development');
  const [pinCode, setPinCode] = useState('');
  const [deviceStates, setDeviceStates] = useState({
    carWash: { connected: false, path: '' },
    scanner: { connected: false },
    printer: { connected: false }
  });

  const handlePinInput = (digit) => {
    if (pinCode.length < 4) {
      setPinCode(prev => prev + digit);
    }
  };

  const handleBackspace = () => {
    setPinCode(prev => prev.slice(0, -1));
  };

  const handleClear = () => {
    setPinCode('');
  };

  const handleLogin = () => {
    if (pinCode === '3124') {
      setIsLoggedIn(true);
    } else {
      alert('비밀번호가 잘못되었습니다.');
      setPinCode('');
    }
  };

  useEffect(() => {
    if (pinCode.length === 4) {
      handleLogin();
    }
  }, [pinCode]);

  useEffect(() => {
    if (isLoggedIn) {
      loadDeviceStates();
    }
  }, [isLoggedIn]);

  const loadDeviceStates = async () => {
    try {
      const carWashStatus = await window.machineIPC.getMachineStatus();
      const scannerStatus = await window.scannerIPC.getStatus();
      const printerStatus = await window.printerIPC.getStatus();
      
      setDeviceStates(prev => ({
        carWash: {
          connected: carWashStatus.connected,
          path: carWashStatus.machineInfo?.port || '',
          status: carWashStatus.machineInfo?.status
        },
        scanner: {
          connected: scannerStatus.connected
        },
        printer: {
          connected: printerStatus.connected
        }
      }));
    } catch (error) {
      console.error('장치 상태 로드 중 오류:', error);
    }
  };

  const handleDeviceConnection = async (deviceType, action) => {
    try {
      let result;
      
      switch (deviceType) {
        case 'carWash':
          if (action === 'connect') {
            result = await window.machineIPC.connectMachine();
            if (!result.connected) {
              alert(result.message || '세차기 연결 실패');
            }
          } else {
            result = await window.machineIPC.disconnectMachine();
            if (result.connected) {
              alert(result.message || '세차기 연결 해제 실패');
            }
          }
          const status = result.status;
          setDeviceStates(prev => ({
            ...prev,
            carWash: {
              connected: status.connected,
              path: status.machineInfo?.port || '',
              machineInfo: status.machineInfo,
              lastStatusReceived: status.lastStatusReceived,
              status: status.machineInfo?.status
            }
          }));

          break;

        case 'scanner':
          if (action === 'connect') {
            result = await window.scannerIPC.connect();
          } else {
            result = await window.scannerIPC.disconnect();
          }
          setDeviceStates(prev => ({
            ...prev,
            scanner: { connected: result.connected }
          }));
          break;

        case 'printer':
          if (action === 'connect') {
            result = await window.printerIPC.connect();
          } else {
            result = await window.printerIPC.disconnect();
          }
          setDeviceStates(prev => ({
            ...prev,
            printer: { connected: result.connected }
          }));
          break;
      }
    } catch (error) {
      console.error(`${deviceType} ${action} 중 오류:`, error);
      let type;
      switch (deviceType) {
        case 'printer':
          type = '프린터';
          break;
        case 'scanner':
          type = '스캐너';
          break;
        case 'carWash':
          type = '세차기';
          break;
      }
      alert(`${type} ${action === 'connect' ? '연결' : '해제'} 중 오류가 발생했습니다.\n${error}`);
    }
  };

  useEffect(() => {
    if (isLoggedIn) {
      const statusUpdateListener = (data) => {
        setDeviceStates(prev => ({
          ...prev,
          carWash: {
            ...prev.carWash,
            status: data
          }
        }));
      };

      const scannerErrorListener = (error) => {
        setDeviceStates(prev => ({
          ...prev,
          scanner: {
            ...prev.scanner,
            status: 'error',
            error: error
          }
        }));
      };

      window.machineIPC.onStatusUpdate(statusUpdateListener);
      window.scannerIPC.onScannerError(scannerErrorListener);

      return () => {
        window.machineIPC.offStatusUpdate(statusUpdateListener);
        window.scannerIPC.offScannerError(scannerErrorListener);
      };
    }
  }, [isLoggedIn]);

  const MenuItem = ({ label, value, onClick, showArrow, actionButton, status }) => (
    <div 
      className="flex items-center justify-between py-4 px-6 border-b border-gray-700 hover:bg-gray-800 cursor-pointer"
      onClick={onClick}
    >
      <span className="text-white text-lg">{label}</span>
      <div className="flex items-center">
        {status && (
          <span className={`mr-4 text-sm ${
            status === 'error' ? 'text-red-500' : 
            status === 'ready' ? 'text-green-500' : 'text-gray-400'
          }`}>
            {status}
          </span>
        )}
        {value && <span className="text-gray-400 text-base mr-2">{value}</span>}
        {actionButton}
        {showArrow && (
          <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        )}
      </div>
    </div>
  );

  const AdminMenu = () => (
    <div className="w-full max-w-2xl bg-gray-900 rounded-lg overflow-hidden">
      <MenuItem 
        label="결제 관리" 
        onClick={() => navigate('/payment-admin')} 
        showArrow={true}
      />
      
      <MenuItem 
        label="세차기 관리" 
        value={deviceStates.carWash.connected ? deviceStates.carWash.path : '연결 안됨'}
        status={deviceStates.carWash.status?.currentStep}
        actionButton={
          <button 
            onClick={() => handleDeviceConnection('carWash', deviceStates.carWash.connected ? 'disconnect' : 'connect')}
            className={`px-3 py-1 rounded text-sm ${deviceStates.carWash.connected ? 'bg-red-600' : 'bg-main'}`}
          >
            {deviceStates.carWash.connected ? '해제' : '연결'}
          </button>
        }
      />

      <MenuItem 
        label="스캐너 관리" 
        value={deviceStates.scanner.connected ? '연결됨' : '연결 안됨'}
        status={deviceStates.scanner.status}
        actionButton={
          <button 
            onClick={() => handleDeviceConnection('scanner', deviceStates.scanner.connected ? 'disconnect' : 'connect')}
            className={`px-3 py-1 rounded text-sm ${deviceStates.scanner.connected ? 'bg-red-600' : 'bg-main'}`}
          >
            {deviceStates.scanner.connected ? '해제' : '연결'}
          </button>
        }
      />

      <MenuItem 
        label="프린터 관리" 
        value={deviceStates.printer.connected ? '연결됨' : '연결 안됨'}
        status={deviceStates.printer.status}
        actionButton={
          <button 
            onClick={() => handleDeviceConnection('printer', deviceStates.printer.connected ? 'disconnect' : 'connect')}
            className={`px-3 py-1 rounded text-sm ${deviceStates.printer.connected ? 'bg-red-600' : 'bg-main'}`}
          >
            {deviceStates.printer.connected ? '해제' : '연결'}
          </button>
        }
      />

      {
        deviceStates.printer.connected && (
          <MenuItem 
            label="테스트"
            actionButton={
              <button 
                onClick={() => window.printerIPC.printTest()}
                className="px-3 py-1 rounded text-sm bg-main"
              >
                출력
              </button>
            }
          />
        )
      }

      <MenuItem 
        label="컨트롤 패널" 
        value={`v${APP_VERSION}`}
      />

      <div className="flex items-center justify-between py-4 px-6 border-b border-gray-700">
        <div className="flex items-center justify-between w-full">
          <div className="flex gap-2">
            <button
              onClick={() => window.machineIPC.startWash('MODE1')}
              className="px-3 py-1 rounded text-sm bg-main hover:bg-green-700"
            >
              1번
            </button>
            <button
              onClick={() => window.machineIPC.startWash('MODE2')}
              className="px-3 py-1 rounded text-sm bg-main hover:bg-green-700"
            >
              2번
            </button>
            <button
              onClick={() => window.machineIPC.startWash('MODE3')}
              className="px-3 py-1 rounded text-sm bg-main hover:bg-green-700"
            >
              3번
            </button>
          </div>
          <div className="flex gap-2 ">
            <button
              onClick={() => window.machineIPC.stopWash()}
              className="px-3 py-1 rounded text-sm bg-red-600 hover:bg-red-700"
            >
              정지
            </button>
            <button
              onClick={() => window.machineIPC.reset()}
              className="px-3 py-1 rounded text-sm bg-blue-600 hover:bg-blue-700"
            >
              리셋
            </button>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end py-4 px-6 border-b border-gray-700 hover:bg-gray-800 cursor-pointer">
        <div className="flex gap-2">
          <button
            onClick={() => window.appControl.relaunch()}
            className="px-3 py-1 rounded text-sm bg-blue-600 hover:bg-blue-700"
          >
            앱 재시작
          </button>
          <button 
            onClick={() => window.appControl.quit()}
            className="px-3 py-1 rounded text-sm bg-red-600 hover:bg-red-700"
          >
            앱 종료
          </button>
        </div>
      </div>
    </div>
  );

  const Keypad = () => {
    const keys = [
      [1, 2, 3],
      [4, 5, 6],
      [7, 8, 9],
      ['clear', 0, 'back']
    ];

    return (
      <div className="w-full max-w-xs">
        <div className="mb-8 text-center">
          <div className="flex justify-center space-x-4">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="w-4 h-4 rounded-full border-2 border-white"
                style={{
                  backgroundColor: i < pinCode.length ? 'white' : 'transparent'
                }}
              />
            ))}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {keys.map((row, rowIndex) => 
            row.map((key, colIndex) => (
              <button
                key={`${rowIndex}-${colIndex}`}
                onClick={() => {
                  if (key === 'clear') handleClear();
                  else if (key === 'back') handleBackspace();
                  else handlePinInput(key);
                }}
                className={`
                  h-16 rounded-lg text-2xl font-bold
                  ${typeof key === 'number' 
                    ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                    : 'bg-gray-800 hover:bg-gray-700 text-gray-300'}
                  transition-colors duration-200
                  flex items-center justify-center
                `}
              >
                {key === 'back' ? (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414 6.414a2 2 0 001.414.586H19a2 2 0 002-2V7a2 2 0 00-2-2h-8.172a2 2 0 00-1.414.586L3 12z" />
                  </svg>
                ) : key === 'clear' ? (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : key}
              </button>
            ))
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-black min-h-screen flex flex-col">
      <AppBar 
        label="관리자 페이지"
        showBack={true}
      />

      <div className="flex-1 p-8 flex flex-col items-center justify-center">
        {!isLoggedIn ? (
          <Keypad />
        ) : (
          <AdminMenu />
        )}
      </div>
    </div>
  );
};

export default Admin;
