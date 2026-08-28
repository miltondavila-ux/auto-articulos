/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  // Preflight (el reset global de Tailwind sobre <button>, <input>, <h1>...)
  // queda apagado a propósito: el resto de la app usa estilos inline y no
  // debe verse afectada por Tailwind. Tailwind solo aporta clases de
  // utilidad donde se usen explícitamente (los componentes de Tremor).
  corePlugins: {
    preflight: false,
  },
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
    // Monorepo (npm workspaces): @tremor/react queda "hoisted" al
    // node_modules raíz, no dentro de apps/web — se listan ambas rutas
    // porque el hoisting puede variar entre el entorno local y Vercel.
    "./node_modules/@tremor/**/*.{js,ts,jsx,tsx}",
    "../../node_modules/@tremor/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Redefine las paletas estándar de Tailwind que usan los props
        // `color="blue"/"emerald"/"amber"/"red"` de Tremor (Badge,
        // Callout, ProgressBar, LineChart en PerformanceDashboard.tsx).
        // Seguro de tocar globalmente: por diseño, NINGÚN otro archivo de
        // la app usa clases crudas de Tailwind (bg-blue-500, text-red-600,
        // etc.) — todo lo demás es estilo inline (ver comentario de
        // `corePlugins.preflight` arriba). Tremor es el único consumidor.
        //
        // Bug real (23/8/2026): el safelist que hizo falta para que estas
        // clases no se purgaran (ver más abajo) hizo que aparecieran con
        // los tonos de fábrica de Tailwind — saturados, sin relación con
        // la paleta Apple ya establecida en el resto del sistema — y
        // Milton lo señaló como "carnavalizando" el tema. La solución no
        // es esconder los colores de nuevo (eso fue el bug anterior), es
        // que sean los colores correctos: los mismos hex ya usados en
        // toda la plataforma (ReadyBadge #16803c, PreValidationGuard
        // #8a4b08/#fff4e5/#e8f2ff/#0071e3, botones #0071e3, enlaces
        // #0066cc). Los tonos 500 de cada rampa son el color de marca
        // real; el resto son variaciones alrededor de ese mismo tono, no
        // los azules/verdes/ámbares de Tailwind por defecto.
        blue: {
          50: "#eef6fd",
          100: "#d9ecfb",
          200: "#b3d9f7",
          300: "#7fbdf0",
          400: "#4a9de6",
          500: "#0071e3",
          600: "#005bb8",
          700: "#00468c",
          800: "#003261",
          900: "#001f3d",
          950: "#001326",
        },
        emerald: {
          50: "#eefaf1",
          100: "#d3f3dc",
          200: "#a7e7ba",
          300: "#71d693",
          400: "#4ad078",
          500: "#34c759",
          600: "#16803c",
          700: "#116830",
          800: "#0d5026",
          900: "#0a3d1d",
          950: "#052712",
        },
        amber: {
          50: "#fff6e8",
          100: "#ffe9c2",
          200: "#ffd28a",
          300: "#ffb84d",
          400: "#ffa61f",
          500: "#ff9500",
          600: "#c96f00",
          700: "#8a5a00",
          800: "#6b4600",
          900: "#4d3300",
          950: "#332200",
        },
        red: {
          50: "#ffefee",
          100: "#ffdad7",
          200: "#ffb3ac",
          300: "#ff8478",
          400: "#ff5e50",
          500: "#ff3b30",
          600: "#d92e24",
          700: "#a8231b",
          800: "#7a1913",
          900: "#52100d",
          950: "#330a08",
        },
        tremor: {
          brand: {
            faint: "#eff6ff",
            muted: "#bfdbfe",
            subtle: "#60a5fa",
            DEFAULT: "#3b82f6",
            emphasis: "#1d4ed8",
            inverted: "#ffffff",
          },
          background: {
            muted: "#f9fafb",
            subtle: "#f3f4f6",
            DEFAULT: "#ffffff",
            emphasis: "#374151",
          },
          border: { DEFAULT: "#e5e7eb" },
          ring: { DEFAULT: "#e5e7eb" },
          content: {
            subtle: "#9ca3af",
            DEFAULT: "#6b7280",
            emphasis: "#374151",
            strong: "#111827",
            inverted: "#ffffff",
          },
        },
        "dark-tremor": {
          brand: {
            faint: "#0B1229",
            muted: "#172554",
            subtle: "#1e40af",
            DEFAULT: "#3b82f6",
            emphasis: "#60a5fa",
            inverted: "#030712",
          },
          background: {
            muted: "#0b1a3a",
            subtle: "#1f2937",
            DEFAULT: "#111827",
            emphasis: "#d1d5db",
          },
          border: { DEFAULT: "#1f2937" },
          ring: { DEFAULT: "#1f2937" },
          content: {
            subtle: "#4b5563",
            DEFAULT: "#9ca3af",
            emphasis: "#e5e7eb",
            strong: "#f9fafb",
            inverted: "#000000",
          },
        },
      },
      boxShadow: {
        "tremor-input": "0 1px 2px 0 rgb(0 0 0 / 0.05)",
        "tremor-card":
          "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
        "tremor-dropdown":
          "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
        "dark-tremor-input": "0 1px 2px 0 rgb(0 0 0 / 0.05)",
        "dark-tremor-card":
          "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
        "dark-tremor-dropdown":
          "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
      },
      borderRadius: {
        "tremor-small": "0.375rem",
        "tremor-default": "0.5rem",
        "tremor-full": "9999px",
      },
      fontSize: {
        "tremor-label": ["0.75rem", { lineHeight: "1rem" }],
        "tremor-default": ["0.875rem", { lineHeight: "1.25rem" }],
        "tremor-title": ["1.125rem", { lineHeight: "1.75rem" }],
        "tremor-metric": ["1.875rem", { lineHeight: "2.25rem" }],
      },
    },
  },
  safelist: [
    {
      pattern:
        /^(bg|text|border|ring|fill|stroke)-(tremor|dark-tremor)-(brand|background|border|ring|content)(-.*)?$/,
      variants: ["hover", "ui-selected"],
    },
    // Bug real (23/8/2026): el gráfico "Tu ritmo" de Inicio no dibujaba
    // ninguna línea pese a tener datos. Causa: los componentes de Tremor
    // (LineChart, Badge, ProgressBar, Callout...) arman sus clases de color
    // con template literals en tiempo de ejecución — ver getColorClassNames
    // en @tremor/react/dist/lib/utils.js, que devuelve cosas como
    // `stroke-${color}-${shade}` — así que Tailwind nunca ve el nombre de
    // clase completo en el código fuente y las purga en el build de
    // producción. El safelist de arriba solo cubre la paleta personalizada
    // "tremor-*" (el fondo/borde de las tarjetas), no la paleta estándar de
    // Tailwind que se usa para las SERIES de datos (colors={["neutral",
    // "gray"]} en LineChart, color="emerald"/"blue"/"amber" en Badge y
    // Callout, color="blue"/"red" en ProgressBar). Verificado con
    // `npx tailwindcss` antes y después: sin esta regla, stroke-neutral-500
    // no existe en el CSS compilado.
    {
      pattern:
        /^(bg|text|border|ring|fill|stroke)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(50|100|200|300|400|500|600|700|800|900|950)$/,
      variants: ["hover", "dark", "ui-selected"],
    },
  ],
  plugins: [],
};
