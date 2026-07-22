import { z } from 'zod';

export const productFormSchema = z.object({
  sku: z
    .string()
    .min(1, 'Ürün kodu zorunludur')
    .max(40, 'Ürün kodu en fazla 40 karakter olabilir'),
  name: z
    .string()
    .min(2, 'Ürün adı en az 2 karakter olmalıdır')
    .max(200, 'Ürün adı en fazla 200 karakter olabilir'),
  category: z.string().min(1, 'Kategori zorunludur').max(80),
  unit: z.string().min(1, 'Birim zorunludur').max(20),
  barcode: z.string().max(30).optional().or(z.literal('')),
  listPrice: z.coerce.number().min(0, 'Fiyat 0 veya üzeri olmalıdır'),
  vatRate: z.coerce.number().min(0).max(100),
  stockQuantity: z.coerce.number().min(0, 'Stok 0 veya üzeri olmalıdır'),
  isActive: z.boolean(),
});

export type ProductFormValues = z.infer<typeof productFormSchema>;
