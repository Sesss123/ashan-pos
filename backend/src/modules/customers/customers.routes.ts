import { Router } from 'express';
const router = Router();
const customersController = require('./customers.controller');
const { authenticateToken, requireRole } = require('../../shared/middlewares/security');

router.use(authenticateToken);

// Search is accessible to Cashier, Admin, Manager (needed for credit billing at POS)
router.get('/search', requireRole(['Admin', 'Manager', 'Cashier']), customersController.searchCustomer);

// Full customer management is Admin + Manager only
router.use(requireRole(['Admin', 'Manager']));
router.get('/', customersController.getCustomers);
router.post('/', customersController.createCustomer);
router.put('/:id', customersController.updateCustomer);
router.delete('/:id', customersController.deleteCustomer);
router.post('/:id/credit', customersController.addCreditHistory);

export default router;
