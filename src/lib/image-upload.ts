/** Client logo uploads: PNG / JPG / JPEG only. */
export const LOGO_ACCEPT = "image/png,image/jpeg,.png,.jpg,.jpeg";
export const LOGO_MAX_BYTES = 600_000;

const ALLOWED_MIME = new Set(["image/png", "image/jpeg", "image/jpg"]);
const ALLOWED_EXT = new Set([".png", ".jpg", ".jpeg"]);

export type LogoValidationResult = { ok: true } | { ok: false; message: string };

function fileExtension(name: string): string {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i).toLowerCase() : "";
}

function sniffImageType(bytes: Uint8Array): "png" | "jpg" | null {
  if (
    bytes.length >= 8
    && bytes[0] === 0x89
    && bytes[1] === 0x50
    && bytes[2] === 0x4e
    && bytes[3] === 0x47
    && bytes[4] === 0x0d
    && bytes[5] === 0x0a
    && bytes[6] === 0x1a
    && bytes[7] === 0x0a
  ) {
    return "png";
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "jpg";
  }
  return null;
}

export function validateLogoFile(file: File): LogoValidationResult {
  const ext = fileExtension(file.name);
  if (!ALLOWED_EXT.has(ext)) {
    return { ok: false, message: "Only PNG, JPG, and JPEG files are allowed." };
  }

  const mime = file.type.toLowerCase();
  if (mime && !ALLOWED_MIME.has(mime)) {
    return { ok: false, message: "Only PNG, JPG, and JPEG images are allowed." };
  }

  if (file.size > LOGO_MAX_BYTES) {
    return { ok: false, message: "Logo must be smaller than 600 KB." };
  }

  return { ok: true };
}

export async function validateLogoFileBytes(file: File): Promise<LogoValidationResult> {
  const basic = validateLogoFile(file);
  if (!basic.ok) return basic;

  const head = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  if (!sniffImageType(head)) {
    return { ok: false, message: "File content is not a valid PNG or JPEG image." };
  }

  return { ok: true };
}

export function validateLogoDataUrl(dataUrl: string | null | undefined): LogoValidationResult {
  if (!dataUrl) return { ok: true };

  const match = dataUrl.match(/^data:image\/(png|jpe?g);base64,([A-Za-z0-9+/=]+)$/i);
  if (!match) {
    return { ok: false, message: "Logo must be a PNG or JPEG image." };
  }

  const b64 = match[2];
  if (b64.length * 0.75 > LOGO_MAX_BYTES) {
    return { ok: false, message: "Logo must be smaller than 600 KB." };
  }

  try {
    const sample = atob(b64.slice(0, 32));
    const bytes = new Uint8Array(sample.length);
    for (let i = 0; i < sample.length; i++) bytes[i] = sample.charCodeAt(i);
    if (!sniffImageType(bytes)) {
      return { ok: false, message: "Logo file content is not a valid PNG or JPEG image." };
    }
  } catch {
    return { ok: false, message: "Invalid logo image data." };
  }

  return { ok: true };
}

export async function readLogoFileAsDataUrl(file: File): Promise<string> {
  const check = await validateLogoFileBytes(file);
  if (!check.ok) throw new Error(check.message);

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("Could not read the logo file."));
        return;
      }
      const dataCheck = validateLogoDataUrl(result);
      if (!dataCheck.ok) {
        reject(new Error(dataCheck.message));
        return;
      }
      resolve(result);
    };
    reader.onerror = () => reject(new Error("Could not read the logo file."));
    reader.readAsDataURL(file);
  });
}
