"use client";

import { useEffect, useRef } from "react";
import QRCode from "qrcode";

interface QrCodeDisplayProps {
  url: string;
  size?: number;
  label?: string;
}

export function QrCodeDisplay({ url, size = 200, label }: QrCodeDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, url, {
        width: size,
        margin: 1,
        color: {
          dark: "#1d1d1f",
          light: "#ffffff",
        },
      });
    }
  }, [url, size]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        gap: 12,
        padding: "16px",
        borderRadius: 12,
        background: "#ffffff",
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          borderRadius: 8,
          background: "#ffffff",
          border: "1px solid #d2d2d7",
        }}
      />
      {label && (
        <p
          style={{
            fontSize: 13,
            color: "#86868b",
            margin: 0,
            textAlign: "left",
          }}
        >
          {label}
        </p>
      )}
    </div>
  );
}
