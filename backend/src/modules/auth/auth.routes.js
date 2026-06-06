const express = require('express');
const router = express.Router();

router.post('/login', (req, res) => res.json({ message: 'Login successful' }));
router.post('/logout', (req, res) => res.json({ message: 'Logout successful' }));
router.post('/refresh', (req, res) => res.json({ message: 'Token refreshed' }));
router.get('/profile', (req, res) => res.json({ message: 'User profile fetched' }));

module.exports = router;
