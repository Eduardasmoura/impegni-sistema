import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../app/app_drawer.dart';
import '../../data/company_service.dart';
import '../../data/supabase_client.dart';

final _currency = NumberFormat.currency(locale: 'pt_BR', symbol: 'R\$');
final _dateFmt = DateFormat('dd/MM/yyyy');

const _statusLabel = {'open': 'Aberto', 'closed': 'Fechado', 'paid': 'Pago'};
const _statusColor = {'open': Colors.grey, 'closed': Colors.orange, 'paid': Colors.green};

/// Repasse — mesma funcionalidade da aba "Repasse" de
/// `apps/web-professional/.../financeiro/financeiro-view.tsx`. Manager
/// (owner/admin) calcula/fecha/paga; profissional só vê os próprios
/// períodos (a RLS de `payout_periods` já resolve isso sozinha — a query
/// aqui é a mesma pros dois papéis).
class PayoutsScreen extends StatefulWidget {
  final CurrentCompany company;
  // FASE 7: Repasse virou uma aba dentro de Financeiro (era um item
  // escondido em "Mais") — `embedded: true` faz este widget devolver só o
  // conteúdo, sem Scaffold/AppBar próprios, pra caber dentro da TabBarView
  // de `finance_summary_screen.dart`. A rota standalone `/mais/repasse`
  // continua existindo (não removida) por segurança — evita quebrar um
  // deep link antigo que aponte pra ela.
  final bool embedded;

  const PayoutsScreen({super.key, required this.company, this.embedded = false});

  @override
  State<PayoutsScreen> createState() => _PayoutsScreenState();
}

class _PayoutsScreenState extends State<PayoutsScreen> {
  bool get _isManager => widget.company.roleEmpresa == 'owner' || widget.company.roleEmpresa == 'admin';

  bool _loading = true;
  List<Map<String, dynamic>> _periodos = [];
  List<Map<String, dynamic>> _profissionais = [];
  String? _profissionalId;
  final DateTime _periodStart = DateTime(DateTime.now().year, DateTime.now().month, 1);
  final DateTime _periodEnd = DateTime(DateTime.now().year, DateTime.now().month + 1, 0);
  Map<String, dynamic>? _preview;
  bool _calculando = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    // FASE 7 (performance): as duas consultas não dependem uma da outra —
    // paralelo em vez de sequencial.
    final resultados = await Future.wait<List<Map<String, dynamic>>>([
      supabase.from('payout_periods').select('*, professionals(name)').eq('company_id', widget.company.id).order('period_start', ascending: false),
      if (_isManager) supabase.from('professionals').select('id, name').eq('company_id', widget.company.id).order('name', ascending: true),
    ]);
    if (!mounted) return;
    setState(() {
      _periodos = resultados[0];
      _profissionais = _isManager ? resultados[1] : [];
      _loading = false;
    });
  }

  Future<void> _calcular() async {
    if (_profissionalId == null) return;
    setState(() => _calculando = true);
    try {
      final rows = await supabase.rpc('calculate_professional_payout', params: {
        'p_company_id': widget.company.id,
        'p_professional_id': _profissionalId,
        'p_period_start': _periodStart.toIso8601String().substring(0, 10),
        'p_period_end': _periodEnd.toIso8601String().substring(0, 10),
      }) as List;
      setState(() => _preview = rows.isNotEmpty ? rows.first as Map<String, dynamic> : null);
    } finally {
      if (mounted) setState(() => _calculando = false);
    }
  }

  Future<void> _fecharPeriodo() async {
    if (_profissionalId == null) return;
    await supabase.rpc('close_payout_period', params: {
      'p_company_id': widget.company.id,
      'p_professional_id': _profissionalId,
      'p_period_start': _periodStart.toIso8601String().substring(0, 10),
      'p_period_end': _periodEnd.toIso8601String().substring(0, 10),
    });
    setState(() => _preview = null);
    _load();
    if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Período fechado')));
  }

  Future<void> _marcarPago(Map<String, dynamic> periodo) async {
    final metodo = await showDialog<String>(
      context: context,
      builder: (context) => SimpleDialog(
        title: const Text('Forma de pagamento'),
        children: [
          for (final m in ['pix', 'transferencia', 'dinheiro', 'outro'])
            SimpleDialogOption(onPressed: () => Navigator.of(context).pop(m), child: Text(m)),
        ],
      ),
    );
    if (metodo == null) return;
    await supabase.rpc('mark_payout_paid', params: {
      'p_payout_period_id': periodo['id'],
      'p_paid_at': DateTime.now().toIso8601String(),
      'p_payment_method': metodo,
    });
    _load();
  }

  @override
  Widget build(BuildContext context) {
    final body = _loading
        ? const Center(child: CircularProgressIndicator())
        : RefreshIndicator(
              onRefresh: _load,
              child: ListView(
                padding: const EdgeInsets.all(12),
                children: [
                  if (_isManager) ...[
                    Card(
                      child: Padding(
                        padding: const EdgeInsets.all(12),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('Calcular repasse', style: Theme.of(context).textTheme.titleSmall),
                            const SizedBox(height: 8),
                            DropdownButtonFormField<String>(
                              initialValue: _profissionalId,
                              decoration: const InputDecoration(labelText: 'Profissional', border: OutlineInputBorder(), isDense: true),
                              items: _profissionais.map((p) => DropdownMenuItem(value: p['id'] as String, child: Text(p['name'] as String))).toList(),
                              onChanged: (v) => setState(() { _profissionalId = v; _preview = null; }),
                            ),
                            const SizedBox(height: 8),
                            FilledButton.tonal(
                              onPressed: _profissionalId == null || _calculando ? null : _calcular,
                              child: Text(_calculando ? 'Calculando...' : 'Calcular'),
                            ),
                            if (_preview != null) ...[
                              const Divider(),
                              _linha('Atendimentos', '${_preview!['total_appointments']}'),
                              _linha('Faturamento', _currency.format(_preview!['total_revenue'])),
                              _linha('Repasse', _currency.format(_preview!['total_commission']), destaque: true),
                              const SizedBox(height: 8),
                              FilledButton.icon(onPressed: _fecharPeriodo, icon: const Icon(Icons.lock_outline), label: const Text('Fechar período')),
                            ],
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),
                  ],
                  Text('Períodos', style: Theme.of(context).textTheme.titleSmall),
                  const SizedBox(height: 8),
                  if (_periodos.isEmpty) const Padding(padding: EdgeInsets.all(24), child: Center(child: Text('Nenhum período ainda.', style: TextStyle(color: Colors.grey)))),
                  ..._periodos.map((p) {
                    final status = p['status'] as String;
                    return Card(
                      child: ListTile(
                        title: Text((p['professionals'] as Map?)?['name'] as String? ?? ''),
                        subtitle: Text('${_dateFmt.format(DateTime.parse(p['period_start'] as String))} — ${_dateFmt.format(DateTime.parse(p['period_end'] as String))}'),
                        trailing: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            Text(_currency.format(p['total_commission']), style: const TextStyle(fontWeight: FontWeight.bold)),
                            Text(_statusLabel[status] ?? status, style: TextStyle(fontSize: 11, color: _statusColor[status])),
                          ],
                        ),
                        onTap: _isManager && status == 'closed' ? () => _marcarPago(p) : null,
                      ),
                    );
                  }),
                ],
              ),
            );

    if (widget.embedded) return body;
    return Scaffold(drawer: const AppDrawer(), appBar: AppBar(title: const Text('Repasse')), body: body);
  }

  Widget _linha(String label, String valor, {bool destaque = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(color: Colors.grey)),
          Text(valor, style: TextStyle(fontWeight: destaque ? FontWeight.bold : FontWeight.normal)),
        ],
      ),
    );
  }
}
