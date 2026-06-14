const menuSocketEmitter = require('../realtime/socketEmitter');

// ---- CATEGORY MANAGEMENT ----

const createCategory = async (req, res) => {
  try {
    const { name, isActive } = req.body;
    const category = await req.prisma.category.create({
      data: { name, isActive: isActive ?? true }
    });
    // Emit real-time event
    menuSocketEmitter.menu.categoryCreated(req.io, category);
    res.status(201).json({ message: 'Category created', category });
  } catch (error) {
    res.status(500).json({ message: 'Failed to create category', error: error.message });
  }
};

const getCategories = async (req, res) => {
  try {
    const categories = await req.prisma.category.findMany({
      where: { isDeleted: false }
    });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch categories', error: error.message });
  }
};

const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, isActive } = req.body;
    const category = await req.prisma.category.update({
      where: { id },
      data: { name, isActive }
    });
    // Emit real-time event
    menuSocketEmitter.menu.categoryUpdated(req.io, category);
    res.json({ message: 'Category updated', category });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update category', error: error.message });
  }
};

const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    await req.prisma.category.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date() }
    });
    // Emit real-time event
    menuSocketEmitter.menu.categoryDeleted(req.io, id);
    res.json({ message: 'Category deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete category', error: error.message });
  }
};

// ---- MENU (PRODUCT) MANAGEMENT ----

const createProduct = async (req, res) => {
  try {
    const { categoryId, name, price, stock, barcode, isActive, requiresKitchen } = req.body;
    const product = await req.prisma.product.create({
      data: { categoryId, name, price, stock: stock || 0, barcode, isActive: isActive ?? true, requiresKitchen: requiresKitchen ?? true }
    });
    // Emit real-time event
    menuSocketEmitter.menu.productCreated(req.io, product);
    res.status(201).json({ message: 'Product created successfully', product });
  } catch (error) {
    res.status(500).json({ message: 'Failed to create product', error: error.message });
  }
};

const getProducts = async (req, res) => {
  try {
    const { categoryId } = req.query;
    
    let whereClause: any = { isDeleted: false };
    if (categoryId) whereClause.categoryId = categoryId;

    const products = await req.prisma.product.findMany({
      where: whereClause,
      include: {
        category: true
      }
    });

    res.json(products);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch products', error: error.message });
  }
};

const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { categoryId, name, price, stock, barcode, isActive, requiresKitchen } = req.body;
    const product = await req.prisma.product.update({
      where: { id },
      data: { categoryId, name, price, stock, barcode, isActive, requiresKitchen }
    });
    // Emit real-time event
    menuSocketEmitter.menu.productUpdated(req.io, product);
    res.json({ message: 'Product updated', product });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update product', error: error.message });
  }
};

const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    await req.prisma.product.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date() }
    });
    // Emit real-time event
    menuSocketEmitter.menu.productDeleted(req.io, id);
    res.json({ message: 'Product deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete product', error: error.message });
  }
};

module.exports = {
  createCategory,
  getCategories,
  updateCategory,
  deleteCategory,
  createProduct,
  getProducts,
  updateProduct,
  deleteProduct
};
