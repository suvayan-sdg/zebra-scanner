import { useEffect, useRef, useState, useCallback } from "react";
import { QRCodeCanvas } from "qrcode.react";
import Webcam from "react-webcam";
import jsQR from "jsqr";
import { motion } from "framer-motion";

// Define scanner types for a clear switch
const SCANNER_TYPES = {
  WEBCAM: "webcam",
  KEYBOARD: "keyboard",
};

export default function Scanner() {
  const [text, setText] = useState("");
  const [scannedData, setScannedData] = useState("");
  const [scanStartTime, setScanStartTime] = useState(null);
  const [scanTime, setScanTime] = useState(null);

  const [devices, setDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [scannerType, setScannerType] = useState(SCANNER_TYPES.WEBCAM);

  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const inputRef = useRef(null);

  // ✅ Enumerate cameras for webcam mode
  const enumerateDevices = async () => {
    try {
      const all = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = all.filter((d) => d.kind === "videoinput");
      setDevices(videoInputs);
      if (!selectedDeviceId && videoInputs.length) {
        setSelectedDeviceId(videoInputs[0].deviceId);
      }
    } catch (err) {
      console.error("Device enumeration failed:", err);
    }
  };

  useEffect(() => {
    if (scannerType === SCANNER_TYPES.WEBCAM) {
      enumerateDevices();
      navigator.mediaDevices.addEventListener("devicechange", enumerateDevices);
      return () =>
        navigator.mediaDevices.removeEventListener("devicechange", enumerateDevices);
    }
  }, [scannerType, selectedDeviceId]);

  // ✅ Scan QR code from video frames (Webcam logic)
  const captureFrame = useCallback(() => {
    if (!webcamRef.current || !canvasRef.current) return;

    const video = webcamRef.current.video;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    if (!video || video.readyState !== 4) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const qrCode = jsQR(imageData.data, canvas.width, canvas.height);

    if (qrCode?.data) {
      setScannedData(qrCode.data);
      setScanning(false);
      if (scanStartTime) {
        setScanTime(((Date.now() - scanStartTime) / 1000).toFixed(2));
      }
    }
  }, [scanStartTime]);

  useEffect(() => {
    let interval;
    if (scanning && scannerType === SCANNER_TYPES.WEBCAM) {
      interval = setInterval(captureFrame, 300);
    }
    return () => clearInterval(interval);
  }, [scanning, captureFrame, scannerType]);

  // ✅ Handle keyboard input (Zebra scanner logic)
  useEffect(() => {
    if (scannerType === SCANNER_TYPES.KEYBOARD) {
      let buffer = '';
      const handleKeyDown = (event) => {
        // Only trigger the scanner listener when the input field is not focused
        if (document.activeElement === inputRef.current || event.key.length !== 1) {
            return;
        }

        // If a scan is not in progress, start one on the first keypress
        if (!scanning && event.key !== 'Enter') {
          setScannedData("");
          setScanTime(null);
          setScanning(true);
          setScanStartTime(Date.now());
        }

        // Add character to buffer
        if (event.key.length === 1) {
          buffer += event.key;
        }

        // Check for scan completion
        if (event.key === 'Enter') {
          setScannedData(buffer);
          setScanTime(((Date.now() - scanStartTime) / 1000).toFixed(2));
          setScanning(false);
          buffer = '';
        }
      };

      window.addEventListener('keydown', handleKeyDown);

      return () => {
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [scannerType, scanning, scanStartTime]);

  const startWebcamScanning = () => {
    setScannedData("");
    setScanTime(null);
    setScanStartTime(Date.now());
    setScanning(true);
  };

  const cancelScanning = () => {
    setScanning(false);
    setScanStartTime(null);
    setScanTime(null);
  };

  const isMatch = text && scannedData && text === scannedData;

  const appVersion = "1.0.4";
  const fixedDate = "September 19, 2025";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-300 via-amber-200 to-rose-300 p-4 md:p-6">
      <motion.div
        className="bg-white/80 backdrop-blur-md shadow-2xl rounded-2xl p-6 md:p-8 w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 gap-8"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
      >
        <p className="md:col-span-2 text-center text-xs text-gray-400">
          version {appVersion} | Date: {fixedDate}
        </p>

        {/* LEFT: QR Generator */}
        <div className="flex flex-col items-center space-y-6">
          <h1 className="text-2xl md:text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-orange-600 to-rose-600">
            Generate QR
          </h1>
          <input
            ref={inputRef} // Used to check if the main input is focused
            type="text"
            placeholder="Enter text to generate QR"
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full px-4 py-3 border-2 border-amber-300 rounded-xl focus:ring-4 focus:ring-orange-300 outline-none transition hover:shadow-md text-gray-700"
          />
          {text && (
            <motion.div
              className="flex justify-center bg-gradient-to-br from-orange-100 to-rose-100 p-6 rounded-xl shadow-lg hover:shadow-2xl transition"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
            >
              <QRCodeCanvas value={text} size={220} />
            </motion.div>
          )}
        </div>

        {/* RIGHT: Scanner + Device Picker */}
        <div className="flex flex-col items-center space-y-4 w-full">
          <h1 className="text-2xl md:text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-rose-600 to-orange-600">
            Scan QR
          </h1>
          <div className="flex w-full gap-3">
            <select
              value={scannerType}
              onChange={(e) => {
                setScanning(false);
                setScannerType(e.target.value);
              }}
              className="flex-1 px-4 py-2 rounded-xl border-2 border-amber-300 bg-white text-gray-700 shadow-sm hover:shadow-md focus:ring-2 focus:ring-orange-400 outline-none"
            >
              <option value={SCANNER_TYPES.KEYBOARD}>Keyboard Scanner</option>
              <option value={SCANNER_TYPES.WEBCAM}>Webcam</option>
            </select>
            {scannerType === SCANNER_TYPES.WEBCAM && (
              <select
                value={selectedDeviceId || ""}
                onChange={(e) => setSelectedDeviceId(e.target.value)}
                className="flex-1 px-4 py-2 rounded-xl border-2 border-amber-300 bg-white text-gray-700 shadow-sm hover:shadow-md focus:ring-2 focus:ring-orange-400 outline-none"
                disabled={scanning}
              >
                {devices.length === 0 ? (
                  <option value="">No cameras detected</option>
                ) : (
                  devices.map((d, i) => (
                    <option key={d.deviceId || i} value={d.deviceId}>
                      {d.label || `Camera ${i + 1}`}
                    </option>
                  ))
                )}
              </select>
            )}
          </div>

          {scannerType === SCANNER_TYPES.WEBCAM ? (
            !scanning ? (
              <button
                onClick={startWebcamScanning}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-rose-500 text-white font-semibold shadow-lg hover:scale-105 transform transition"
              >
                Start Scan
              </button>
            ) : (
              <div className="flex flex-col items-center space-y-4 w-full">
                <div className="relative w-full h-80 rounded-xl overflow-hidden shadow-2xl bg-gradient-to-br from-rose-100 to-orange-100">
                  <Webcam
                    ref={webcamRef}
                    audio={false}
                    screenshotFormat="image/png"
                    videoConstraints={{
                      deviceId: selectedDeviceId ? { exact: selectedDeviceId } : undefined,
                    }}
                    className="w-full h-full object-cover"
                  />
                  <canvas ref={canvasRef} className="hidden" />
                  <div className="absolute inset-0 rounded-xl ring-4 ring-orange-300/40 animate-pulse pointer-events-none"></div>
                </div>
                <button
                  onClick={cancelScanning}
                  className="px-6 py-2 rounded-xl bg-gradient-to-r from-gray-300 to-gray-400 text-gray-800 font-semibold shadow-md hover:scale-105 transform transition"
                >
                  Cancel Scan
                </button>
              </div>
            )
          ) : (
            <div className="w-full h-80 rounded-xl bg-gray-100 flex items-center justify-center shadow-inner text-gray-500 italic">
              {scanning ? "Scanning..." : "Waiting for first keystroke to start scan..."}
            </div>
          )}
        </div>

        {/* RESULT */}
        <div className="md:col-span-2 p-6 bg-gradient-to-r from-amber-100 to-orange-100 rounded-xl shadow-inner text-center">
          <h2 className="font-semibold text-gray-700 mb-2">Scanned Data:</h2>
          {scannedData ? (
            <div className="space-y-2">
              <p className="text-lg font-mono text-rose-700 break-words">
                {scannedData}
              </p>
              {scanTime && (
                <p className="text-sm text-gray-600">
                  ⏱️ Scanned in {scanTime} seconds
                </p>
              )}
              {text && (
                <motion.p
                  className={
                    isMatch
                      ? "text-green-700 font-bold"
                      : "text-rose-600 font-bold"
                  }
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                >
                  {isMatch ? "✅ Match Successful" : "❌ Does Not Match"}
                </motion.p>
              )}
            </div>
          ) : (
            <p className="text-gray-400 italic">No scan yet...</p>
          )}
        </div>
      </motion.div>
    </div>
  );
}