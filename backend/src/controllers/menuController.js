const prisma = require('../config/db');

// ---- CATEGORY MANAGEMENT ----

const createCategory = async (req, res) => {
  try {
    const { branchId, name, description, image, status, sortOrder } = req.body;
    const category = await prisma.category.create({
      data: { branchId, name, description, image, status, sortOrder }
    });
    res.status(201).json({ message: 'Category created', category });
  } catch (error) {
    res.status(500).json({ message: 'Failed to create category', error: error.message });
  }
};

const getCategories = async (req, res) => {
  try {
    const { branchId } = req.query;
    const categories = await prisma.category.findMany({
      where: { branchId },
      orderBy: { sortOrder: 'asc' }
    });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch categories' });
  }
};

// ---- MENU (PRODUCT) MANAGEMENT ----

const createProductWithVariants = async (req, res) => {
  try {
    const { branchId, categoryId, name, sku, barcode, description, price, cost, unit, reorderLevel, isAvailable, isCombo, image, variants, addons, images } = req.body;
    
    // We create the product and its nested relationships in a single transaction
    const product = await prisma.product.create({
      data: {
        branchId, categoryId, name, sku, barcode, description, price, cost, unit, reorderLevel, isAvailable, isCombo, image,
        variants: {
          create: variants || []
        },
        addons: {
          create: addons || []
        },
        images: {
          create: images || []
        }
      },
      include: {
        variants: true,
        addons: true,
        images: true
      }
    });

    res.status(201).json({ message: 'Product created successfully', product });
  } catch (error) {
    res.status(500).json({ message: 'Failed to create product', error: error.message });
  }
};

const getProducts = async (req, res) => {
  try {
    const { branchId, categoryId } = req.query;
    
    let whereClause = { branchId };
    if (categoryId) whereClause.categoryId = categoryId;

    const products = await prisma.product.findMany({
      where: whereClause,
      include: {
        categoryRel: true,
        variants: true,
        addons: true,
        images: { orderBy: { sortOrder: 'asc' } }
      }
    });

    res.json(products);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch products' });
  }
};

module.exports = {
  createCategory,
  getCategories,
  createProductWithVariants,
  getProducts
};
