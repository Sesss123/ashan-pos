const authService = require('./auth.service');

class AuthController {
  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      const ipAddress = req.ip;
      const userAgent = req.headers['user-agent'] || 'Unknown';

      const result = await authService.login(email, password, ipAddress, userAgent);
      
      res.json({ success: true, message: 'Login successful', data: result });
    } catch (error) {
      // Pass generic 401 for auth failures to prevent enumeration, or 400
      res.status(401).json({ success: false, message: error.message });
    }
  }

  async logout(req, res, next) {
    try {
      // Logout logic (e.g., delete session from DB) would go here via service
      res.json({ success: true, message: 'Logout successful' });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AuthController();
