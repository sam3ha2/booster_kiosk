import React, { useState, useEffect } from 'react';
import AppBar from '../components/AppBar';
import { STORAGE_KEYS, HEADQUARTERS } from '../../constants/constants';
import ApiService from '../../utils/api_service';

const PaymentAdmin = () => {
  const [selectedDate, setSelectedDate] = useState(() => {
    return new Date().toLocaleString("ko-KR", {
      timeZone: "Asia/Seoul",
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).split('. ').map(part => part.replace('.', '')).join('-');
  });
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showPaymentCancelModal, setShowPaymentCancelModal] = useState(false);
  const [showReceiptPrintModal, setShowReceiptPrintModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);

  useEffect(() => {
    if (selectedDate) {
      loadPayments(selectedDate);
    }
  }, [selectedDate]);

  const loadPayments = async (date) => {
    try {
      setLoading(true);
      const data = await window.databaseIPC.getPaymentsByDate(date);
      setPayments(data.orders);
    } catch (error) {
      console.error('결제 데이터 로딩 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!selectedPayment) return;
    
    try {
      setLoading(true);
      console.log('결제 취소 요청:', selectedPayment);

      const isSimulated = selectedPayment.auth_no.startsWith('SIM');

      let result;
      if (isSimulated) {
        result = {
          isSuccess: true,
          outReplyMsg1: '결제 취소 완료'
        }
      } else {
        result = await window.paymentIPC.processCancel(selectedPayment);
      }
      
      if (result.isSuccess) {
        const cancelResponse = await ApiService.updateReservationStatus(
          selectedPayment.reservation_idx,
          {
            status: 'CANCEL',
          }
        );
        const needUpdateServer = cancelResponse.type !== 'SUCCESS' ? { is_dirty_server: true } : {};

        await window.databaseIPC.updatePaymentCancel(selectedPayment.id, selectedDate, {
          outReplyMsg1: result.outReplyMsg1 || '결제 취소 완료',
          ...needUpdateServer,
        });
        if (!isSimulated) {
          await window.printerIPC.printReceipt({
            shop: JSON.parse(localStorage.getItem(STORAGE_KEYS.RECEIPT_INFO)),
            info: selectedPayment,
            headquarters: HEADQUARTERS,
            isCancel: true
          });
        }
        alert('결제가 취소되었습니다.');
        loadPayments(selectedDate);
      } else {
        throw new Error(result.outReplyMsg1 || '결제 취소 실패');
      }
    } catch (error) {
      console.error('결제 취소 실패:', error);
      alert(`결제 취소 실패: ${error.message}`);
    } finally {
      setLoading(false);
      setShowPaymentCancelModal(false);
      setSelectedPayment(null);
    }
  };

  const handlePrintReceipt = async () => {
    if (!selectedPayment) return;
    
    try {
      setLoading(true);
      console.log('영수증 출력 요청:', selectedPayment);

      await window.printerIPC.printReceipt({
        shop: JSON.parse(localStorage.getItem(STORAGE_KEYS.RECEIPT_INFO)),
        info: selectedPayment,
        headquarters: HEADQUARTERS,
        isCancel: selectedPayment.status === 'CANCELED'
      });
    } catch (error) {
      console.error('영수증 출력 실패:', error);
      alert(`영수증 출력 실패: ${error.message}`);
    } finally {
      setLoading(false);
      setShowReceiptPrintModal(false);
      setSelectedPayment(null);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      'APPROVED': 'text-green-500',
      'CANCELED': 'text-red-500',
      'PENDING': 'text-yellow-500',
      'FAILED': 'text-red-500'
    };
    return colors[status] || 'text-gray-500';
  };

  const getStatusText = (status) => {
    const texts = {
      'APPROVED': '승인',
      'CANCELED': '취소',
      'PENDING': '대기',
      'FAILED': '실패'
    };
    return texts[status] || status;
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <AppBar 
        label="결제 내역"
        showBack={true}
      />
      <div className="p-6">

        <div className="mb-6">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-gray-800 text-white border border-gray-700 rounded px-3 py-2 text-sm [color-scheme:dark]"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full bg-gray-800 rounded-lg">
            <thead>
              <tr className="bg-gray-700">
                <th className="px-2 py-2 text-center text-sm">결제 시간</th>
                <th className="px-2 py-2 text-center text-sm">카드번호</th>
                <th className="px-2 py-2 text-center text-sm">결제금액</th>
                <th className="px-2 py-2 text-center text-sm">상태</th>
                <th className="px-2 py-2 text-center text-sm">결제</th>
                <th className="px-2 py-2 text-center text-sm">영수증</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <tr key={payment.id} className="border-b border-gray-700 hover:bg-gray-700">
                  <td className="px-2 py-2 text-center text-sm">
                    {payment.trade_req_time ? 
                      payment.trade_req_time.replace(/(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/, '$1-$2-$3 $4:$5:$6') 
                      : new Date(payment.created_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
                  </td>
                  <td className="px-2 py-2 text-center text-sm">{payment.card_no ? `${payment.card_no}${'*'.repeat(14 - payment.card_no.length)}` : ''}</td>
                  <td className="px-2 py-2 text-center text-sm">{parseInt(payment.tran_amt).toLocaleString()}원</td>
                  <td className={`px-2 py-2 text-center text-sm ${getStatusColor(payment.status)}`}>{getStatusText(payment.status)}</td>
                  <td className="px-2 py-2 text-center text-sm">
                    {payment.status === 'APPROVED' && (
                      <button
                        onClick={() => {
                          setSelectedPayment(payment);
                          setShowPaymentCancelModal(true);
                        }}
                        disabled={loading}
                        className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 disabled:bg-gray-600"
                      >
                        취소
                      </button>
                    )}
                  </td>
                  <td className="px-2 py-2 text-center text-sm">
                    {(payment.status === 'APPROVED' || payment.status === 'CANCELED') && (
                      <button
                        onClick={() => {
                          setSelectedPayment(payment);
                          setShowReceiptPrintModal(true);
                        }}
                        disabled={loading}
                        className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 disabled:bg-gray-600"
                      >
                        출력
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {payments.length === 0 && (
                <tr>
                  <td colSpan="7" className="px-4 py-2 text-center text-sm">결제 내역이 없습니다.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 결제 취소 확인 모달 */}
        {showPaymentCancelModal && selectedPayment && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="bg-gray-800 p-6 rounded-lg max-w-md">
              <h3 className="text-lg font-bold mb-4 text-sm">결제 취소 확인</h3>
              <p className="mb-2 text-sm">다음 결제를 취소하시겠습니까?</p>
              <p className="mb-2 text-sm">금액: {parseInt(selectedPayment.tran_amt).toLocaleString()}원</p>
              <p className="mb-4 text-sm">카드번호: {selectedPayment.card_no}********</p>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    setShowPaymentCancelModal(false);
                    setSelectedPayment(null);
                  }}
                  className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-500 text-sm"
                >
                  아니요
                </button>
                <button
                  onClick={handleCancel}
                  disabled={loading}
                  className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 disabled:bg-gray-600 text-sm"
                >
                  예
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 영수증 출력 확인 모달 */}
        {showReceiptPrintModal && selectedPayment && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="bg-gray-800 p-6 rounded-lg max-w-md">
              <h3 className="text-lg font-bold mb-4 text-sm">영수증 출력 확인</h3>
              <p className="mb-2 text-sm">결제 영수증을 출력하시겠습니까?</p>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    setShowReceiptPrintModal(false);
                    setSelectedPayment(null);
                  }}
                  className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-500 text-sm"
                >
                  아니요
                </button>
                <button
                  onClick={handlePrintReceipt}
                  disabled={loading}
                  className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 disabled:bg-gray-600 text-sm"
                >
                  예
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 로딩 오버레이 */}
        {loading && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="text-white text-sm">처리중...</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentAdmin;