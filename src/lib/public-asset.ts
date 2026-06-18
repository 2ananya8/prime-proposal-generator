/** Public folder URL with Vite `base` (required for GitHub Pages subdirectory deploys). */
export function publicAsset(path: string): string {
  const base = import.meta.env.BASE_URL;
  const cleaned = path.replace(/^\//, "");
  return `${base}${cleaned}`;
}
