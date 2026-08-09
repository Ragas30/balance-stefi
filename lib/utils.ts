import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { z } from "zod";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export function getZodIssueMessage(error: z.ZodError, fallback = "Validasi input gagal."): string {
  return error.issues.length ? error.issues.map((issue) => issue.message).join(", ") : fallback;
}
