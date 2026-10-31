import { z } from 'zod';
import { emailSchema, newPasswordSchema } from './auth-schemas';

export const detailsSchema = z.object({
  name: z.string().trim().min(1, 'Enter your name'),
  email: emailSchema,
  phone: z
    .string()
    .trim()
    .regex(/^[+\d\s-]{0,20}$/, 'Enter a valid phone number'),
  company: z.string().trim(),
});

// Invoices copy these details when they are created (PRD 4.6).
export const billingSchema = z.object({
  address: z.string().trim().min(1, 'Enter your address'),
  city: z.string().trim().min(1, 'Enter your city'),
  state: z.string().trim().min(1, 'Enter your state'),
  postalCode: z
    .string()
    .trim()
    .regex(/^\d{6}$/, 'Enter a 6-digit PIN code'),
  gstin: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^$|^[0-9A-Z]{15}$/, 'GSTIN must be 15 characters'),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password'),
    newPassword: newPasswordSchema,
    confirmPassword: z.string().min(1, 'Confirm your new password'),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type DetailsValues = z.infer<typeof detailsSchema>;
export type BillingValues = z.infer<typeof billingSchema>;
export type ChangePasswordValues = z.infer<typeof changePasswordSchema>;
