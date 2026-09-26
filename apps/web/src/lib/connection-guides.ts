/**
 * «Cómo hacerlo paso a paso» de cada red, con el mismo formato de 5 pasos que Search Console
 * y Analytics. Lenguaje neutro para el cliente: sin jerga técnica ni nombres de proveedores.
 */
export interface ConnectionGuideContent {
  steps: string[];
  ifFails?: string;
}

const PROBAR = "Pulsa Probar conexión y comprueba el mensaje verde.";

function oauthGuide(red: string, cuenta: string, cuartoPaso: string): ConnectionGuideContent {
  return {
    steps: [
      `Abre ${red} en otra pestaña del mismo navegador.`,
      `Confirma que estás dentro de ${cuenta}.`,
      "Pulsa Nueva conexión y autoriza el acceso solicitado.",
      cuartoPaso,
      PROBAR,
    ],
  };
}

export const CONNECTION_GUIDES: Record<string, ConnectionGuideContent> = {
  threads: oauthGuide("Threads", "la cuenta de Threads que quieres usar", "Vuelve aquí y comprueba la pantalla de Conexión exitosa."),
  linkedin: oauthGuide("LinkedIn", "la cuenta de LinkedIn que quieres usar", "Vuelve aquí y comprueba la pantalla de Conexión exitosa."),
  pinterest: oauthGuide("Pinterest", "la cuenta de Pinterest que quieres usar", "Elige el tablero donde se publicarán los Pins y pulsa Aprobar y guardar."),
  tumblr: oauthGuide("Tumblr", "la cuenta de Tumblr que quieres usar", "Elige el blog donde se publicará y pulsa Aprobar y guardar."),
  blogger: oauthGuide("Blogger", "la cuenta de Google que administra tu blog", "Elige el blog donde se publicará y pulsa Aprobar y guardar."),
  "bing-webmaster": {
    steps: [
      "Abre Bing Webmaster Tools en otra pestaña del mismo navegador.",
      "Confirma que estás dentro de la cuenta de Microsoft que administra tu sitio.",
      "Pulsa Nueva conexión y autoriza el acceso solicitado.",
      "Elige tu sitio verificado, revisa la dirección del sitemap y pulsa Aprobar y guardar.",
      PROBAR,
    ],
    ifFails: "revisa que tu sitio esté verificado en Bing Webmaster Tools y vuelve a intentarlo.",
  },
  "business-profile": {
    steps: [
      "Abre Google en otra pestaña del mismo navegador.",
      "Confirma que estás dentro de la cuenta de Google que administra tu Perfil de Negocio y que tu ficha está verificada.",
      "Pulsa Nueva conexión y autoriza el acceso solicitado.",
      "Vuelve aquí y comprueba la pantalla de Conexión exitosa.",
      PROBAR,
    ],
    ifFails: "una ficha sin verificar no puede recibir publicaciones; verifícala en Google y vuelve a intentarlo.",
  },
  bluesky: {
    steps: [
      "Abre Bluesky en otra pestaña del mismo navegador y entra en Configuración → Privacidad y seguridad → Contraseñas de aplicación.",
      "Pulsa Crear nueva contraseña, ponle el nombre SEO TOTAL y copia la contraseña que Bluesky te muestra. No uses tu contraseña normal.",
      "Escribe tu usuario completo (por ejemplo, nombre.bsky.social) y pega la contraseña de aplicación aquí abajo.",
      "Pulsa Conectar y comprueba la pantalla de Conexión exitosa.",
      PROBAR,
    ],
    ifFails: "revisa que no hayas copiado espacios, que el usuario incluya el dominio y que sea una contraseña de aplicación.",
  },
  devto: {
    steps: [
      "Abre DEV.to en otra pestaña del mismo navegador (si no tienes cuenta, créala en dev.to/enter).",
      "En DEV.to abre tu foto de perfil y entra en Settings → Extensions → API Keys (los menús de DEV.to están en inglés).",
      "Crea una clave con el nombre SEO TOTAL y copia la clave completa. No uses tu contraseña.",
      "Escribe tu nombre de usuario de DEV.to, pega la clave aquí abajo y pulsa Conectar.",
      PROBAR,
    ],
    ifFails: "revisa que copiaste la clave completa, sin espacios, y que pertenece al mismo usuario escrito.",
  },
};
