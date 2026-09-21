const DEVTO_TAGS = [
  "javascript", "typescript", "python", "react", "node", "webdev", "programming",
  "devops", "cloud", "ai", "machinelearning", "security", "opensource", "api",
  "database", "testing", "career", "tutorial", "beginners", "productivity",
] as const;

const TECHNICAL_TERMS = new Set([
  "api", "apis", "backend", "base de datos", "código", "codigo", "cloud", "css",
  "devops", "desarrollo web", "developer", "docker", "frontend", "github", "html",
  "javascript", "machine learning", "mcp", "node", "programación", "programacion",
  "python", "react", " seguridad informática", "software", "tecnología", "tecnologia",
  "testing", "typescript", "web", "wordpress",
]);

function normalize(value: string): string {
  return value.toLocaleLowerCase("es").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function isDevToEligible(title: string, summary: string, body: string): boolean {
  const text = normalize(`${title} ${summary} ${body}`);
  return Array.from(TECHNICAL_TERMS).some((term) => text.includes(normalize(term)));
}

export function deriveDevToEditorialTags(title: string, summary: string, category: string | null): string[] {
  const text = normalize(`${category || ""} ${title} ${summary}`);
  const tags: string[] = [];
  for (const tag of DEVTO_TAGS) {
    if (text.includes(normalize(tag)) && !tags.includes(tag)) tags.push(tag);
  }
  if (tags.length < 4 && /como|gu[ií]a|paso a paso|tutorial|aprende/i.test(text)) tags.push("tutorial");
  if (tags.length < 4 && /principiante|desde cero|introducci[oó]n|b[aá]sico/i.test(text)) tags.push("beginners");
  return Array.from(new Set(tags)).slice(0, 4);
}
