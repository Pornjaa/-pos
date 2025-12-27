
import React, { useRef, useState, useCallback } from 'react';
import { RefreshCw, X, Check, Scan } from 'lucide-react';

interface CameraUploaderProps {
  onCapture: (base64: string) => void;
  onCancel: () => void;
}

const CameraUploader: React.FC<CameraUploaderProps> = ({ onCapture, onCancel }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const startCamera = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment', width: { ideal: 1280 } },
        audio: false 
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      alert("ไม่สามารถเข้าถึงกล้องได้จ้ะยาย");
    }
  }, []);

  React.useEffect(() => {
    startCamera();
    return () => {
      stream?.getTracks().forEach(track => track.stop());
    };
  }, [startCamera]);

  const capture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        setCapturedImage(dataUrl);
        stream?.getTracks().forEach(track => track.stop());
      }
    }
  };

  const reset = () => {
    setCapturedImage(null);
    startCamera();
  };

  const confirm = () => {
    if (capturedImage) {
      onCapture(capturedImage.split(',')[1]);
    }
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      <div className="flex justify-between items-center p-6 text-white bg-gradient-to-b from-black/60 to-transparent absolute top-0 left-0 right-0 z-30">
        <button onClick={onCancel} className="p-3 bg-white/10 rounded-full"><X /></button>
        <span className="font-black text-xl uppercase tracking-widest">สแกนบิลสินค้า</span>
        <div className="w-12"></div>
      </div>

      <div className="flex-1 relative bg-gray-900 flex items-center justify-center overflow-hidden">
        {!capturedImage ? (
          <>
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              className="absolute inset-0 w-full h-full object-cover"
            />
            {/* กรอบเล็งบิล */}
            <div className="absolute inset-0 flex items-center justify-center p-12 pointer-events-none">
              <div className="w-full aspect-[3/4] border-4 border-dashed border-white/50 rounded-3xl relative">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-blue-600 text-white px-4 py-1 rounded-full text-[10px] font-black uppercase">เล็งบิลตรงนี้จ้ะ</div>
                <div className="absolute inset-0 bg-blue-500/5"></div>
              </div>
            </div>

            {/* Shutter Button - Absolute positioned */}
            <div className="absolute bottom-12 left-0 right-0 flex justify-center z-40">
              <button 
                onClick={capture}
                className="w-24 h-24 bg-white rounded-full flex items-center justify-center border-[10px] border-white/20 shadow-[0_0_30px_rgba(255,255,255,0.3)] active:scale-90 transition-transform"
              >
                <Scan className="w-12 h-12 text-blue-600" />
              </button>
            </div>
          </>
        ) : (
          <div className="relative w-full h-full flex items-center justify-center">
            <img src={capturedImage} className="w-full h-full object-contain" alt="Captured" />
            
            {/* Result Controls - Absolute positioned */}
            <div className="absolute bottom-12 left-0 right-0 flex justify-center items-center gap-10 z-40">
              <button 
                onClick={reset}
                className="w-20 h-20 bg-gray-800/80 backdrop-blur-md rounded-full flex items-center justify-center text-white border-2 border-white/20 shadow-xl active:scale-90 transition-transform"
              >
                <RefreshCw size={32} />
              </button>
              <button 
                onClick={confirm}
                className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center text-white shadow-[0_0_30px_rgba(34,197,94,0.3)] active:scale-90 transition-transform"
              >
                <Check className="w-14 h-14" strokeWidth={4} />
              </button>
            </div>
          </div>
        )}
        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
};

export default CameraUploader;
