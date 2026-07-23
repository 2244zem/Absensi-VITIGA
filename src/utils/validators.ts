export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isValidFileSize(size: number, maxMB: number = 5): boolean {
  return size <= maxMB * 1024 * 1024;
}

export function isValidImageType(type: string): boolean {
  return ['image/jpeg', 'image/png', 'image/webp'].includes(type);
}

export function isValidDocumentType(type: string): boolean {
  return ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(type);
}
