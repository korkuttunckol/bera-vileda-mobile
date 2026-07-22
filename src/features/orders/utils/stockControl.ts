export function isProductOutOfStock(product: { stockQuantity: number }): boolean {
  return product.stockQuantity <= 0;
}
