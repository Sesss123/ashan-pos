const { z } = require('zod');

// Auth Schemas
const loginSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
  deviceId: z.string().optional(),
  deviceName: z.string().optional(),
});

// Branch Transfer Schema
const branchTransferSchema = z.object({
  fromBranchId: z.string().uuid({ message: "Invalid Source Branch ID" }),
  toBranchId: z.string().uuid({ message: "Invalid Destination Branch ID" }),
  dispatchedBy: z.string().min(1, { message: "Dispatched By is required" }),
  items: z.array(z.object({
    productId: z.string().uuid({ message: "Invalid Product ID" }),
    quantity: z.number().int().positive({ message: "Quantity must be a positive number" }),
  })).min(1, { message: "At least one item is required for transfer" })
});

// Branch Config Schema
const updateBranchConfigSchema = z.object({
  taxRate: z.number().min(0).max(100).optional(),
  currency: z.string().length(3).optional(),
  timezone: z.string().optional(),
  isActive: z.boolean().optional()
});

module.exports = {
  loginSchema,
  branchTransferSchema,
  updateBranchConfigSchema
};
