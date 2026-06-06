const { z } = require('zod');

const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters')
});

const createOrderSchema = z.object({
  type: z.enum(['Dining', 'Takeaway', 'Delivery']),
  items: z.array(z.object({
    productId: z.string().uuid(),
    quantity: z.number().int().positive(),
    price: z.number().positive()
  })).min(1, 'Order must contain at least one item'),
  total: z.number().positive(),
  paymentMethod: z.enum(['Cash', 'Card']).optional()
});

const updateKitchenStatusSchema = z.object({
  orderId: z.string().uuid(),
  status: z.enum(['Pending', 'Preparing', 'Ready', 'Completed'])
});

const createDiningOrderSchema = z.object({
  tableId: z.string().uuid(),
  items: z.array(z.object({
    productId: z.string().uuid(),
    quantity: z.number().int().positive(),
    price: z.number().positive()
  })).min(1)
});

module.exports = {
  loginSchema,
  createOrderSchema,
  updateKitchenStatusSchema,
  createDiningOrderSchema
};
