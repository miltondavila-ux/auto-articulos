import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@auto-articulos/db";
import { getCurrentUserId } from "@/lib/current-user";
import { put } from "@vercel/blob";
import sharp from "sharp";

// Dimensiones objetivo para que el archivo salga chico y se vea bien
// compuesto en los prompts de imagen de redes sociales (carruseles,
// reels, infografías de Instagram). El servidor SIEMPRE reescala al
// target, así da igual lo que suba el usuario.
const TARGET = {
  profile: { width: 600, height: 600 },
  logo: { width: 500, height: 250 },
} as const;

// Límite duro de entrada (4MB). sharp lo comprime al guardar, así que el
// peso final siempre termina muy por debajo de esto.
const MAX_INPUT_BYTES = 4 * 1024 * 1024;

// Peso máximo objetivo después de reescalar/comprimir. Si tras varios
// intentos seguimos por encima, devolvemos error para no inflar Vercel
// Blob.
const MAX_OUTPUT_BYTES = 200 * 1024;

// Formatos de entrada aceptados. Para el OUTPUT usamos JPEG para fotos
// (mucho más liviano que PNG) y PNG para logos (preserva transparencia).
const ALLOWED_INPUT_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

export async function POST(request: NextRequest) {
  const userId = await getCurrentUserId();

  const formData = await request.formData();
  const type = formData.get("type");
  const file = formData.get("file");

  if (type !== "profile" && type !== "logo") {
    return NextResponse.json({ error: "type debe ser 'profile' o 'logo'." }, { status: 400 });
  }

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Debes adjuntar un archivo de imagen." }, { status: 400 });
  }

  if (!ALLOWED_INPUT_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "Formato no permitido. Sube una imagen JPG, PNG o WEBP." },
      { status: 400 },
    );
  }

  if (file.size > MAX_INPUT_BYTES) {
    return NextResponse.json(
      { error: `El archivo pesa ${(file.size / (1024 * 1024)).toFixed(1)}MB. El máximo permitido es 4MB.` },
      { status: 400 },
    );
  }

  const inputBuffer = Buffer.from(await file.arrayBuffer());

  let resizedBuffer: Buffer;
  let outputType: "image/jpeg" | "image/png";
  let ext: "jpg" | "png";
  if (type === "profile") {
    outputType = "image/jpeg";
    ext = "jpg";
    resizedBuffer = await sharp(inputBuffer)
      .rotate()
      .resize(TARGET.profile.width, TARGET.profile.height, {
        fit: "cover",
        position: "centre",
      })
      .jpeg({ quality: 82, mozjpeg: true })
      .toBuffer();
  } else {
    outputType = "image/png";
    ext = "png";
    resizedBuffer = await sharp(inputBuffer)
      .resize(TARGET.logo.width, TARGET.logo.height, {
        fit: "contain",
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png({ compressionLevel: 9 })
      .toBuffer();
  }

  // Salvavidas: si la primera pasada quedó pesada (raro en la práctica),
  // reintentamos con más compresión para no superar el límite de salida.
  if (resizedBuffer.length > MAX_OUTPUT_BYTES) {
    if (type === "profile") {
      resizedBuffer = await sharp(inputBuffer)
        .rotate()
        .resize(TARGET.profile.width, TARGET.profile.height, {
          fit: "cover",
          position: "centre",
        })
        .jpeg({ quality: 65, mozjpeg: true })
        .toBuffer();
    } else {
      resizedBuffer = await sharp(inputBuffer)
        .resize(TARGET.logo.width, TARGET.logo.height, {
          fit: "contain",
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        })
        .png({ compressionLevel: 9, palette: true })
        .toBuffer();
    }
  }

  if (resizedBuffer.length > MAX_OUTPUT_BYTES) {
    return NextResponse.json(
      {
        error: `Tras la optimización la imagen aún pesa ${(resizedBuffer.length / 1024).toFixed(0)}KB, por encima del máximo de ${MAX_OUTPUT_BYTES / 1024}KB. Intenta con otra imagen.`,
      },
      { status: 400 },
    );
  }

  const prefix = type === "profile" ? "profile-photos" : "business-logos";
  const blob = await put(`${prefix}/${userId}.${ext}`, resizedBuffer, {
    access: "public",
    contentType: outputType,
    addRandomSuffix: true,
  });

  if (type === "profile") {
    await prisma.user.update({ where: { id: userId }, data: { profilePhotoUrl: blob.url } });
  } else {
    await prisma.user.update({ where: { id: userId }, data: { businessLogoUrl: blob.url } });
  }

  // Devolvemos también el peso final en KB para que el UI pueda mostrar
  // "guardada (45KB)" al usuario.
  return NextResponse.json({
    url: blob.url,
    sizeBytes: resizedBuffer.length,
    width: type === "profile" ? TARGET.profile.width : TARGET.logo.width,
    height: type === "profile" ? TARGET.profile.height : TARGET.logo.height,
  });
}

export async function DELETE(request: NextRequest) {
  const userId = await getCurrentUserId();
  const { type } = await request.json().catch(() => ({}));

  if (type !== "profile" && type !== "logo") {
    return NextResponse.json({ error: "type debe ser 'profile' o 'logo'." }, { status: 400 });
  }

  if (type === "profile") {
    await prisma.user.update({ where: { id: userId }, data: { profilePhotoUrl: null } });
  } else {
    await prisma.user.update({ where: { id: userId }, data: { businessLogoUrl: null } });
  }

  return NextResponse.json({ ok: true });
}
