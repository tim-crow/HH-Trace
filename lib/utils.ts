import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

let idCounter = 0

export function generateId(prefix: string): string {
  idCounter++
  return `${prefix}${Date.now()}-${idCounter}`
}
