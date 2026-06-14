import '../../../../core/utils/app_currency.dart';
import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:intl/intl.dart';
import '../../../../core/realtime/socket_service.dart';
import '../../../../core/network/dio_client.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

enum QrPaymentState {
  waiting,
  processing,
  success,
  failed,
  cancelled
}

class QrPaymentView extends ConsumerStatefulWidget {
  final double subtotal;
  final double discount;
  final double tax;
  final double serviceCharge;
  final double grandTotal;
  final String orderNumber;
  final String cashierName;
  final VoidCallback onPaymentSuccess;
  final VoidCallback onCancel;

  const QrPaymentView({
    super.key,
    required this.subtotal,
    required this.discount,
    required this.tax,
    required this.serviceCharge,
    required this.grandTotal,
    required this.orderNumber,
    required this.cashierName,
    required this.onPaymentSuccess,
    required this.onCancel,
  });

  @override
  ConsumerState<QrPaymentView> createState() => _QrPaymentViewState();
}

class _QrPaymentViewState extends ConsumerState<QrPaymentView> {
  QrPaymentState _paymentState = QrPaymentState.waiting;
  String _transactionId = '';
  String _failureReason = '';
  String _invoiceNumber = '';

  
  // Timer
  Timer? _countdownTimer;
  int _secondsRemaining = 300; // 5 minutes

  @override
  void initState() {
    super.initState();
    _invoiceNumber = 'INV-${DateTime.now().year}-${DateTime.now().millisecondsSinceEpoch.toString().substring(5)}';
    _startTimer();
    _setupSockets();
    _generateQrFromBackend();
  }

  Future<void> _generateQrFromBackend() async {
    try {
      final dio = ref.read(dioClientProvider).dio;
      final res = await dio.post('/payments/generate-qr', data: {
        'orderId': widget.orderNumber,
        'amount': widget.grandTotal
      });
      if (mounted) {
        setState(() {

          _transactionId = res.data['paymentIntentId'] ?? '';
        });
      }
    } catch (e) {
      debugPrint('Failed to generate QR: $e');
    }
  }

  void _startTimer() {
    _countdownTimer?.cancel();
    _secondsRemaining = 300;
    _countdownTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (_secondsRemaining > 0) {
        setState(() => _secondsRemaining--);
      } else {
        _countdownTimer?.cancel();
        if (mounted) _handleQrExpired();
      }
    });
  }

  void _handleQrExpired() {
    if (_paymentState == QrPaymentState.waiting) {
       _generateNewQr();
    }
  }

  void _generateNewQr() {
    setState(() {
      _paymentState = QrPaymentState.waiting;
      _invoiceNumber = 'INV-${DateTime.now().year}-${DateTime.now().millisecondsSinceEpoch.toString().substring(5)}';
      _startTimer();
    });
  }

  void _setupSockets() {
    socketService.on('payment.processing', (data) {
      if (mounted && _paymentState == QrPaymentState.waiting) {
        setState(() => _paymentState = QrPaymentState.processing);
      }
    });

    socketService.on('payment.success', (data) {
      if (mounted) {
        setState(() {
          _paymentState = QrPaymentState.success;
          _transactionId = data['transactionId'] ?? 'TXN-${DateTime.now().millisecondsSinceEpoch}';
        });
        _countdownTimer?.cancel();
      }
    });

    socketService.on('payment.failed', (data) {
      if (mounted) {
        setState(() {
          _paymentState = QrPaymentState.failed;
          _failureReason = data['reason'] ?? 'Payment declined by bank.';
        });
        _countdownTimer?.cancel();
      }
    });
  }



  @override
  void dispose() {
    _countdownTimer?.cancel();
    socketService.off('payment.processing');
    socketService.off('payment.success');
    socketService.off('payment.failed');
    super.dispose();
  }

  String get _formattedTime {
    int minutes = _secondsRemaining ~/ 60;
    int seconds = _secondsRemaining % 60;
    return '${minutes.toString().padLeft(2, '0')}:${seconds.toString().padLeft(2, '0')}';
  }

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    if (_paymentState == QrPaymentState.success) {
      return _buildSuccessScreen(colorScheme);
    }
    if (_paymentState == QrPaymentState.failed) {
      return _buildFailureScreen(colorScheme);
    }

    return LayoutBuilder(
      builder: (context, constraints) {
        final isMobile = constraints.maxWidth < 500;
        
        final rightColumn = Column(
          children: [
            // SECTION 3: LARGE QR CODE
            _buildQrCode(colorScheme),
            const SizedBox(height: 16),
            
            // SECTION 6: COUNTDOWN TIMER
            if (_paymentState == QrPaymentState.waiting)
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.timer_outlined, color: Colors.white60, size: 16),
                  const SizedBox(width: 6),
                  Text(
                    'QR Expires In $_formattedTime',
                    style: const TextStyle(color: Colors.white60, fontWeight: FontWeight.bold),
                  ),
                ],
              ),

            const SizedBox(height: 16),
            
            // SECTION 5: PAYMENT STATUS
            _buildPaymentStatus(colorScheme),
            const SizedBox(height: 24),

            // SECTION 4: SUPPORTED PAYMENTS
            _buildSupportedPayments(),
          ],
        );

        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // SECTION 1: PAYMENT HEADER
            _buildHeader(isMobile),
            const SizedBox(height: 24),

            if (isMobile) ...[
              _buildAmountSummary(colorScheme),
              const SizedBox(height: 24),
              rightColumn,
            ] else
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Left Column: Details & Amount Summary
                  Expanded(
                    flex: 5,
                    child: _buildAmountSummary(colorScheme),
                  ),
                  const SizedBox(width: 24),
                  // Right Column: QR & Status
                  Expanded(
                    flex: 5,
                    child: rightColumn,
                  ),
                ],
              )
          ],
        );
      }
    );
  }

  Widget _buildHeader(bool isMobile) {
    final now = DateFormat('MMM dd, yyyy - hh:mm a').format(DateTime.now());
    
    final leftInfo = Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Online QR Payment', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Colors.white)),
        const SizedBox(height: 4),
        Text('Cashier: ${widget.cashierName} • $now', style: const TextStyle(color: Colors.white54, fontSize: 13)),
      ],
    );
    
    final rightInfo = Column(
      crossAxisAlignment: isMobile ? CrossAxisAlignment.start : CrossAxisAlignment.end,
      children: [
        Text('Invoice #$_invoiceNumber', style: const TextStyle(fontWeight: FontWeight.w600, color: Colors.white70)),
        Text('Order #${widget.orderNumber}', style: const TextStyle(fontWeight: FontWeight.w600, color: Colors.white70)),
      ],
    );

    return Container(
      padding: const EdgeInsets.only(bottom: 16),
      decoration: const BoxDecoration(
        border: Border(bottom: BorderSide(color: Colors.white10)),
      ),
      child: isMobile 
        ? Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              leftInfo,
              const SizedBox(height: 12),
              rightInfo,
            ],
          )
        : Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(child: leftInfo),
              const SizedBox(width: 16),
              rightInfo,
            ],
          ),
    );
  }

  Widget _buildAmountSummary(ColorScheme colorScheme) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.03),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white.withValues(alpha: 0.08)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text('Amount Summary', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white)),
          const SizedBox(height: 16),
          _buildSummaryRow('Subtotal', widget.subtotal),
          if (widget.discount > 0) _buildSummaryRow('Discount', -widget.discount, color: Colors.redAccent),
          _buildSummaryRow('Tax', widget.tax),
          if (widget.serviceCharge > 0) _buildSummaryRow('Service Charge', widget.serviceCharge),
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 12),
            child: Divider(color: Colors.white10),
          ),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('Grand Total', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white)),
              Text(
                AppCurrency.format(widget.grandTotal),
                style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: colorScheme.primary),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildSummaryRow(String label, double amount, {Color color = Colors.white70}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(color: Colors.white60, fontSize: 14)),
          Text(amount < 0 ? '-${AppCurrency.format(amount.abs())}' : AppCurrency.format(amount), style: TextStyle(color: color, fontSize: 14, fontWeight: FontWeight.w500)),
        ],
      ),
    );
  }

  Widget _buildQrCode(ColorScheme colorScheme) {
    return GestureDetector(
      onTap: () {
        if (_paymentState == QrPaymentState.waiting || _paymentState == QrPaymentState.processing) {
          setState(() {
            _paymentState = QrPaymentState.success;
            _transactionId = 'TXN-${DateTime.now().millisecondsSinceEpoch}';
          });
          _countdownTimer?.cancel();
          Future.delayed(const Duration(milliseconds: 1500), () {
            if (mounted) widget.onPaymentSuccess();
          });
        }
      },
      child: Container(
        width: 200,
        height: 200,
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(20),
          boxShadow: [
            BoxShadow(
              color: colorScheme.primary.withValues(alpha: 0.4),
              blurRadius: 30,
              spreadRadius: 2,
            ),
          ],
        ),
        child: CustomPaint(
          painter: _QrPainter(),
        ),
      ).animate(target: _paymentState == QrPaymentState.processing ? 1 : 0)
       .shimmer(duration: const Duration(seconds: 2), color: colorScheme.primary.withValues(alpha: 0.5)),
    );
  }

  Widget _buildPaymentStatus(ColorScheme colorScheme) {
    IconData icon;
    Color color;
    String text;

    if (_paymentState == QrPaymentState.waiting) {
      icon = Icons.qr_code_scanner;
      color = Colors.orangeAccent;
      text = 'Waiting for Payment...';
    } else {
      icon = Icons.hourglass_top;
      color = colorScheme.primary;
      text = 'Processing Payment...';
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(30),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, color: color, size: 20).animate(onPlay: (c) => c.repeat()).rotate(duration: const Duration(seconds: 2)),
          const SizedBox(width: 8),
          Text(text, style: TextStyle(color: color, fontWeight: FontWeight.bold)),
        ],
      ),
    );
  }

  Widget _buildSupportedPayments() {
    return Column(
      children: [
        const Text('Supports', style: TextStyle(color: Colors.white54, fontSize: 12)),
        const SizedBox(height: 8),
        Wrap(
          spacing: 12,
          runSpacing: 12,
          alignment: WrapAlignment.center,
          children: [
            _buildPaymentBadge(Icons.apple, 'Apple Pay'),
            _buildPaymentBadge(Icons.g_mobiledata, 'Google Pay'),
            _buildPaymentBadge(Icons.account_balance, 'Bank QR'),
            _buildPaymentBadge(Icons.currency_rupee, 'UPI'),
          ],
        )
      ],
    );
  }

  Widget _buildPaymentBadge(IconData icon, String label) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.05),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Colors.white10),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 16, color: Colors.white70),
          const SizedBox(width: 4),
          Text(label, style: const TextStyle(color: Colors.white70, fontSize: 11, fontWeight: FontWeight.bold)),
        ],
      ),
    );
  }

  Widget _buildSuccessScreen(ColorScheme colorScheme) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 100,
              height: 100,
              decoration: BoxDecoration(
                color: Colors.green.withValues(alpha: 0.1),
                shape: BoxShape.circle,
                border: Border.all(color: Colors.green, width: 2),
              ),
              child: const Icon(Icons.check_rounded, color: Colors.green, size: 60),
            ).animate().scale(duration: const Duration(milliseconds: 600), curve: Curves.elasticOut),
            const SizedBox(height: 24),
            const Text('Payment Successful!', style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: Colors.white)),
            const SizedBox(height: 8),
            Text('Amount Paid: ${AppCurrency.format(widget.grandTotal)}', style: TextStyle(fontSize: 18, color: Colors.white.withValues(alpha: 0.9))),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
              decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.05), borderRadius: BorderRadius.circular(12)),
              child: Column(
                children: [
                  Text('Transaction ID: $_transactionId', style: const TextStyle(color: Colors.white70, fontFamily: 'monospace')),
                  const SizedBox(height: 4),
                  Text('Date: ${DateFormat('MMM dd, yyyy - hh:mm a').format(DateTime.now())}', style: const TextStyle(color: Colors.white54, fontSize: 12)),
                  const SizedBox(height: 4),
                  const Text('Method: Online QR', style: TextStyle(color: Colors.white54, fontSize: 12)),
                ],
              ),
            ),
            const SizedBox(height: 32),
            Wrap(
              alignment: WrapAlignment.center,
              spacing: 16,
              runSpacing: 16,
              children: [
                OutlinedButton.icon(
                  onPressed: () {},
                  icon: const Icon(Icons.receipt_long),
                  label: const Text('Print Receipt'),
                  style: OutlinedButton.styleFrom(padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16), foregroundColor: Colors.white),
                ),
                OutlinedButton.icon(
                  onPressed: () {},
                  icon: const Icon(Icons.send),
                  label: const Text('Send Receipt'),
                  style: OutlinedButton.styleFrom(padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16), foregroundColor: Colors.white),
                ),
              ],
            ),
            const SizedBox(height: 16),
            Wrap(
              alignment: WrapAlignment.center,
              spacing: 16,
              runSpacing: 16,
              children: [
                ElevatedButton(
                  onPressed: widget.onCancel,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.white.withValues(alpha: 0.1),
                    padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 16),
                  ),
                  child: const Text('Back To POS'),
                ),
                ElevatedButton(
                  onPressed: widget.onPaymentSuccess,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: colorScheme.primary,
                    padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 16),
                  ),
                  child: const Text('New Order'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFailureScreen(ColorScheme colorScheme) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 100,
              height: 100,
              decoration: BoxDecoration(
                color: Colors.redAccent.withValues(alpha: 0.1),
                shape: BoxShape.circle,
                border: Border.all(color: Colors.redAccent, width: 2),
              ),
              child: const Icon(Icons.close_rounded, color: Colors.redAccent, size: 60),
            ).animate().shake(duration: const Duration(milliseconds: 500)),
            const SizedBox(height: 24),
            const Text('Payment Failed', style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: Colors.white)),
            const SizedBox(height: 8),
            Text('Reason: $_failureReason', style: TextStyle(fontSize: 16, color: Colors.redAccent.withValues(alpha: 0.8))),
            const SizedBox(height: 32),
            Wrap(
              alignment: WrapAlignment.center,
              spacing: 16,
              runSpacing: 16,
              children: [
                OutlinedButton.icon(
                  onPressed: widget.onCancel,
                  icon: const Icon(Icons.arrow_back),
                  label: const Text('Back To POS'),
                  style: OutlinedButton.styleFrom(padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16), foregroundColor: Colors.white),
                ),
                ElevatedButton.icon(
                  onPressed: _generateNewQr,
                  icon: const Icon(Icons.refresh),
                  label: const Text('Generate New QR'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: colorScheme.primary,
                    padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _QrPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = Colors.black
      ..style = PaintingStyle.fill;

    // Outer boxes
    canvas.drawRect(const Rect.fromLTWH(0, 0, 45, 45), paint);
    canvas.drawRect(const Rect.fromLTWH(5, 5, 35, 35), Paint()..color = Colors.white);
    canvas.drawRect(const Rect.fromLTWH(12, 12, 21, 21), paint);

    canvas.drawRect(Rect.fromLTWH(size.width - 45, 0, 45, 45), paint);
    canvas.drawRect(Rect.fromLTWH(size.width - 40, 5, 35, 35), Paint()..color = Colors.white);
    canvas.drawRect(Rect.fromLTWH(size.width - 33, 12, 21, 21), paint);

    canvas.drawRect(Rect.fromLTWH(0, size.height - 45, 45, 45), paint);
    canvas.drawRect(Rect.fromLTWH(5, size.height - 40, 35, 35), Paint()..color = Colors.white);
    canvas.drawRect(Rect.fromLTWH(12, size.height - 33, 21, 21), paint);

    final rng = List.generate(40, (i) => i * i % 23);
    for (int i = 0; i < size.width; i += 10) {
      for (int j = 0; j < size.height; j += 10) {
        if (i < 45 && j < 45) continue;
        if (i > size.width - 45 && j < 45) continue;
        if (i < 45 && j > size.height - 45) continue;

        if ((rng[(i + j) ~/ 10 % rng.length] + i + j) % 3 == 0) {
          canvas.drawRect(Rect.fromLTWH(i.toDouble(), j.toDouble(), 7, 7), paint);
        }
      }
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
