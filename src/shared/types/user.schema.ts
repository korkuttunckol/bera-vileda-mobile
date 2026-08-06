import { z } from 'zod';
import { UserRole } from './role.types';

export const userFormSchema = z.object({
  userCode: z
    .string()
    .trim()
    .min(2, 'Kullanıcı adı en az 2 karakter olmalıdır.')
    .max(32, 'Kullanıcı adı en fazla 32 karakter olabilir.')
    .regex(/^[A-Za-z0-9_-]+$/, 'Yalnızca harf, rakam, _ ve - kullanılabilir.'),
  name: z
    .string()
    .trim()
    .min(2, 'Ad soyad en az 2 karakter olmalıdır.')
    .max(80, 'Ad soyad en fazla 80 karakter olabilir.'),
  phone: z.string().trim().max(30).optional().or(z.literal('')),
  email: z
    .string()
    .trim()
    .email('Geçerli bir e-posta girin.')
    .optional()
    .or(z.literal('')),
  description: z.string().trim().max(500).optional().or(z.literal('')),
  role: z.nativeEnum(UserRole),
  active: z.boolean(),
  password: z.string().optional().or(z.literal('')),
});

export type UserFormValues = z.infer<typeof userFormSchema>;

export const userPasswordSchema = z
  .object({
    password: z
      .string()
      .min(6, 'Şifre en az 6 karakter olmalıdır.')
      .max(72, 'Şifre en fazla 72 karakter olabilir.'),
    confirmPassword: z.string(),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: 'Şifreler eşleşmiyor.',
    path: ['confirmPassword'],
  });

export type UserPasswordValues = z.infer<typeof userPasswordSchema>;
