import { z } from 'zod';

export const customerFormSchema = z.object({
  code: z
    .string()
    .min(1, 'Cari kodu zorunludur')
    .max(30, 'Cari kodu en fazla 30 karakter olabilir'),
  name: z
    .string()
    .min(2, 'Müşteri adı en az 2 karakter olmalıdır')
    .max(200, 'Müşteri adı en fazla 200 karakter olabilir'),
  taxNumber: z.string().max(20).optional().or(z.literal('')),
  contactPerson: z.string().max(100).optional().or(z.literal('')),
  phone: z.string().max(20).optional().or(z.literal('')),
  email: z.string().email('Geçerli bir e-posta girin').optional().or(z.literal('')),
  city: z.string().max(50).optional().or(z.literal('')),
  district: z.string().max(50).optional().or(z.literal('')),
  fullAddress: z.string().max(300).optional().or(z.literal('')),
  isActive: z.boolean(),
});

export const branchFormSchema = z.object({
  name: z
    .string()
    .min(1, 'Şube adı zorunludur')
    .max(100, 'Şube adı en fazla 100 karakter olabilir'),
  address: z.string().max(300).optional().or(z.literal('')),
  phone: z.string().max(20).optional().or(z.literal('')),
  contactPerson: z.string().max(100).optional().or(z.literal('')),
  isActive: z.boolean(),
});

export type CustomerFormValues = z.infer<typeof customerFormSchema>;
export type BranchFormValues = z.infer<typeof branchFormSchema>;
