import React, { useState, useEffect } from 'react';
import { MenuItem } from "./MenuItem";

const DeviceMenuItem = ({ deviceType, label, connected, path, status, onConnect, onDisconnect }) => {
  const handleConnection = () => {
    if (connected) {
      onDisconnect(deviceType);
    } else {
      onConnect(deviceType);
    }
  };

  return (
    <MenuItem
      label={label}
      value={connected ? (path || '연결됨') : '연결 안됨'}
      status={status}
      actionButton={<button
        onClick={handleConnection}
        className={`px-3 py-1 rounded text-sm ${connected ? 'bg-red-600' : 'bg-main'}`}
      >
        {connected ? '해제' : '연결'}
      </button>} />
  );
};

export const DeviceStatus = () => {
  const [deviceStates, setDeviceStates] = useState({
    carWash: { connected: false, path: '', status: null },
    scanner: { connected: false, status: null },
    printer: { connected: false, status: null }
  });

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

      // 상태 업데이트를 하나로 모으기
      const updateDeviceState = (newState) => {
        setDeviceStates(prev => ({
          ...prev,
          [deviceType]: newState
        }));
      };

      switch (deviceType) {
        case 'carWash':
          result = await window.machineIPC[`${action}Machine`]();
          if (!result.success) {
            alert(result.message || `세차기 ${action === 'connect' ? '연결' : '해제'} 실패`);
          }
          const status = result.status;
          updateDeviceState({
            connected: status.connected,
            path: status.machineInfo?.port || '',
            machineInfo: status.machineInfo,
            lastStatusReceived: status.lastStatusReceived,
            status: status.machineInfo?.status
          });
          break;

        case 'scanner':
        case 'printer':
          result = await window[`${deviceType}IPC`][action]();
          updateDeviceState({ connected: result.connected });
          break;
      }
    } catch (error) {
      console.error(`${deviceType} ${action} 중 오류:`, error);
      const deviceNames = {
        printer: '프린터',
        scanner: '스캐너',
        carWash: '세차기'
      };
      alert(`${deviceNames[deviceType]} ${action === 'connect' ? '연결' : '해제'} 중 오류가 발생했습니다.\n${error}`);
    }
  };

  useEffect(() => {
    loadDeviceStates();

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
  }, []);

  const handleConnect = (deviceType) => handleDeviceConnection(deviceType, 'connect');
  const handleDisconnect = (deviceType) => handleDeviceConnection(deviceType, 'disconnect');

  return (
    <>
      <DeviceMenuItem
        deviceType="carWash"
        label="세차기 관리"
        connected={deviceStates.carWash.connected}
        path={deviceStates.carWash.path}
        status={deviceStates.carWash.status?.currentStep}
        onConnect={handleConnect}
        onDisconnect={handleDisconnect}
      />
      <DeviceMenuItem
        deviceType="scanner"
        label="스캐너 관리"
        connected={deviceStates.scanner.connected}
        status={deviceStates.scanner.status}
        onConnect={handleConnect}
        onDisconnect={handleDisconnect}
      />
      <DeviceMenuItem
        deviceType="printer"
        label="프린터 관리"
        connected={deviceStates.printer.connected}
        status={deviceStates.printer.status}
        onConnect={handleConnect}
        onDisconnect={handleDisconnect}
      />
      {deviceStates.printer.connected && (
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
      )}
    </>
  );
};
