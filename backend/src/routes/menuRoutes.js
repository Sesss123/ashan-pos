const express = require('express');
const { createCategory, getCategories, createProductWithVariants, getProducts } = require('../controllers/menuController');
const { authenticate } = require('../middlewares/authMiddleware');

const router = express.Router();

router.use(authenticate);

// Category Routes
router.post('/categories', createCategory);
router.get('/categories', getCategories);

// Product Routes (with Variants & Add-ons)
router.post('/products', createProductWithVariants);
router.get('/products', getProducts);

module.exports = router;
