import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Formats a weight/quantity with thousands separators and no unnecessary .0. */
export function formatQuantity(value: number): string {
  return value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 1 })
}

/** Formats stored ISO dates consistently without shifting date-only values across time zones. */
export function formatDate(value: string | null | undefined): string {
  if (!value) return "—"
  const isoDate = value.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (isoDate) {
    const [, year, month, day] = isoDate
    const monthName = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"][Number(month) - 1]
    return monthName ? `${day}-${monthName}-${year}` : value
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  const day = String(date.getDate()).padStart(2, "0")
  const month = date.toLocaleString("en-AU", { month: "short" }).toUpperCase()
  return `${day}-${month}-${date.getFullYear()}`
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return `${formatDate(value)} ${date.toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" })}`
}

/** Normalizes a user-entered weight/quantity at a persistence boundary. */
export function roundQuantity(value: number): number {
  return Math.round((value + Number.EPSILON) * 10) / 10
}

let idCounter = 0

export function generateId(prefix: string): string {
  idCounter++
  return `${prefix}${Date.now()}-${idCounter}`
}
