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
  // Especificaciones mostradas al usuario como guía.
  label: string;
  description: string;
  targetWidth: number;
  targetHeight: number;
  maxKb: number;
}

// Subida máxima en bytes que aceptamos en el cliente (el servidor siempre
// reescala a las dimensiones objetivo / peso objetivo — no hace falta
// rigideces extras aquí, el usuario dijo "no seas muy estricto").
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
      // Limpiamos el input para que reintentar con el mismo archivo funcione.
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    // Preview local antes de subir — el usuario ve cómo quedará en la
    // composición.
    const reader = new FileReader();
    reader.onload = (ev) => setLocalPreview(ev.target?.result as string);
    reader.readAsDataURL(file);

    try {
      await onUpload(type, file);
      setLocalPreview(null);
    } catch {
      // El padre ya pinta el error general; conservamos el preview local.
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

  // Lo que se muestra como "actual": preview local recien subida tiene
  // prioridad, si no, la URL que devolvió el servidor.
  const displayedUrl = localPreview ?? currentUrl ?? null;
  const aspect = targetWidth / targetHeight;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(120px, 180px) 1fr",
        gap: 16,
        alignItems: "center",
        padding: "12px 0",
        borderTop: "1px solid #e5e8ec",
      }}
    >
      <div
        style={{
          width: "100%",
          aspectRatio: `${aspect}`,
          maxWidth: 180,
          background: "#f7f8fa",
          border: "1px dashed #cbd5e1",
          borderRadius: 10,
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#94a3b8",
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
            fontSize: 13,
            fontWeight: 700,
            color: "#1e293b",
            marginBottom: 4,
          }}
        >
          {label}
        </label>
        <p style={{ fontSize: 12, color: "#64748b", margin: "0 0 10px 0", lineHeight: 1.5 }}>
          {description} El servidor optimiza tu archivo a{" "}
          <strong>
            {targetWidth}x{targetHeight}px, ~{maxKb}KB
          </strong>{" "}
          automáticamente antes de guardarlo, así no ocupa espacio innecesario.
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
                background: "#2f5fdb",
                color: "#ffffff",
                border: "none",
              },
              uploading,
            )}
          >
            {uploading
              ? "Subiendo..."
              : currentUrl
                ? "Reemplazar"
                : "Subir"}
          </label>

          {currentUrl && (
            <button
              type="button"
              onClick={handleRemoveClick}
              disabled={uploading}
              style={disabledStyle(
                {
                  ...secondaryButtonStyle,
                  marginTop: 0,
                  padding: "8px 14px",
                  color: "#ef4444",
                  border: "1px solid #fecaca",
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
              color: "#b91c1c",
              margin: "8px 0 0 0",
              padding: "6px 10px",
              background: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: 6,
            }}
          >
            ⚠ {localError ?? errorMessage}
          </p>
        )}
      </div>
    </div>
  );
}
