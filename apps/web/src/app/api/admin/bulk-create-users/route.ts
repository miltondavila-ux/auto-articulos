import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { prisma } from "@auto-articulos/db";
import { encryptSecret } from "@auto-articulos/shared";
import { requireAdmin } from "@/lib/current-user";

// Endpoint TEMPORAL: alta masiva de usuarios pedida el 31/7/2026. Se borra
// después de usarse una vez.
const USERS: { name: string; email: string }[] = [
  {
    name: "Gestions Joan Pascual Slu / Pascual",
    email: "joan.pascual@expglobalspain.com",
  },
  { name: "Yenimar Lopez", email: "yelo2201@gmail.com" },
  { name: "Ronny Meza", email: "realtorronnymeza@gmail.com" },
  { name: "Tamaira Benavides", email: "tamairaben@gmail.com" },
  { name: "Ma Rosa Almaguer González", email: "almaguer42@hotmail.com" },
  { name: "STELLA PENAGOS", email: "realtorspenagos@gmail.com" },
  { name: "Antonio Aguirre", email: "tony@antonioaguirre.com" },
  { name: "Brendy Calderon", email: "brendyrealtor@gmail.com" },
  { name: "Nélida Gomez", email: "nelidagomezrealtor@gmail.com" },
  { name: "Mireya Crisafulli", email: "mirellacrisafulli70@gmail.com" },
  { name: "Hector L. Colón", email: "hector.colon.realtor@gmail.com" },
  { name: "Carmen German", email: "carmengerman727@gmail.com" },
  { name: "Lizzammar Oropeza", email: "lizzaoropezarealtor@gmail.com" },
  {
    name: "Lidia Capdevila Aguiló",
    email: "lidia.capdevila@expglobalspain.com",
  },
  { name: "Aranzazu Gomez Baldor", email: "arantza.gomez@expglobalspain.com" },
  { name: "Julio Paso - Parga Cruz", email: "pasoparga@gmail.com" },
  { name: "German Martín Teba", email: "german.mteba@gmail.com" },
  { name: "Veneranda Feliciano", email: "v.exclusivehomes@gmail.com" },
  { name: "Monica Paz", email: "monica@mpazrealestate.com" },
  { name: "Danny Echavarria", email: "danny-em@hotmail.com" },
  { name: "Erick Flores", email: "belcazzo65@gmail.com" },
  { name: "Eira Rivas", email: "eirarivasrealtor@gmail.com" },
  { name: "Sandra Gómez Pérez", email: "sandra.gomezperez@gmail.com" },
  { name: "Andrés Jesús Reche Molina", email: "andres.reche@altadares.com" },
  { name: "Guzman Erramuspe", email: "guzman.myhome@gmail.com" },
  { name: "MONICA CHEDIAK", email: "monicachediakbarbur@gmail.com" },
  { name: "Amparo Lillo Bilbao", email: "realestate@amparolillo.com" },
  {
    name: "Virginia González Lequerica",
    email: "virginiaglequerica@gmail.com",
  },
  { name: "Mirtza Montejo", email: "mirmontejore@gmail.com" },
  { name: "Patricia Remuzgo", email: "remuzgoteam@gmail.com" },
  { name: "Alex Ferwerda", email: "alex.ferwerda@gmail.com" },
  { name: "Miguelina Mejia", email: "m.mejia@seekers.com.do" },
  { name: "Yolanda Landinez", email: "yolandalandinezrealtor@gmail.com" },
  { name: "Sonia De La Parte", email: "soniadelaparte.mia@gmail.com" },
  { name: "Axelle Clément", email: "axelle.clement@expglobalspain.com" },
  { name: "Omelis Azuaje", email: "omelisrealtor@gmail.com" },
  { name: "HECTOR FARFAN", email: "hector.tupropiedadenmiami@gmail.com" },
  { name: "Zulmad Antolinez", email: "zulmadrealestate@gmail.com" },
  { name: "Mariana Romero", email: "rmarianarealestate@gmail.com" },
  { name: "Mariffer De Armas", email: "mariffer574@gmail.com" },
  { name: "Olga Varja", email: "olga.varja@gmail.com" },
  {
    name: "Svetlana Botnarciuc",
    email: "svetlana.botnarciuc@expglobalspain.com",
  },
];

function generatePassword(): string {
  return randomBytes(9).toString("base64").replace(/[+/=]/g, "").slice(0, 12);
}

export async function POST() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const results: {
    name: string;
    email: string;
    password: string | null;
    status: "created" | "already_existed";
  }[] = [];

  for (const { name, email } of USERS) {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      results.push({ name, email, password: null, status: "already_existed" });
      continue;
    }

    const password = generatePassword();
    const passwordHash = await bcrypt.hash(password, 12);
    const initialPasswordEncrypted = encryptSecret(password);

    await prisma.user.create({
      data: { email, passwordHash, initialPasswordEncrypted, role: "user" },
    });

    results.push({ name, email, password, status: "created" });
  }

  return NextResponse.json({ results });
}
