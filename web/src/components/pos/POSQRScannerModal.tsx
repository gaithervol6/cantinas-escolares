import React, { useState, useEffect, useRef } from 'react';
import { X, Camera, QrCode } from 'lucide-react';
import { cardsApi } from '../../services/api';
import { showToast } from '../common/Toast';

interface POSQRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStudentFound: (student: {
    studentId: string;
    name: string;
    enrollmentNumber: string;
    balance: number;
    photoUrl?: string;
  }) => void;
}

function playScanBeep() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.18);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.18);
  } catch (_) {}
}

export const POSQRScannerModal: React.FC<POSQRScannerModalProps> = ({
  isOpen,
  onClose,
  onStudentFound,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [lastCode, setLastCode] = useState<string | null>(null);
  const animFrameRef = useRef<number>(0);

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      return;
    }
    startCamera();
    return () => stopCamera();
  }, [isOpen]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraActive(true);
        setScanning(true);
        startScanLoop();
      }
    } catch (err) {
      console.error('Camera error:', err);
      showToast('Não foi possível acessar a câmera', 'error');
    }
  };

  const stopCamera = () => {
    setScanning(false);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(t => t.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  const startScanLoop = () => {
    let detector: any = null;
    if ('BarcodeDetector' in window) {
      try {
        detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
      } catch (_) {}
    }

    const scan = async () => {
      if (!scanning || !videoRef.current || videoRef.current.readyState < 2) {
        animFrameRef.current = requestAnimationFrame(scan);
        return;
      }

      if (detector) {
        try {
          const barcodes = await detector.detect(videoRef.current);
          if (barcodes && barcodes.length > 0) {
            const rawValue = barcodes[0].rawValue;
            if (rawValue && rawValue !== lastCode) {
              setLastCode(rawValue);
              setTimeout(() => setLastCode(null), 2000);
              handleCodeDetected(rawValue);
            }
          }
        } catch (_) {}
      }

      animFrameRef.current = requestAnimationFrame(scan);
    };

    animFrameRef.current = requestAnimationFrame(scan);
  };

  const handleCodeDetected = async (code: string) => {
    playScanBeep();
    showToast(`QR Code detectado: ${code}`, 'info');

    try {
      const { data } = await cardsApi.getStudentByCard(code);
      const student = data?.data;
      if (student) {
        playScanBeep();
        onStudentFound({
          studentId: student.student_id,
          name: student.name,
          enrollmentNumber: student.enrollment_number,
          balance: Number(student.balance),
          photoUrl: student.photo_url,
        });
        showToast(`Aluno identificado: ${student.name}`, 'success');
        onClose();
      }
    } catch (err) {
      showToast('QR Code não reconhecido ou aluno não encontrado', 'error');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay animate-fadeIn" style={{ zIndex: 1200 }}>
      <div
        className="modal-content"
        style={{
          maxWidth: '480px',
          width: '95%',
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          borderRadius: '16px',
          padding: 0,
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '1rem 1.25rem',
            background: 'var(--bg-card, #ffffff)',
            borderBottom: '1px solid var(--border-color, #e2e8f0)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <QrCode size={20} color="#2563eb" />
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>Escanear QR Code</h3>
          </div>
          <button type="button" className="btn btn-ghost" onClick={onClose} style={{ padding: '0.4rem' }}>
            <X size={20} />
          </button>
        </div>

        {/* Camera View */}
        <div style={{ flex: 1, padding: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <div
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: '400px',
              background: '#0f172a',
              borderRadius: '12px',
              overflow: 'hidden',
              aspectRatio: '4/3',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid #2563eb',
            }}
          >
            <video
              ref={videoRef}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              muted
              playsInline
            />

            {/* Scanner reticle */}
            <div
              style={{
                position: 'absolute',
                width: '70%',
                height: '70%',
                border: '2px solid rgba(37, 99, 235, 0.8)',
                borderRadius: '12px',
                pointerEvents: 'none',
              }}
            />

            {!cameraActive && (
              <div
                style={{
                  position: 'absolute',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '8px',
                  color: '#94a3b8',
                }}
              >
                <Camera size={40} />
                <span style={{ fontSize: '0.85rem' }}>Iniciando câmera...</span>
              </div>
            )}
          </div>

          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', margin: 0 }}>
            Aponte a câmera para o QR Code do cartão do aluno
          </p>
        </div>
      </div>
    </div>
  );
};
