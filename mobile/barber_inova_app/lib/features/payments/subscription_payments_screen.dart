import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../app/app_drawer.dart';
import '../../data/company_service.dart';
import '../../data/supabase_client.dart';

final _currency = NumberFormat.currency(locale: 'pt_BR', symbol: 'R\$');

const _statusLabel = {'pending': 'Pendente', 'confirmed': 'Confirmado', 'received': 'Recebido', 'overdue': 'Atrasado', 'refunded': 'Estornado', 'deleted': 'Removido'};
const _statusColor = {
  'pending': Colors.orange,
  'confirmed': Colors.green,
  'received': Colors.green,
  'overdue': Colors.red,
  'refunded': Colors.grey,
  'deleted': Colors.grey,
};

/// Pagamentos — mesmos dados de
/// `apps/web-professional/.../pagamentos/pagamentos-view.tsx`: histórico
/// de `subscription_payments`, alimentado só pelo webhook do Asaas (RLS já
/// restringe pra manager/admin, migration 043).
class SubscriptionPaymentsScreen extends StatefulWidget {
  final CurrentCompany company;

  const SubscriptionPaymentsScreen({super.key, required this.company});

  @override
  State<SubscriptionPaymentsScreen> createState() => _SubscriptionPaymentsScreenState();
}

class _SubscriptionPaymentsScreenState extends State<SubscriptionPaymentsScreen> {
  bool _loading = true;
  List<Map<String, dynamic>> _payments = [];

  bool get _isManager => widget.company.roleEmpresa == 'owner' || widget.company.roleEmpresa == 'admin';

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final rows = await supabase
        .from('subscription_payments')
        .select('id, value, status, billing_type, due_date')
        .eq('company_id', widget.company.id)
        .order('created_at', ascending: false);
    if (!mounted) return;
    setState(() {
      _payments = List<Map<String, dynamic>>.from(rows);
      _loading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      drawer: const AppDrawer(),
      appBar: AppBar(title: const Text('Pagamentos')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _load,
              child: _payments.isEmpty
                  ? ListView(
                      children: [
                        const SizedBox(height: 120),
                        Center(
                          child: Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 32),
                            child: Text(
                              _isManager ? 'Nenhum pagamento registrado ainda.' : 'Só o proprietário ou administrador pode ver o histórico de pagamentos.',
                              style: const TextStyle(color: Colors.grey),
                              textAlign: TextAlign.center,
                            ),
                          ),
                        ),
                      ],
                    )
                  : ListView.separated(
                      padding: const EdgeInsets.all(12),
                      itemCount: _payments.length,
                      separatorBuilder: (_, __) => const SizedBox(height: 8),
                      itemBuilder: (context, index) {
                        final p = _payments[index];
                        final status = p['status'] as String;
                        return Card(
                          child: ListTile(
                            leading: const Icon(Icons.receipt_long_outlined),
                            title: Text(_currency.format((p['value'] as num).toDouble())),
                            subtitle: Text(
                              '${_statusLabel[status] ?? status} · ${p['billing_type'] ?? '—'}${p['due_date'] != null ? ' · venc. ${DateFormat('dd/MM/yyyy').format(DateTime.parse(p['due_date'] as String))}' : ''}',
                            ),
                            trailing: Container(
                              width: 10,
                              height: 10,
                              decoration: BoxDecoration(color: _statusColor[status] ?? Colors.grey, shape: BoxShape.circle),
                            ),
                          ),
                        );
                      },
                    ),
            ),
    );
  }
}
