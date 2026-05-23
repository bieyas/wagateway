export function normalizePhone(phone: string): string {
  let normalized = phone.replace(/[\s\-\(\)\+]/g, '');
  if (normalized.startsWith('0')) {
    normalized = '62' + normalized.slice(1);
  }
  return normalized;
}

export function toWhatsAppJid(phone: string, isGroup = false): string {
  const normalized = normalizePhone(phone);
  return isGroup ? `${normalized}@g.us` : `${normalized}@s.whatsapp.net`;
}

export function fromWhatsAppJid(jid: string): string {
  return jid.replace(/@s\.whatsapp\.net$/, '').replace(/@g\.us$/, '');
}
