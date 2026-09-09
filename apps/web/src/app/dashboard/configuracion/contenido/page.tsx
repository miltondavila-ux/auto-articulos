"use client";

import { useCallback, useEffect, useState } from "react";
import ModuleIntro, { IntroP } from "@/components/ModuleIntro";
import ConfiguracionSubNav from "@/components/ConfiguracionSubNav";
import PhotoLogoUploader, { type UploadType } from "@/components/PhotoLogoUploader";
import {
  sectionStyle,
  h2Style,
  inputStyle,
  secondaryButtonStyle,
  disabledStyle,
} from "@/components/dashboard-ui";

const MAX_SIGNATURE_LEN = 700;

/**
 * Página "Contenido", parte del rediseño "RENEW CONFIGURACION" (7/9/2026).
 *
 * Antes esto compartía bloque de código con "Cuenta" dentro de
 * `ConfiguracionView.tsx` — ambas pestañas mostraban exactamente el mismo
 * contenido, sin ningún límite entre ellas. Esta página es solo lo que
 * define el ESTILO EDITORIAL de la cuenta: cómo se escriben los artículos,
 * qué los firma, a quién apuntan (ubicaciones), el teléfono de contacto y
 * las imágenes de marca. El acceso (usuario/contraseña, categorías, idioma)
 * vive ahora en Cuenta.
 *
 * Lógica y llamadas a la API idénticas a las que ya existían — solo se
 * relocalizaron, no se reescribieron.
 */
export default function ConfiguracionContenidoPage() {
  const [prompts, setPrompts] = useState<{ id: string; name: string; prompt: string }[]>([]);
  const [defaultPromptId, setDefaultPromptId] = useState("");
  const [savingPrompt, setSavingPrompt] = useState(false);
  const [articleSignature, setArticleSignature] = useState("");
  const [savingSignature, setSavingSignature] = useState(false);
  const [clientLocations, setClientLocations] = useState("");
  const [businessLocations, setBusinessLocations] = useState("");
  const [savingLocations, setSavingLocations] = useState(false);
  const [phone, setPhone] = useState("");
  const [savingPhone, setSavingPhone] = useState(false);
  const [profilePhotoUrls, setProfilePhotoUrls] = useState<Record<"profile" | "profile2" | "profile3", string | null>>({ profile: null, profile2: null, profile3: null });
  const [businessLogoUrls, setBusinessLogoUrls] = useState<Record<"logo" | "logo2", string | null>>({ logo: null, logo2: null });
  const [uploadingImageType, setUploadingImageType] = useState<UploadType | null>(null);
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);
  const [banner, setBanner] = useState<{
    type: "error" | "info";
    text: string;
  } | null>(null);

  const signaturePercent = Math.min(
    100,
    Math.round((articleSignature.length / MAX_SIGNATURE_LEN) * 100),
  );
  const signatureBarColor = signaturePercent >= 95 ? "#ff3b30" : "#1d1d1f";

  const loadContent = useCallback(async () => {
    const [meRes, promptsRes] = await Promise.all([
      fetch("/api/me", { cache: "no-store" }),
      fetch("/api/prompts", { cache: "no-store" }),
    ]);
    if (promptsRes.ok) {
      const data = await promptsRes.json();
      setPrompts(data.prompts ?? []);
    }
    if (meRes.ok) {
      const data = await meRes.json();
      setArticleSignature(data.articleSignature ?? "");
      setDefaultPromptId(data.defaultPromptId ?? "");
      setPhone(data.phone ?? "");
      setClientLocations(data.clientLocations ?? "");
      setBusinessLocations(data.businessLocations ?? "");
      setProfilePhotoUrls({ profile: data.profilePhotoUrl ?? null, profile2: data.profilePhotoUrl2 ?? null, profile3: data.profilePhotoUrl3 ?? null });
      setBusinessLogoUrls({ logo: data.businessLogoUrl ?? null, logo2: data.businessLogoUrl2 ?? null });
    }
  }, []);

  useEffect(() => {
    loadContent();
  }, [loadContent]);

  async function handleSaveDefaultPrompt() {
    setSavingPrompt(true);
    setBanner(null);
    try {
      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ defaultPromptId: defaultPromptId || null }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setBanner({
          type: "error",
          text: data.error ?? "Error al guardar el estilo de redacción por defecto",
        });
        return;
      }
      setBanner({ type: "info", text: "Estilo de redacción por defecto guardado." });
    } finally {
      setSavingPrompt(false);
    }
  }

  async function handleSaveSignature() {
    setSavingSignature(true);
    setBanner(null);
    try {
      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ articleSignature }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setBanner({
          type: "error",
          text: data.error ?? "Error al guardar el texto final",
        });
        return;
      }
      setBanner({ type: "info", text: "Texto final del artículo guardado." });
    } finally {
      setSavingSignature(false);
    }
  }

  async function handleSaveLocations() {
    setSavingLocations(true);
    setBanner(null);
    try {
      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientLocations, businessLocations }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setBanner({
          type: "error",
          text: data.error ?? "Error al guardar las ubicaciones",
        });
        return;
      }
      setBanner({ type: "info", text: "Ubicaciones guardadas." });
    } finally {
      setSavingLocations(false);
    }
  }

  async function handleSavePhone() {
    setSavingPhone(true);
    setBanner(null);
    try {
      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setBanner({
          type: "error",
          text: data.error ?? "Error al guardar el teléfono",
        });
        return;
      }
      setBanner({ type: "info", text: "Número de teléfono guardado con éxito." });
    } finally {
      setSavingPhone(false);
    }
  }

  async function handleUploadImage(type: UploadType, file: File) {
    setUploadingImageType(type);
    setImageUploadError(null);
    try {
      const formData = new FormData();
      formData.append("type", type);
      formData.append("file", file);
      const res = await fetch("/api/me/upload-image", { method: "POST", body: formData });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = data.error ?? "Error al subir la imagen.";
        setImageUploadError(msg);
        throw new Error(msg);
      }
      if (type === "profile" || type === "profile2" || type === "profile3") {
        setProfilePhotoUrls((current) => ({ ...current, [type]: data.url }));
      } else {
        setBusinessLogoUrls((current) => ({ ...current, [type]: data.url }));
      }
      const kb = data.sizeBytes ? Math.round(data.sizeBytes / 1024) : null;
      const sizeNote = kb ? ` (${kb}KB)` : "";
      setBanner({
        type: "info",
        text:
          (type.startsWith("profile") ? "Foto guardada" : "Logo guardado") + sizeNote + ".",
      });
    } catch (err) {
      const msg =
        err instanceof Error && err.message
          ? err.message
          : "Error de conexión al subir la imagen.";
      setImageUploadError(msg);
      throw err;
    } finally {
      setUploadingImageType(null);
    }
  }

  async function handleRemoveImage(type: UploadType) {
    const label = type.startsWith("profile") ? "esta foto" : "este logo";
    if (!confirm(`¿Deseas eliminar ${label}?`)) return;
    setUploadingImageType(type);
    try {
      await fetch("/api/me/upload-image", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });
      if (type === "profile" || type === "profile2" || type === "profile3") {
        setProfilePhotoUrls((current) => ({ ...current, [type]: null }));
      } else {
        setBusinessLogoUrls((current) => ({ ...current, [type]: null }));
      }
    } finally {
      setUploadingImageType(null);
    }
  }

  return (
    <div>
      <ModuleIntro titulo="Contenido">
        <IntroP>
          Aquí defines cómo se ven y suenan tus artículos: el estilo de
          redacción, el texto que los firma, a qué clientes y lugares apuntan,
          tu teléfono de contacto y las fotos que se usan al crear
          publicaciones para redes sociales.
        </IntroP>
        <ol style={{ margin: "12px 0 0", paddingLeft: 22, color: "#1d1d1f", fontSize: 14, lineHeight: 1.65 }}>
          <li><strong>Elige el estilo de redacción:</strong> el tono con el que la inteligencia artificial escribe por defecto.</li>
          <li><strong>Escribe la firma:</strong> el texto que se agrega automáticamente al final de cada artículo nuevo.</li>
          <li><strong>Indica ubicaciones (opcional):</strong> de dónde son tus clientes y dónde opera tu negocio, para títulos más segmentados.</li>
          <li><strong>Guarda tu teléfono:</strong> se usa en los botones de WhatsApp y llamada de tus artículos.</li>
          <li><strong>Sube tus fotos y logo:</strong> se usan al crear imágenes para redes sociales.</li>
        </ol>
        <IntroP>
          Si buscas tu usuario y contraseña, tus categorías o el idioma de
          redacción, eso vive en Cuenta.
        </IntroP>
      </ModuleIntro>
      <ConfiguracionSubNav />

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Estilo de Redacción por Defecto */}
        <section style={sectionStyle}>
          <h2 style={h2Style}>Estilo de redacción por defecto</h2>
          <p style={{ fontSize: 13, color: "#6e6e73", marginBottom: 12 }}>
            Selecciona el estilo de escritura que se usará por defecto para tus artículos. Puedes cambiarlo individualmente al publicar un lote o ejecutar una oportunidad.
          </p>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <select
              value={defaultPromptId}
              onChange={(e) => setDefaultPromptId(e.target.value)}
              style={{ ...inputStyle, width: 280, maxWidth: "100%", height: 40 }}
            >
              <option value="">STANDARD (Estilo predeterminado de la plataforma)</option>
              {prompts.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <button
              onClick={handleSaveDefaultPrompt}
              disabled={savingPrompt}
              style={disabledStyle(secondaryButtonStyle, savingPrompt)}
            >
              {savingPrompt ? "Guardando..." : "Guardar estilo por defecto"}
            </button>
          </div>
        </section>

        {/* Firma / Texto al Final del Artículo */}
        <section style={sectionStyle}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 8,
              marginBottom: 6,
            }}
          >
            <h2 style={{ ...h2Style, margin: 0 }}>Firma al Final del Artículo y Disclosure</h2>
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: signatureBarColor,
                background: `${signatureBarColor}15`,
                padding: "4px 10px",
                borderRadius: 999,
                border: `1px solid ${signatureBarColor}30`,
              }}
            >
              {articleSignature.length} / {MAX_SIGNATURE_LEN} caracteres ({signaturePercent}%)
            </span>
          </div>

          <p style={{ fontSize: 13, color: "#6e6e73", marginBottom: 12 }}>
            Este texto se agregará automáticamente al final de cada artículo nuevo. Úsalo para firmar profesionalmente y, si es necesario, incluir un disclosure (aclaración legal) que indique que no eres asesor en materias legales, fiscales, financieras o de seguros.
          </p>

          <textarea
            value={articleSignature}
            onChange={(e) =>
              e.target.value.length <= MAX_SIGNATURE_LEN &&
              setArticleSignature(e.target.value)
            }
            placeholder='Ej: "**Nota importante:** Soy [Tu nombre], [Tu profesión] licenciado en [Tu estado/país]. El contenido de este artículo tiene fines informativos y educativos. No constituye asesoría legal, fiscal, contable, de seguros o de inversiones. Consulta siempre con un profesional debidamente licenciado."'
            rows={5}
            style={{
              ...inputStyle,
              width: "100%",
              resize: "vertical",
              fontFamily: "inherit",
              lineHeight: 1.5,
            }}
          />

          <div
            style={{
              width: "100%",
              height: 6,
              background: "#e5e5ea",
              borderRadius: 999,
              marginTop: 8,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${signaturePercent}%`,
                height: "100%",
                background: signatureBarColor,
                borderRadius: 999,
                transition: "width 0.2s ease, background 0.2s ease",
              }}
            />
          </div>

          <div style={{ marginTop: 12 }}>
            <button
              onClick={handleSaveSignature}
              disabled={savingSignature}
              style={disabledStyle(secondaryButtonStyle, savingSignature)}
            >
              {savingSignature ? "Guardando firma..." : "Guardar firma final"}
            </button>
          </div>
        </section>

        {/* Ubicaciones para títulos geolocalizados */}
        <section style={sectionStyle}>
          <h2 style={h2Style}>Ubicaciones para Títulos Geolocalizados</h2>
          <p style={{ fontSize: 13, color: "#6e6e73", marginBottom: 12 }}>
            Cuéntanos de dónde son tus clientes reales y dónde está o vende tu
            negocio. Con esta información, Oportunidades puede crear títulos
            ultra segmentados que combinan ambas (ej. &quot;Cómo invertir en
            propiedades en Homestead si vives en Colombia&quot;). Escribe
            varias ciudades o países separados por comas. Dejar vacío no
            cambia nada de tu cuenta.
          </p>

          <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#1d1d1f", marginBottom: 6 }}>
            ¿En dónde están tus clientes?
          </label>
          <input
            type="text"
            value={clientLocations}
            onChange={(e) => setClientLocations(e.target.value)}
            placeholder="Ej: Colombia, Bogotá, Ecuador, Caracas"
            style={{ ...inputStyle, width: "100%", marginBottom: 14 }}
          />

          <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#1d1d1f", marginBottom: 6 }}>
            ¿En dónde está tu negocio?
          </label>
          <input
            type="text"
            value={businessLocations}
            onChange={(e) => setBusinessLocations(e.target.value)}
            placeholder="Ej: Miami, Orlando, Homestead"
            style={{ ...inputStyle, width: "100%" }}
          />

          <div style={{ marginTop: 12 }}>
            <button
              onClick={handleSaveLocations}
              disabled={savingLocations}
              style={disabledStyle(secondaryButtonStyle, savingLocations)}
            >
              {savingLocations ? "Guardando..." : "Guardar ubicaciones"}
            </button>
          </div>
        </section>

        {/* Teléfono de Contacto */}
        <section style={sectionStyle}>
          <h2 style={h2Style}>Teléfono de Contacto</h2>
          <p style={{ fontSize: 13, color: "#6e6e73", marginBottom: 12 }}>
            Este número se usará en los botones de WhatsApp y llamada dentro de tus artículos. Incluye el código de país (ej: <code>+19546529929</code>).
          </p>

          <input
            type="text"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Ej: +19546529929"
            style={{
              ...inputStyle,
              width: "100%",
              maxWidth: 400,
            }}
          />

          <div style={{ marginTop: 12 }}>
            <button
              onClick={handleSavePhone}
              disabled={savingPhone}
              style={disabledStyle(secondaryButtonStyle, savingPhone)}
            >
              {savingPhone ? "Guardando teléfono..." : "Guardar número de teléfono"}
            </button>
          </div>
        </section>

        {/* Foto de perfil y Logo del negocio — cada usuario sube los suyos */}
        <section style={sectionStyle}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 8,
              marginBottom: 6,
            }}
          >
            <h2 style={{ ...h2Style, margin: 0 }}>Tu foto y logo para redes sociales</h2>
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "#6e6e73",
                background: "#f5f5f7",
                padding: "4px 10px",
                borderRadius: 999,
              }}
            >
              Marca personal
            </span>
          </div>

          <p style={{ fontSize: 13, color: "#6e6e73", marginBottom: 14 }}>
            Estas imágenes se usan como elementos visuales al generar las
            publicaciones de Instagram, Threads, X y LinkedIn (carruseles,
            reels e infografías). Puedes subir hasta tres fotos diferentes y
            dos versiones de tu logo; el sistema las
            optimizará automáticamente. No necesitas preocuparte por el
            tamaño: el servidor las deja listas en óptimas condiciones para
            que el prompt de redes sociales las use sin perder calidad.
          </p>

          <PhotoLogoUploader
            type="profile"
            kind="profile"
            currentUrl={profilePhotoUrls.profile}
            uploading={uploadingImageType === "profile"}
            onUpload={handleUploadImage}
            onRemove={handleRemoveImage}
            errorMessage={imageUploadError}
            label="Foto 1 de perfil"
            description="Tu foto principal. Puedes reemplazarla cuando quieras."
            targetWidth={600}
            targetHeight={600}
            maxKb={200}
          />

          <PhotoLogoUploader
            type="profile2"
            kind="profile"
            currentUrl={profilePhotoUrls.profile2}
            uploading={uploadingImageType === "profile2"}
            onUpload={handleUploadImage}
            onRemove={handleRemoveImage}
            errorMessage={imageUploadError}
            label="Foto 2 de perfil"
            description="Una segunda foto diferente para dar variedad a tus publicaciones."
            targetWidth={600}
            targetHeight={600}
            maxKb={200}
          />

          <PhotoLogoUploader
            type="profile3"
            kind="profile"
            currentUrl={profilePhotoUrls.profile3}
            uploading={uploadingImageType === "profile3"}
            onUpload={handleUploadImage}
            onRemove={handleRemoveImage}
            errorMessage={imageUploadError}
            label="Foto 3 de perfil"
            description="Una tercera foto diferente para ampliar las referencias disponibles."
            targetWidth={600}
            targetHeight={600}
            maxKb={200}
          />

          <PhotoLogoUploader
            type="logo"
            kind="logo"
            currentUrl={businessLogoUrls.logo}
            uploading={uploadingImageType === "logo"}
            onUpload={handleUploadImage}
            onRemove={handleRemoveImage}
            errorMessage={imageUploadError}
            label="Logo 1 de tu negocio"
            description="Tu logo principal, idealmente con fondo transparente."
            targetWidth={500}
            targetHeight={250}
            maxKb={200}
          />

          <PhotoLogoUploader
            type="logo2"
            kind="logo"
            currentUrl={businessLogoUrls.logo2}
            uploading={uploadingImageType === "logo2"}
            onUpload={handleUploadImage}
            onRemove={handleRemoveImage}
            errorMessage={imageUploadError}
            label="Logo 2 de tu negocio"
            description="Una segunda versión de tu logo, por ejemplo horizontal o cuadrada."
            targetWidth={500}
            targetHeight={250}
            maxKb={200}
          />
        </section>
      </div>

      {banner && (
        <div
          style={{
            padding: "14px 18px",
            borderRadius: 12,
            marginTop: 20,
            background: banner.type === "error" ? "rgba(255, 59, 48, 0.08)" : "rgba(52, 199, 89, 0.1)",
            color: banner.type === "error" ? "#ff3b30" : "#16803c",
            border:
              banner.type === "error"
                ? "1px solid rgba(255, 59, 48, 0.3)"
                : "1px solid rgba(52, 199, 89, 0.25)",
            fontSize: 14,
            fontWeight: 600,
            boxShadow: "none",
          }}
        >
          {banner.text}
        </div>
      )}
    </div>
  );
}
