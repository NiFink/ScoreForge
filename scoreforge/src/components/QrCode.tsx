"use client";

import { useEffect, useRef } from "react";
import QRCode from "qrcode";

type QrCodeProps = {
  value: string;
  size?: number;
};

export function QrCode({ value, size = 200 }: QrCodeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current && value) {
      void QRCode.toCanvas(canvasRef.current, value, {
        width: size,
        margin: 1,
        color: {
          dark: "#101820",
          light: "#ffffff",
        },
      });
    }
  }, [value, size]);

  return (
    <div className="inline-block bg-white p-2 rounded-lg">
      <canvas ref={canvasRef} className="block" />
    </div>
  );
}
