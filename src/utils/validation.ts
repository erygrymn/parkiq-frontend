import { z } from "zod";

export const emailSchema = z.string().email("Invalid email address");

export const requiredStringSchema = z.string().min(1, "This field is required");

export function validateEmail(email: string): boolean {
  return emailSchema.safeParse(email).success;
}

export function validateRequired(value: string): boolean {
  return requiredStringSchema.safeParse(value).success;
}

