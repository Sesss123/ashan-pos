const authService = require('./auth.service');

class AuthController {
  async login(req, res, next) {
    try {
      const { email: rawEmail, password } = req.body;
      const email = rawEmail?.trim().toLowerCase();
      const ipAddress = req.ip || req.connection?.remoteAddress || '127.0.0.1';
      const userAgent = req.headers['user-agent'] || 'Unknown';

      const result = await authService.login(email, password, ipAddress, userAgent);
      
      res.json({ success: true, message: 'Login successful', data: result });
    } catch (error) {
      console.error('Login Error:', error);
      
      if (req.io && error.message && error.message.includes('Invalid credentials')) {
        const failedEmail = req.body.email?.trim().toLowerCase() || 'Unknown';
        const failedIp = req.ip || req.connection?.remoteAddress || '127.0.0.1';

        require('../notifications/notifications.controller').sendNotification({
          message: `Failed login attempt for email: ${failedEmail} from IP: ${failedIp}`,
          category: 'Security',
          priority: 'High',
          io: req.io
        });
      }

      // Pass generic 401 for auth failures to prevent enumeration, or 400
      res.status(401).json({ success: false, message: error.message });
    }
  }

  async logout(req, res, next) {
    try {
      res.json({ success: true, message: 'Logout successful' });
    } catch (error) {
      next(error);
    }
  }

  async register(req, res, next) {
    try {
      const { companyName, userName, email, password } = req.body;
      const ipAddress = req.ip;
      const result = await authService.register(companyName, userName, email, password, ipAddress);
      res.json({ success: true, message: 'Tenant successfully registered', data: result });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async forgotPassword(req, res, next) {
    try {
      const { email } = req.body;
      const result = await authService.forgotPassword(email);
      res.json(result);
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async resetPassword(req, res, next) {
    try {
      const { token, newPassword } = req.body;
      const result = await authService.resetPassword(token, newPassword);
      res.json(result);
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
}

module.exports = new AuthController();
