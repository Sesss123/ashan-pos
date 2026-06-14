import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/network/dio_client.dart';

class CashierRepository {
  final DioClient _dioClient;
  CashierRepository(this._dioClient);

  // Tables
  Future<List<dynamic>> getTables() async {
    try {
      final response = await _dioClient.dio.get('/pos/tables');
      return response.data['data'];
    } catch (e) {
      throw Exception('Failed to load tables: $e');
    }
  }

  Future<void> transferTable(String fromTableId, String toTableId, String orderId) async {
    try {
      await _dioClient.dio.post('/waiter/tables/transfer', data: {
        'fromTableId': fromTableId,
        'toTableId': toTableId,
        'orderId': orderId
      });
    } catch (e) {
      throw Exception('Failed to transfer table: $e');
    }
  }

  Future<void> mergeTables(String fromTableId, String toTableId, String orderId) async {
    try {
      await _dioClient.dio.post('/waiter/tables/merge', data: {
        'fromTableId': fromTableId,
        'toTableId': toTableId,
        'orderId': orderId
      });
    } catch (e) {
      throw Exception('Failed to merge tables: $e');
    }
  }

  // Customers
  Future<List<dynamic>> searchCustomers(String query) async {
    try {
      final response = await _dioClient.dio.get('/pos/customers/search', queryParameters: {'q': query});
      return response.data['data'];
    } catch (e) {
      throw Exception('Failed to search customers: $e');
    }
  }

  Future<List<dynamic>> getCustomerCreditHistory(String customerId) async {
    try {
      final response = await _dioClient.dio.get('/pos/customers/$customerId/credit');
      return response.data['data'];
    } catch (e) {
      throw Exception('Failed to load credit history: $e');
    }
  }

  Future<dynamic> addCustomerCredit(String customerId, double amount, String type, String notes) async {
    try {
      final response = await _dioClient.dio.post('/pos/customers/$customerId/credit', data: {
        'amount': amount,
        'type': type,
        'notes': notes,
      });
      return response.data['data'];
    } catch (e) {
      throw Exception('Failed to add credit: $e');
    }
  }

  // Receipts
  Future<List<dynamic>> getReceipts(Map<String, dynamic> filters) async {
    try {
      final response = await _dioClient.dio.get('/pos/receipts', queryParameters: filters);
      return response.data['data'];
    } catch (e) {
      throw Exception('Failed to load receipts: $e');
    }
  }

  // Daily Closing
  Future<Map<String, dynamic>?> getCurrentShift() async {
    try {
      final response = await _dioClient.dio.get('/pos/daily-closing/current');
      return response.data['data'];
    } catch (e) {
      throw Exception('Failed to load current shift: $e');
    }
  }

  Future<Map<String, dynamic>> createShift(String cashierId, double openingCash) async {
    try {
      final response = await _dioClient.dio.post('/pos/daily-closing/open', data: {
        'cashierId': cashierId,
        'openingCash': openingCash,
      });
      return response.data['data'];
    } catch (e) {
      throw Exception('Failed to create shift: $e');
    }
  }

  Future<Map<String, dynamic>> closeShift(String shiftId, double actualCash) async {
    try {
      final response = await _dioClient.dio.post('/pos/daily-closing/close', data: {
        'shiftId': shiftId,
        'actualCash': actualCash,
      });
      return response.data['data'];
    } catch (e) {
      throw Exception('Failed to close shift: $e');
    }
  }

  // Create Order (Checkout)
  Future<Map<String, dynamic>> createOrder(Map<String, dynamic> orderData) async {
    try {
      final response = await _dioClient.dio.post('/pos/create-sale', data: orderData);
      return response.data['data'];
    } catch (e) {
      throw Exception('Checkout failed: $e');
    }
  }

  // Refund Order
  Future<Map<String, dynamic>> refundOrder(String orderId) async {
    try {
      final response = await _dioClient.dio.post('/pos/orders/$orderId/refund');
      return response.data['data'];
    } catch (e) {
      throw Exception('Refund failed: $e');
    }
  }

  // Checkout Table (Grouped Checkout)
  Future<Map<String, dynamic>> checkoutTable(String tableId, Map<String, dynamic> checkoutData) async {
    try {
      final response = await _dioClient.dio.post('/pos/tables/$tableId/checkout', data: checkoutData);
      return response.data['data'];
    } catch (e) {
      throw Exception('Table checkout failed: $e');
    }
  }
}

final cashierRepositoryProvider = Provider((ref) => CashierRepository(ref.read(dioClientProvider)));
