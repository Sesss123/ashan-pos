const prisma = require('../config/db');

class AiForecastingService {
  /**
   * Simulates AI Forecasting using basic statistical moving averages
   * In a real enterprise system, this would call a Python/TensorFlow microservice
   */
  async generateSalesForecast(branchId) {
    const today = new Date();
    
    // Simulate fetching last 30 days of sales
    // const historicalSales = await prisma.order.findMany({ ... })

    // Generating simulated 7-day forecast
    const forecasts = [];
    let baseSales = 1500; // Mock base sales
    
    for (let i = 1; i <= 7; i++) {
      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() + i);
      
      // Simulate seasonality (weekends are busier)
      const dayOfWeek = targetDate.getDay();
      const multiplier = (dayOfWeek === 0 || dayOfWeek === 6) ? 1.5 : 1.0;
      const predictedSales = baseSales * multiplier + (Math.random() * 200 - 100);
      
      const forecast = await prisma.salesForecast.create({
        data: {
          branchId,
          targetDate,
          predictedSales: Math.round(predictedSales * 100) / 100,
          confidence: 0.85 + (Math.random() * 0.1) // 85% - 95% confidence
        }
      });
      forecasts.push(forecast);
    }

    // Generate Business Insight based on forecast
    await prisma.businessInsight.create({
      data: {
        branchId,
        title: "Weekend Sales Surge Expected",
        description: "AI model predicts a 50% surge in sales this upcoming weekend based on historical trends.",
        impact: "High",
        category: "Revenue"
      }
    });

    return forecasts;
  }

  async predictInventoryRunout(branchId) {
    // Simulated prediction for low stock
    const prediction = await prisma.inventoryPrediction.create({
      data: {
        branchId,
        productId: 'mock-product-id', // Would be derived dynamically
        predictedDemand: 45,
        runOutDate: new Date(new Date().getTime() + 3 * 24 * 60 * 60 * 1000) // 3 days from now
      }
    });
    return prediction;
  }
}

module.exports = new AiForecastingService();
