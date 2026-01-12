import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Camera, CameraOff, RefreshCw } from 'lucide-react';

interface QRScannerProps {
  onScan: (ticketCode: string) => void;
  isProcessing: boolean;
}

export const QRScanner: React.FC<QRScannerProps> = ({ onScan, isProcessing }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const qrCodeRegionId = 'qr-reader';

  useEffect(() => {
    // Get available cameras on mount
    Html5Qrcode.getCameras()
      .then((devices) => {
        if (devices && devices.length > 0) {
          setCameras(devices.map((d) => ({ id: d.id, label: d.label })));
          // Prefer back camera if available
          const backCamera = devices.find((d) => d.label.toLowerCase().includes('back'));
          setSelectedCamera(backCamera?.id || devices[0].id);
        }
      })
      .catch((err) => {
        console.error('Error getting cameras:', err);
        setError('Unable to access camera. Please check permissions.');
      });

    return () => {
      stopScanning();
    };
  }, []);

  const startScanning = async () => {
    if (!selectedCamera) {
      setError('No camera selected');
      return;
    }

    try {
      setError(null);
      const scanner = new Html5Qrcode(qrCodeRegionId);
      scannerRef.current = scanner;

      await scanner.start(
        selectedCamera,
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          // Successfully scanned
          if (!isProcessing) {
            onScan(decodedText);
          }
        },
        (errorMessage) => {
          // Scanning error (usually just "no QR code found")
          // We can ignore these
        }
      );

      setIsScanning(true);
    } catch (err: any) {
      console.error('Error starting scanner:', err);
      setError(err.message || 'Failed to start scanner');
      setIsScanning(false);
    }
  };

  const stopScanning = async () => {
    if (scannerRef.current && isScanning) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
        scannerRef.current = null;
        setIsScanning(false);
      } catch (err) {
        console.error('Error stopping scanner:', err);
      }
    }
  };

  const handleToggleScanner = () => {
    if (isScanning) {
      stopScanning();
    } else {
      startScanning();
    }
  };

  const handleCameraChange = async (cameraId: string) => {
    setSelectedCamera(cameraId);
    if (isScanning) {
      await stopScanning();
      // Wait a bit before restarting with new camera
      setTimeout(() => {
        startScanning();
      }, 500);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>QR Code Scanner</CardTitle>
        <CardDescription>
          Scan ticket QR codes for instant check-in
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Camera Selection */}
          {cameras.length > 1 && (
            <div>
              <label className="text-sm font-medium mb-2 block">Select Camera</label>
              <select
                value={selectedCamera || ''}
                onChange={(e) => handleCameraChange(e.target.value)}
                className="w-full p-2 border rounded-md"
                disabled={isScanning}
              >
                {cameras.map((camera) => (
                  <option key={camera.id} value={camera.id}>
                    {camera.label || camera.id}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Scanner Display */}
          <div
            id={qrCodeRegionId}
            className={`${
              isScanning ? 'block' : 'hidden'
            } rounded-lg overflow-hidden border-2 border-primary`}
          />

          {/* Placeholder when not scanning */}
          {!isScanning && (
            <div className="bg-muted rounded-lg p-12 text-center">
              <Camera className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {cameras.length === 0
                  ? 'No cameras detected'
                  : 'Click "Start Scanner" to begin scanning'}
              </p>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="bg-destructive/10 text-destructive p-3 rounded-md text-sm">
              {error}
            </div>
          )}

          {/* Control Buttons */}
          <div className="flex gap-2">
            <Button
              onClick={handleToggleScanner}
              disabled={cameras.length === 0 || isProcessing}
              className="flex-1"
            >
              {isScanning ? (
                <>
                  <CameraOff className="h-4 w-4 mr-2" />
                  Stop Scanner
                </>
              ) : (
                <>
                  <Camera className="h-4 w-4 mr-2" />
                  Start Scanner
                </>
              )}
            </Button>

            {isScanning && (
              <Button
                variant="outline"
                onClick={() => {
                  stopScanning().then(() => startScanning());
                }}
                disabled={isProcessing}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Instructions */}
          {isScanning && (
            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md text-sm">
              <p className="font-medium mb-1">Scanning Active</p>
              <p className="text-muted-foreground">
                Position the QR code within the frame. It will automatically scan and check in.
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
