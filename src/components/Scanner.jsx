import { useState, useEffect, useRef } from "react";
import { QRCodeCanvas } from "qrcode.react";
import BarcodeScannerComponent from "react-qr-barcode-scanner";
import { motion } from "framer-motion";

export default function Scanner() {
  const [text, setText] = useState("");
  const [scannedData, setScannedData] = useState("");
  const [buffer, setBuffer] = useState("");
  const [scanning, setScanning] = useState(false);
  const [scanTime, setScanTime] = useState(null);
  const [scanStartTime, setScanStartTime] = useState(null);
  const inputRef = useRef(null);

  // ✅ Capture Zebra Scanner (keyboard wedge mode)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (document.activeElement === inputRef.current) return;

      if (e.key === "Enter") {
        setScannedData(buffer);
        setBuffer("");
      } else {
        setBuffer((prev) => prev + e.key);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [buffer]);

  // ✅ Handle Scan Start
  const startScanning = () => {
    setScanning(true);
    setScannedData("");
    setScanTime(null);
    setScanStartTime(Date.now());
  };

  // ✅ Handle Scan Complete
  const handleScanComplete = (data) => {
    if (data) {
      setScannedData(data);
      setScanning(false);
      setScanTime(((Date.now() - scanStartTime) / 1000).toFixed(2));
    }
  };

  // ✅ Handle Cancel
  const cancelScanning = () => {
    setScanning(false);
    setScanStartTime(null);
    setScanTime(null);
  };

  const isMatch = text && scannedData && text === scannedData;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-300 via-amber-200 to-rose-300 p-4 md:p-6">
      <motion.div
        className="bg-white/80 backdrop-blur-md shadow-2xl rounded-2xl p-6 md:p-8 w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 gap-8"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
      >
        {/* Left Column → QR Generator */}
        <div className="flex flex-col items-center space-y-6">
          <h1 className="text-2xl md:text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-orange-600 to-rose-600">
            Generate QR
          </h1>

          <input
            ref={inputRef}
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

        {/* Right Column → Live Scanner */}
        <div className="flex flex-col items-center space-y-6">
          <h1 className="text-2xl md:text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-rose-600 to-orange-600">
            Scan QR
          </h1>

          {!scanning ? (
            <button
              onClick={startScanning}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-rose-500 text-white font-semibold shadow-lg hover:scale-105 transform transition"
            >
              Start Scan
            </button>
          ) : (
            <div className="flex flex-col items-center space-y-4 w-full">
              {/* Scanner Box */}
              <div className="relative w-full h-80 rounded-xl overflow-hidden shadow-2xl bg-gradient-to-br from-rose-100 to-orange-100">
                <BarcodeScannerComponent
                  width="100%"
                  height="100%"
                  onUpdate={(err, result) => {
                    if (result) handleScanComplete(result.text);
                  }}
                />

                {/* Soft glowing border */}
                <div className="absolute inset-0 rounded-xl ring-4 ring-orange-300/40 animate-pulse pointer-events-none"></div>

                {/* Animated scanning line */}
                <motion.div
                  className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-rose-500 to-transparent"
                  initial={{ top: 0 }}
                  animate={{ top: "100%" }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    repeatType: "reverse",
                  }}
                />
              </div>

              {/* Cancel Button */}
              <button
                onClick={cancelScanning}
                className="px-6 py-2 rounded-xl bg-gradient-to-r from-gray-300 to-gray-400 text-gray-800 font-semibold shadow-md hover:scale-105 transform transition"
              >
                Cancel Scan
              </button>
            </div>
          )}
        </div>

        {/* Scanned Output → full width below */}
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
              {isMatch ? (
                <motion.p
                  className="text-green-700 font-bold"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                >
                  ✅ Match Successful
                </motion.p>
              ) : text && scannedData ? (
                <motion.p
                  className="text-rose-600 font-bold"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                >
                  ❌ Does Not Match
                </motion.p>
              ) : null}
            </div>
          ) : (
            <p className="text-gray-400 italic">No scan yet...</p>
          )}
        </div>
      </motion.div>
    </div>
  );
}
