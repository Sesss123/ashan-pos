// Simulating Joi validation for our restricted environment without actual Joi package installed.
// In a real production build: const Joi = require('joi');

const validateRequest = (schema) => {
  return (req, res, next) => {
    // Mock Validation Implementation
    // If we had Joi, we would do:
    // const { error } = schema.validate(req.body);
    // if (error) throw new Error('ValidationError');
    
    // For now, we manually check if schema defined required fields are missing
    if (schema.required) {
      for (const field of schema.required) {
        if (!req.body[field]) {
          return res.status(400).json({
            status: 'error',
            message: 'Invalid Input Data',
            details: `Field '${field}' is required.`
          });
        }
      }
    }
    
    next();
  };
};

module.exports = validateRequest;
