import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Formats a weight/quantity with thousands separators and no unnecessary .0. */
export function formatQuantity(value: number): string {
  return value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 1 })
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
