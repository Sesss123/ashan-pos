import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'providers/branch_provider.dart';

class MultiBranchDashboardScreen extends ConsumerStatefulWidget {
  const MultiBranchDashboardScreen({super.key});

  @override
  ConsumerState<MultiBranchDashboardScreen> createState() =>
      _MultiBranchDashboardScreenState();
}

class _MultiBranchDashboardScreenState
    extends ConsumerState<MultiBranchDashboardScreen> {
  @override
  void initState() {
    super.initState();
    // Start fetching branches and listen to real-time socket events
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(branchListProvider.notifier).listenToSocket();
    });
  }

  // ─── Add Branch Dialog ──────────────────────────────────────────────────────
  void _showAddBranchDialog() {
    final nameCtrl = TextEditingController();
    final locationCtrl = TextEditingController();
    final contactCtrl = TextEditingController();
    final formKey = GlobalKey<FormState>();
    bool isLoading = false;
    Map<String, dynamic>? createdCredentials;

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setStateDialog) => AlertDialog(
          backgroundColor:
              Theme.of(context).cardTheme.color ?? Theme.of(context).colorScheme.surface,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          title: Text(
            createdCredentials == null ? 'Add New Branch' : 'Branch Created!',
            style: GoogleFonts.inter(fontWeight: FontWeight.w800),
          ),
          content: SizedBox(
            width: 440,
            child: createdCredentials != null
                // ── Success: Show generated credentials ──
                ? Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _credentialCard(
                        'Cashier Credentials',
                        createdCredentials!['cashier']['email'],
                        createdCredentials!['cashier']['password'],
                      ),
                      const SizedBox(height: 12),
                      _credentialCard(
                        'Waiter Credentials',
                        createdCredentials!['waiter']['email'],
                        createdCredentials!['waiter']['password'],
                      ),
                      const SizedBox(height: 12),
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: Colors.amber.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: Colors.amber.withValues(alpha: 0.4)),
                        ),
                        child: Row(
                          children: [
                            const Icon(Icons.warning_amber, color: Colors.amber, size: 20),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                'Save these credentials now — they won\'t be shown again.',
                                style: GoogleFonts.inter(fontSize: 13, color: Colors.amber[800]),
                              ),
                            )
                          ],
                        ),
                      )
                    ],
                  )
                // ── Form: Enter branch details ──
                : Form(
                    key: formKey,
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        _buildField(nameCtrl, 'Branch Name *', Icons.store),
                        const SizedBox(height: 16),
                        _buildField(locationCtrl, 'Location / Address', Icons.location_on),
                        const SizedBox(height: 16),
                        _buildField(contactCtrl, 'Contact Number', Icons.phone),
                      ],
                    ),
                  ),
          ),
          actions: [
            TextButton(
              onPressed: isLoading ? null : () => Navigator.pop(ctx),
              child: Text(
                createdCredentials != null ? 'Done' : 'Cancel',
                style: GoogleFonts.inter(),
              ),
            ),
            if (createdCredentials == null)
              ElevatedButton(
                onPressed: isLoading
                    ? null
                    : () async {
                        if (!formKey.currentState!.validate()) return;
                        if (nameCtrl.text.trim().isEmpty) return;
                        setStateDialog(() => isLoading = true);
                        try {
                          final result = await ref
                              .read(branchListProvider.notifier)
                              .createBranch(
                                name: nameCtrl.text.trim(),
                                location: locationCtrl.text.trim(),
                                contact: contactCtrl.text.trim(),
                              );
                          setStateDialog(() {
                            isLoading = false;
                            createdCredentials = result['credentials'];
                          });
                        } catch (e) {
                          setStateDialog(() => isLoading = false);
                          if (ctx.mounted) {
                            ScaffoldMessenger.of(ctx).showSnackBar(
                              SnackBar(content: Text('Error: $e'), backgroundColor: Colors.red),
                            );
                          }
                        }
                      },
                style: ElevatedButton.styleFrom(
                  backgroundColor: Theme.of(context).colorScheme.primary,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                child: isLoading
                    ? const SizedBox(
                        width: 20, height: 20,
                        child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                    : Text('Create Branch', style: GoogleFonts.inter(fontWeight: FontWeight.w700)),
              ),
          ],
        ),
      ),
    );
  }

  Widget _credentialCard(String title, String email, String password) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.primary.withValues(alpha: 0.05),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Theme.of(context).colorScheme.primary.withValues(alpha: 0.2)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: GoogleFonts.inter(fontWeight: FontWeight.w800, fontSize: 13,
              color: Theme.of(context).colorScheme.primary)),
          const SizedBox(height: 8),
          _credRow(Icons.email_outlined, email),
          const SizedBox(height: 4),
          _credRow(Icons.lock_outline, password, isCopyable: true),
        ],
      ),
    );
  }

  Widget _credRow(IconData icon, String text, {bool isCopyable = false}) {
    return Row(
      children: [
        Icon(icon, size: 14, color: Colors.grey[600]),
        const SizedBox(width: 6),
        Expanded(
          child: Text(text,
              style: GoogleFonts.inter(fontSize: 13,
                  color: Theme.of(context).textTheme.bodyMedium?.color)),
        ),
        if (isCopyable)
          GestureDetector(
            onTap: () => Clipboard.setData(ClipboardData(text: text)),
            child: Icon(Icons.copy_outlined, size: 14, color: Colors.grey[600]),
          )
      ],
    );
  }

  Widget _buildField(TextEditingController ctrl, String label, IconData icon) {
    return TextFormField(
      controller: ctrl,
      style: GoogleFonts.inter(),
      decoration: InputDecoration(
        labelText: label,
        labelStyle: GoogleFonts.inter(color: Colors.grey[600]),
        prefixIcon: Icon(icon, color: Theme.of(context).colorScheme.primary, size: 20),
        filled: true,
        fillColor: Theme.of(context).colorScheme.primary.withValues(alpha: 0.04),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12),
            borderSide: BorderSide(color: Theme.of(context).dividerColor)),
        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12),
            borderSide: BorderSide(color: Theme.of(context).dividerColor)),
        focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12),
            borderSide: BorderSide(color: Theme.of(context).colorScheme.primary, width: 2)),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final branchesState = ref.watch(branchListProvider);
    final selectedBranch = ref.watch(selectedBranchProvider);
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // ─── Header ───────────────────────────────────────────────────
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Multi-Branch Management',
                          style: GoogleFonts.inter(
                              fontSize: 26,
                              fontWeight: FontWeight.w800,
                              letterSpacing: -0.5,
                              color: Theme.of(context).textTheme.bodyMedium?.color)),
                      const SizedBox(height: 6),
                      branchesState.when(
                        loading: () => Text('Loading branches...',
                            style: GoogleFonts.inter(color: Colors.grey, fontSize: 14)),
                        error: (e, stack) => Text('Error loading branches',
                            style: GoogleFonts.inter(color: Colors.red, fontSize: 14)),
                        data: (branches) => Text(
                          '${branches.length} branch${branches.length == 1 ? '' : 'es'} registered',
                          style: GoogleFonts.inter(
                              color: Theme.of(context).colorScheme.primary,
                              fontWeight: FontWeight.w600,
                              fontSize: 14),
                        ),
                      ),
                    ],
                  ),
                  ElevatedButton.icon(
                    onPressed: _showAddBranchDialog,
                    icon: const Icon(Icons.add_business, size: 18),
                    label: Text('Add Branch', style: GoogleFonts.inter(fontWeight: FontWeight.w700)),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Theme.of(context).colorScheme.primary,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    ),
                  ),
                ],
              ).animate().fadeIn(duration: 400.ms).slideY(begin: -0.05),
              const SizedBox(height: 24),

              // ─── Body ─────────────────────────────────────────────────────
              Expanded(
                child: branchesState.when(
                  loading: () => const Center(child: CircularProgressIndicator()),
                  error: (e, _) => Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.cloud_off, size: 64, color: Colors.grey),
                        const SizedBox(height: 16),
                        Text('Failed to load branches', style: GoogleFonts.inter(color: Colors.grey)),
                        const SizedBox(height: 8),
                        ElevatedButton(
                          onPressed: () => ref.read(branchListProvider.notifier).fetchBranches(),
                          child: const Text('Retry'),
                        ),
                      ],
                    ),
                  ),
                  data: (branches) => branches.isEmpty
                      ? _buildEmptyState()
                      : Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            // ── Sidebar ──────────────────────────────────────
                            SizedBox(
                              width: 300,
                              child: Container(
                                decoration: BoxDecoration(
                                  color: isDark
                                      ? Colors.white.withValues(alpha: 0.04)
                                      : Colors.grey.shade50,
                                  borderRadius: BorderRadius.circular(20),
                                  border: Border.all(color: Theme.of(context).dividerColor),
                                ),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Padding(
                                      padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
                                      child: Text('BRANCHES',
                                          style: GoogleFonts.inter(
                                              fontSize: 11,
                                              fontWeight: FontWeight.w800,
                                              letterSpacing: 1.5,
                                              color: Colors.grey[600])),
                                    ),
                                    Expanded(
                                      child: ListView.builder(
                                        padding: const EdgeInsets.fromLTRB(12, 0, 12, 12),
                                        itemCount: branches.length,
                                        itemBuilder: (context, index) {
                                          final branch = branches[index] as Map<String, dynamic>;
                                          final isSelected = selectedBranch?['id'] == branch['id'];
                                          final isActive = branch['isActive'] ?? true;
                                          return GestureDetector(
                                            onTap: () => ref
                                                .read(selectedBranchProvider.notifier)
                                                .setBranch(branch),
                                            child: AnimatedContainer(
                                              duration: const Duration(milliseconds: 200),
                                              margin: const EdgeInsets.only(bottom: 8),
                                              padding: const EdgeInsets.all(14),
                                              decoration: BoxDecoration(
                                                color: isSelected
                                                    ? Theme.of(context).colorScheme.primary
                                                    : Theme.of(context).cardTheme.color ??
                                                        Theme.of(context).colorScheme.surface,
                                                borderRadius: BorderRadius.circular(14),
                                                border: Border.all(
                                                    color: isSelected
                                                        ? Colors.transparent
                                                        : Theme.of(context).dividerColor),
                                                boxShadow: isSelected
                                                    ? [BoxShadow(
                                                        color: Theme.of(context).colorScheme.primary.withValues(alpha: 0.3),
                                                        blurRadius: 12, offset: const Offset(0, 4))]
                                                    : [],
                                              ),
                                              child: Row(
                                                children: [
                                                  Container(
                                                    padding: const EdgeInsets.all(8),
                                                    decoration: BoxDecoration(
                                                      color: (isSelected ? Colors.white : Theme.of(context).colorScheme.primary).withValues(alpha: 0.15),
                                                      borderRadius: BorderRadius.circular(10),
                                                    ),
                                                    child: Icon(Icons.store,
                                                        color: isSelected ? Colors.white : Theme.of(context).colorScheme.primary,
                                                        size: 18),
                                                  ),
                                                  const SizedBox(width: 12),
                                                  Expanded(
                                                    child: Column(
                                                      crossAxisAlignment: CrossAxisAlignment.start,
                                                      children: [
                                                        Text(branch['name'] ?? 'Unknown',
                                                            style: GoogleFonts.inter(
                                                                fontWeight: FontWeight.w700,
                                                                color: isSelected ? Colors.white : null)),
                                                        if (branch['location'] != null)
                                                          Text(branch['location'],
                                                              style: GoogleFonts.inter(
                                                                  fontSize: 12,
                                                                  color: isSelected
                                                                      ? Colors.white70
                                                                      : Colors.grey[600])),
                                                      ],
                                                    ),
                                                  ),
                                                  Container(
                                                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                                                    decoration: BoxDecoration(
                                                      color: (isActive ? Colors.green : Colors.red).withValues(alpha: isSelected ? 0.3 : 0.1),
                                                      borderRadius: BorderRadius.circular(8),
                                                    ),
                                                    child: Text(
                                                      isActive ? 'Active' : 'Inactive',
                                                      style: GoogleFonts.inter(
                                                          fontSize: 10,
                                                          fontWeight: FontWeight.w700,
                                                          color: isSelected
                                                              ? Colors.white
                                                              : (isActive ? Colors.green[700] : Colors.red[700])),
                                                    ),
                                                  ),
                                                ],
                                              ),
                                            ).animate().fadeIn(delay: Duration(milliseconds: 60 * index)),
                                          );
                                        },
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                            const SizedBox(width: 24),
                            // ── Detail Panel ──────────────────────────────────
                            Expanded(
                              child: selectedBranch == null
                                  ? _buildSelectPrompt()
                                  : _buildBranchDetail(selectedBranch),
                            ),
                          ],
                        ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.add_business_outlined, size: 80, color: Colors.grey[400]),
          const SizedBox(height: 20),
          Text('No Branches Yet',
              style: GoogleFonts.inter(fontSize: 20, fontWeight: FontWeight.w700, color: Colors.grey[600])),
          const SizedBox(height: 8),
          Text('Click "Add Branch" to create your first branch.',
              style: GoogleFonts.inter(color: Colors.grey)),
          const SizedBox(height: 24),
          ElevatedButton.icon(
            onPressed: _showAddBranchDialog,
            icon: const Icon(Icons.add),
            label: const Text('Add First Branch'),
            style: ElevatedButton.styleFrom(
              backgroundColor: Theme.of(context).colorScheme.primary,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
            ),
          ),
        ],
      ).animate().fadeIn().scale(),
    );
  }

  Widget _buildSelectPrompt() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.touch_app_outlined, size: 64, color: Colors.grey[400]),
          const SizedBox(height: 16),
          Text('Select a branch from the list to view its details',
              style: GoogleFonts.inter(color: Colors.grey[600])),
        ],
      ),
    );
  }

  Widget _buildBranchDetail(Map<String, dynamic> branch) {
    final statsAsync = ref.watch(branchStatsProvider(branch['id']));

    return SingleChildScrollView(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Branch title row with toggle
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(branch['name'] ?? '',
                        style: GoogleFonts.inter(
                            fontSize: 22,
                            fontWeight: FontWeight.w800,
                            color: Theme.of(context).textTheme.bodyMedium?.color)),
                    if (branch['location'] != null)
                      Row(
                        children: [
                          Icon(Icons.location_on_outlined, size: 14, color: Colors.grey[500]),
                          const SizedBox(width: 4),
                          Text(branch['location'],
                              style: GoogleFonts.inter(color: Colors.grey[600], fontSize: 14)),
                        ],
                      ),
                  ],
                ),
              ),
              Switch(
                value: branch['isActive'] ?? true,
                activeThumbColor: Theme.of(context).colorScheme.primary,
                onChanged: (val) async {
                  await ref.read(branchListProvider.notifier).toggleActive(branch['id'], val);
                  // Update selected branch state
                  ref.read(selectedBranchProvider.notifier).setBranch({
                    ...branch,
                    'isActive': val,
                  });
                },
              ),
            ],
          ).animate().fadeIn(duration: 300.ms),
          const SizedBox(height: 24),

          // KPI Cards
          statsAsync.when(
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (e, _) => Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.red.withValues(alpha: 0.05),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.red.withValues(alpha: 0.2)),
              ),
              child: Text('Could not load stats: $e',
                  style: GoogleFonts.inter(color: Colors.red[400])),
            ),
            data: (stats) => Row(
              children: [
                _kpiCard('Daily Sales',
                    'LKR ${(stats['dailySales'] as num).toStringAsFixed(2)}',
                    Icons.trending_up, Colors.green),
                const SizedBox(width: 16),
                _kpiCard('Orders Today',
                    '${stats['totalOrders']}',
                    Icons.receipt_long, Colors.blue),
                const SizedBox(width: 16),
                _kpiCard('Active Tables',
                    '${stats['activeTables']} / ${stats['totalTables']}',
                    Icons.table_restaurant, Colors.orange),
                const SizedBox(width: 16),
                _kpiCard('Total Staff',
                    '${stats['totalStaff']}',
                    Icons.people_outline, Colors.purple),
              ],
            ).animate().fadeIn(duration: 400.ms),
          ),
          const SizedBox(height: 32),

          // Branch Info Card
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: Theme.of(context).cardTheme.color ?? Theme.of(context).colorScheme.surface,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: Theme.of(context).dividerColor),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Branch Information',
                    style: GoogleFonts.inter(fontWeight: FontWeight.w800, fontSize: 16,
                        color: Theme.of(context).textTheme.bodyMedium?.color)),
                const SizedBox(height: 16),
                _infoRow(Icons.key_outlined, 'Branch ID', branch['id'] ?? '—'),
                _infoRow(Icons.phone_outlined, 'Contact', branch['contact'] ?? '—'),
                _infoRow(Icons.percent, 'Tax Rate', '${branch['taxRate'] ?? 0}%'),
                _infoRow(Icons.currency_exchange, 'Currency', branch['currency'] ?? 'LKR'),
                _infoRow(Icons.schedule, 'Timezone', branch['timezone'] ?? 'Asia/Colombo'),
              ],
            ),
          ).animate().fadeIn(delay: 100.ms),
        ],
      ),
    );
  }

  Widget _kpiCard(String label, String value, IconData icon, Color color) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: Theme.of(context).cardTheme.color ?? Theme.of(context).colorScheme.surface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: Theme.of(context).dividerColor),
          boxShadow: [BoxShadow(color: color.withValues(alpha: 0.06), blurRadius: 12, offset: const Offset(0, 4))],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(color: color.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(10)),
              child: Icon(icon, color: color, size: 20),
            ),
            const SizedBox(height: 12),
            Text(value,
                style: GoogleFonts.inter(fontWeight: FontWeight.w800, fontSize: 22,
                    color: Theme.of(context).textTheme.bodyMedium?.color)),
            const SizedBox(height: 4),
            Text(label, style: GoogleFonts.inter(color: Colors.grey[600], fontSize: 12, fontWeight: FontWeight.w600)),
          ],
        ),
      ),
    );
  }

  Widget _infoRow(IconData icon, String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        children: [
          Icon(icon, size: 16, color: Colors.grey[500]),
          const SizedBox(width: 12),
          Text(label, style: GoogleFonts.inter(color: Colors.grey[600], fontWeight: FontWeight.w600, fontSize: 14)),
          const Spacer(),
          Text(value, style: GoogleFonts.inter(fontWeight: FontWeight.w700, fontSize: 14,
              color: Theme.of(context).textTheme.bodyMedium?.color)),
        ],
      ),
    );
  }
}
