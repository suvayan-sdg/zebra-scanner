// src/Scanner.jsx
import { useEffect, useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import BarcodeScannerComponent from "react-qr-barcode-scanner";
import { motion } from "framer-motion";

export default function Scanner() {
  // QR generator + results
  const [text, setText] = useState("");
  const [scannedData, setScannedData] = useState("");
  const [scanStartTime, setScanStartTime] = useState(null);
  const [scanTime, setScanTime] = useState(null);

  // Zebra keyboard wedge buffer
  const [buffer, setBuffer] = useState("");
  const inputRef = useRef(null);

  // Camera / devices
  const [devices, setDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [scannerKey, setScannerKey] = useState(0); // force remount on device change
  const [enumerating, setEnumerating] = useState(false);

  // ------------ Zebra scanner (keyboard wedge) ------------
  useEffect(() => {
    const onKey = (e) => {
      // Let user type in the text input without capturing those keystrokes
      if (document.activeElement === inputRef.current) return;
      if (e.key === "Enter") {
        if (buffer) {
          setScannedData(buffer);
          setBuffer("");
          setScanning(false); // close camera if it was open
          if (scanStartTime) {
            setScanTime(((Date.now() - scanStartTime) / 1000).toFixed(2));
          }
        }
      } else if (e.key.length === 1) {
        setBuffer((prev) => prev + e.key);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [buffer, scanStartTime]);

  // ------------ Permissions + enumeration helpers ------------
  const ensureCameraPermission = async () => {
    // Calling gUM once makes device labels visible and improves devicechange reliability
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: true });
    } catch (e) {
      console.error("Camera permission denied or unavailable:", e);
      throw e;
    } finally {
      if (stream) stream.getTracks().forEach((t) => t.stop());
    }
  };

  const enumerateVideoDevices = async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    setEnumerating(true);
    try {
      const all = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = all.filter((d) => d.kind === "videoinput");
      setDevices(videoInputs);

      // Default selection if none
      if (!selectedDeviceId && videoInputs.length) {
        setSelectedDeviceId(videoInputs[0].deviceId);
      } else if (
        selectedDeviceId &&
        !videoInputs.find((d) => d.deviceId === selectedDeviceId)
      ) {
        // Previously selected device was removed
        setSelectedDeviceId(videoInputs[0]?.deviceId ?? null);
      }
    } finally {
      setEnumerating(false);
    }
  };

  // On mount: grant permission (labels), enumerate, and subscribe to devicechange
  useEffect(() => {
    (async () => {
      try {
        await ensureCameraPermission();
      } catch {
        // Permission denied; still attempt enumeration (labels might be blank)
      } finally {
        await enumerateVideoDevices();
      }
    })();

    const onDeviceChange = () => {
      // Delay slightly so the OS registers the device
      setTimeout(() => enumerateVideoDevices(), 300);
    };

    navigator.mediaDevices?.addEventListener("devicechange", onDeviceChange);
    return () =>
      navigator.mediaDevices?.removeEventListener("devicechange", onDeviceChange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // If user changes device while scanning → remount scanner to apply new constraints
  useEffect(() => {
    if (scanning) {
      setScannerKey((k) => k + 1);
    }
  }, [selectedDeviceId, scanning]);

  // ------------ Scan controls ------------
  const startScanning = async () => {
    try {
      await ensureCameraPermission();
      await enumerateVideoDevices(); // pick up any hot-plugged device before starting
      setScannedData("");
      setScanTime(null);
      setScanStartTime(Date.now());
      setScanning(true);
      setScannerKey((k) => k + 1); // fresh mount
    } catch {
      // handled in ensureCameraPermission; no-op
    }
  };

  const cancelScanning = () => {
    setScanning(false);
    setScanStartTime(null);
    setScanTime(null);
  };

  const handleScanComplete = (data) => {
    if (!data) return;
    setScannedData(data);
    setScanning(false); // unmount scanner and stop tracks
    if (scanStartTime) {
      setScanTime(((Date.now() - scanStartTime) / 1000).toFixed(2));
    }
  };

  const isMatch = text && scannedData && text === scannedData;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-300 via-amber-200 to-rose-300 p-4 md:p-6">
      <motion.div
        className="bg-white/80 backdrop-blur-md shadow-2xl rounded-2xl p-6 md:p-8 w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 gap-8"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
      >
        {/* LEFT: QR Generator */}
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

        {/* RIGHT: Scanner + Device Picker */}
        <div className="flex flex-col items-center space-y-4 w-full">
          <h1 className="text-2xl md:text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-rose-600 to-orange-600">
            Scan QR
          </h1>

          <div className="flex w-full gap-3">
            <select
              value={selectedDeviceId || ""}
              onChange={(e) => setSelectedDeviceId(e.target.value)}
              className="flex-1 px-4 py-2 rounded-xl border-2 border-amber-300 bg-white text-gray-700 shadow-sm hover:shadow-md focus:ring-2 focus:ring-orange-400 outline-none"
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

            <button
              onClick={enumerateVideoDevices}
              disabled={enumerating}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-orange-400 text-white font-semibold shadow-md hover:shadow-lg disabled:opacity-60"
              title="Refresh devices"
            >
              {enumerating ? "Refreshing…" : "Refresh"}
            </button>
          </div>

          {!scanning ? (
            <div className="flex gap-3">
              <button
                onClick={startScanning}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-rose-500 text-white font-semibold shadow-lg hover:scale-105 transform transition"
              >
                Start Scan
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center space-y-4 w-full">
              {/* Scanner box */}
              <div className="relative w-full h-80 rounded-xl overflow-hidden shadow-2xl bg-gradient-to-br from-rose-100 to-orange-100">
                <BarcodeScannerComponent
                  key={scannerKey + (selectedDeviceId || "")}
                  // NOTE: many libs don't hot-swap streams; changing key forces a fresh getUserMedia
                  width="100%"
                  height="100%"
                  constraints={{
                    // Most browsers accept this object; the key remount ensures it takes effect
                    deviceId: selectedDeviceId || undefined,
                    facingMode: "environment",
                  }}
                  onUpdate={(err, result) => {
                    if (result?.text) handleScanComplete(result.text);
                  }}
                />
                {/* Soft glowing edge */}
                <div className="absolute inset-0 rounded-xl ring-4 ring-orange-300/40 animate-pulse pointer-events-none"></div>
                {/* Animated scan line */}
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

              <button
                onClick={cancelScanning}
                className="px-6 py-2 rounded-xl bg-gradient-to-r from-gray-300 to-gray-400 text-gray-800 font-semibold shadow-md hover:scale-105 transform transition"
              >
                Cancel Scan
              </button>
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
                <p className="text-sm text-gray-600">⏱️ Scanned in {scanTime} seconds</p>
              )}
              {text && (
                <motion.p
                  className={text === scannedData ? "text-green-700 font-bold" : "text-rose-600 font-bold"}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                >
                  {text === scannedData ? "✅ Match Successful" : "❌ Does Not Match"}
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
