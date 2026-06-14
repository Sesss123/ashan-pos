const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../all_api_tests.http');
let content = fs.readFileSync(filePath, 'utf8');

const payloads = {
  '/api/v1/auth/login': `{\n  "email": "admin@ashn.com",\n  "password": "password123"\n}`,
  '/api/v1/auth/register': `{\n  "name": "New User",\n  "email": "new@ashn.com",\n  "password": "password123",\n  "role": "Waiter"\n}`,
  '/api/v1/pos/orders': `{\n  "type": "Takeaway",\n  "items": [{ "productId": "REPLACE_ID", "quantity": 1, "price": 1500 }]\n}`,
  '/api/v1/admin/branches': `{\n  "name": "New Branch",\n  "location": "Colombo"\n}`,
  '/api/v1/menu/categories': `{\n  "name": "Desserts",\n  "isActive": true\n}`,
  '/api/v1/menu/products': `{\n  "categoryId": "REPLACE_ID",\n  "name": "Ice Cream",\n  "price": 500,\n  "stock": 20,\n  "isActive": true\n}`,
  '/api/v1/inventory/suppliers': `{\n  "name": "ABC Suppliers",\n  "contact": "0771234567"\n}`,
  '/api/v1/tables': `{\n  "name": "Table 1",\n  "capacity": 4\n}`,
  '/api/v1/customers': `{\n  "name": "Kasun",\n  "phone": "0770000000"\n}`,
  '/api/v1/pos/daily-closing/open': `{\n  "openingCash": 5000\n}`,
  '/api/v1/pos/daily-closing/close': `{\n  "shiftId": "REPLACE_ID",\n  "actualCash": 6000\n}`,
  'default': `{\n  "exampleField": "exampleValue"\n}`
};

const regex = /(POST|PUT|PATCH) (.*?)\nAuthorization: Bearer {{token}}\nContent-Type: application\/json\n\n\{\n  \/\/ Add payload here\n\}/g;

content = content.replace(regex, (match, method, endpoint) => {
  let matchedPayload = payloads.default;
  for (const key of Object.keys(payloads)) {
    if (endpoint.includes(key)) {
      matchedPayload = payloads[key];
      break;
    }
  }
  return `${method} ${endpoint}\nAuthorization: Bearer {{token}}\nContent-Type: application/json\n\n${matchedPayload}`;
});

fs.writeFileSync(filePath, content);
console.log('Successfully populated payloads in all_api_tests.http');
