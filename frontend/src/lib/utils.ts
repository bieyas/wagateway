import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date) {
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(date))
}

export function formatPhone(phone: string) {
  if (!phone) return '-'
  const p = phone.replace(/\D/g, '')
  if (p.startsWith('62')) return '+' + p
  return phone
}

export function truncate(str: string, max = 50) {
  if (!str) return ''
  return str.length > max ? str.slice(0, max) + '…' : str
}
