const jwt = require('jsonwebtoken');
import prisma from '../../config/db';

if (!process.env.JWT_SECRET) {
  console.error('CRITICAL ERROR: JWT_SECRET environment variable is missing.');
  process.exit(1);
}
const JWT_SECRET = process.env.JWT_SECRET;

// 1. Authenticate Token Middleware
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Access Denied: No Token Provided' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Check if token is blacklisted or session expired in DB
    const session = await prisma.session.findUnique({ where: { token } });
    if (!session || session.expiresAt < new Date()) {
      return res.status(401).json({ success: false, message: 'Session Expired or Invalid' });
    }

    req.user = decoded; // Attach user payload to request
    
    // SaaS Multi-Tenant: Run the rest of the request within the tenant context
    const { tenantContext } = require('./tenantContext');
    tenantContext.run(decoded.tenantId, () => {
      next();
    });
  } catch (err) {
    return res.status(403).json({ success: false, message: 'Invalid Token' });
  }
};

// 2. Role-Based Access Control (RBAC) Middleware - Legacy (Deprecated in favor of requirePermission)
const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      // Log Unauthorized Access Attempt
      prisma.auditLog.create({
        data: {
          userId: req.user?.id,
          action: 'UNAUTHORIZED_ACCESS_ATTEMPT',
          details: `Attempted to access ${req.originalUrl} without required roles: ${allowedRoles.join(',')}`,
          ipAddress: req.ip,
          tenant: req.user?.tenantId ? { connect: { id: req.user.tenantId } } : undefined
        } as any
      }).catch(console.error);

      return res.status(403).json({ success: false, message: 'Forbidden: Insufficient Privileges' });
    }
    next();
  };
};

// 3. Permission-Based Access Control Middleware (Dynamic RBAC)
const requirePermission = (requiredPermission) => {
  return (req, res, next) => {
    const userPerms = req.user?.permissions || [];
    
    // '*' means full Owner access
    if (!userPerms.includes('*') && !userPerms.includes(requiredPermission)) {
      prisma.auditLog.create({
        data: {
          userId: req.user?.id,
          action: 'UNAUTHORIZED_ACCESS_ATTEMPT',
          details: `Attempted to access ${req.originalUrl} without required permission: ${requiredPermission}`,
          ipAddress: req.ip,
          tenant: req.user?.tenantId ? { connect: { id: req.user.tenantId } } : undefined
        } as any
      }).catch(console.error);

      return res.status(403).json({ success: false, message: `Forbidden: Missing permission '${requiredPermission}'` });
    }
    next();
  };
};

// 3. DTO Validation Middleware (using generic schema validator)
const validateDTO = (schema) => {
  return (req, res, next) => {
    const { error } = schema.safeParse ? schema.safeParse(req.body) : { error: null }; // Zod support
    if (error) {
      return res.status(400).json({ success: false, message: 'Validation Error', details: error.errors });
    }
    next();
  };
};

module.exports = {
  authenticateToken,
  requireRole,
  requirePermission,
  validateDTO,
  JWT_SECRET
};

export {};
