import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateCustomerId(name: string, srNo: number): string {
  const cleanedName = name
    .toLowerCase()
    .replace(/\b(bhai|ben|kumar|kumari)\b/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
  return `${srNo}-${cleanedName}`;
}
