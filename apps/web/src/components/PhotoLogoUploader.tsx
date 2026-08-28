"use client";

import { useRef, useState } from "react";
import { secondaryButtonStyle, disabledStyle } from "@/components/dashboard-ui";

type UploadType = "profile" | "logo";

interface PhotoLogoUploaderProps {
  type: UploadType;
  currentUrl: string | null;
  uploading: boolean;
  onUpload: (type: UploadType, file: File) => Promise<void>;
  onRemove: (type: UploadType) => Promise<void>;
  errorMessage: string | null;
  label: string;
  description: string;
  targetWidth: number;
  targetHeight: number;
  maxKb: number;
}

const CLIENT_MAX_BYTES = 4 * 1024 * 1024;
const ALLOWED_EXTENSIONS = ["jpg", "jpeg", "png", "webp"];

export default function PhotoLogoUploader({
  type,
  currentUrl,
  uploading,
  onUpload,
  onRemove,
  errorMessage,
  label,
  description,
  targetWidth,
  targetHeight,
  maxKb,
}: PhotoLogoUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  function validateAndPreview(file: File) {
    setLocalError(null);
    if (!ALLOWED_EXTENSIONS.includes(file.name.split(".").pop()?.toLowerCase() ?? "")) {
      setLocalError("Formato no permitido. Usa JPG, PNG o WEBP.");
      return false;
    }
    if (file.size > CLIENT_MAX_BYTES) {
      setLocalError(
        `El archivo pesa ${(file.size / (1024 * 1024)).toFixed(1)}MB. Máximo 4MB.`,
      );
      return false;
    }
    return true;
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!validateAndPreview(file)) {
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => setLocalPreview(ev.target?.result as string);
    reader.readAsDataURL(file);

    try {
      await onUpload(type, file);
      setLocalPreview(null);
    } catch {
      // El padre maneja el error
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleRemoveClick() {
    const isProfile = type === "profile";
    const thing = isProfile ? "tu foto de perfil" : "el logo de tu negocio";
    if (!confirm(`¿Deseas eliminar ${thing}?`)) return;
    setLocalPreview(null);
    await onRemove(type);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const displayedUrl = localPreview ?? currentUrl ?? null;
  const aspect = targetWidth / targetHeight;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(120px, 180px) 1fr",
        gap: 16,
        alignItems: "center",
        padding: "14px 0",
        borderTop: "1px solid #e5e5ea",
      }}
    >
      <div
        style={{
          width: "100%",
          aspectRatio: `${aspect}`,
          maxWidth: 180,
          background: "#ffffff",
          border: "1px solid #d2d2d7",
          borderRadius: 12,
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#6e6e73",
          fontSize: 12,
          textAlign: "center",
          padding: 8,
        }}
      >
        {displayedUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={displayedUrl}
            alt={label}
            style={{ width: "100%", height: "100%", objectFit: "contain" }}
          />
        ) : (
          <span>Sin imagen aún</span>
        )}
      </div>

      <div>
        <label
          style={{
            display: "block",
            fontSize: 14,
            fontWeight: 600,
            color: "#1d1d1f",
            marginBottom: 3,
          }}
        >
          {label}
        </label>
        <p className="lead-copy" style={{ fontSize: 13, margin: "0 0 10px 0", lineHeight: 1.45 }}>
          {description} El servidor optimiza a{" "}
          <strong>
            {targetWidth}x{targetHeight}px, ~{maxKb}KB
          </strong>{" "}
          automáticamente.
        </p>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
            disabled={uploading}
            style={{ display: "none" }}
            id={`upload-${type}-file`}
          />
          <label
            htmlFor={`upload-${type}-file`}
            style={disabledStyle(
              {
                ...secondaryButtonStyle,
                display: "inline-block",
                cursor: "pointer",
                marginTop: 0,
                padding: "8px 14px",
                fontSize: 13,
              },
              uploading,
            )}
          >
            {uploading
              ? "Subiendo..."
              : currentUrl
                ? "Reemplazar"
                : "Subir imagen"}
          </label>

          {currentUrl && (
            <button
              type="button"
              onClick={handleRemoveClick}
              disabled={uploading}
              className="secondary"
              style={disabledStyle(
                {
                  ...secondaryButtonStyle,
                  marginTop: 0,
                  padding: "8px 14px",
                  color: "#ff3b30",
                  fontSize: 13,
                },
                uploading,
              )}
            >
              Eliminar
            </button>
          )}
        </div>

        {(localError || errorMessage) && (
          <p
            style={{
              fontSize: 12,
              color: "#ff3b30",
              margin: "8px 0 0 0",
              padding: "6px 10px",
              background: "#fff2f1",
              border: "1px solid rgba(255, 59, 48, 0.2)",
              borderRadius: 8,
            }}
          >
            {localError ?? errorMessage}
          </p>
        )}
      </div>
    </div>
  );
}
