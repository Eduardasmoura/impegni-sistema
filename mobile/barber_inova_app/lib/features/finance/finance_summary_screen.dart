import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:supabase_flutter/supabase_flutter.dart' show PostgrestException;
import '../../data/company_service.dart';
import '../../data/supabase_client.dart';

final _currency = NumberFormat.currency(locale: 'pt_BR', symbol: 'R\$');

/// Resumo financeiro simplificado do dia — não é o relatório completo do
/// painel web (sem gráficos), só os KPIs essenciais pra conferir rápido pelo
/// celular. Só aparece pra quem tem `role_empresa` owner/manager, mesma regra
/// de RLS que já bloqueia `payments`/`expenses` pra staff no banco.
class FinanceSummaryScreen extends StatefulWidget {
  final CurrentCompany company;

  const FinanceSummaryScreen({super.key, required this.company});

  @override
  State<FinanceSummaryScreen> createState() => _FinanceSummaryScreenState();
}

class _FinanceSummaryScreenState extends State<FinanceSummaryScreen> {
  bool _loading = true;
  double _faturamentoHoje = 0;
  int _atendimentosHoje = 0;
  bool _semAcesso = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    final hoje = DateTime.now();
    final inicio = DateTime(hoje.year, hoje.month, hoje.day).toIso8601String();
    final fim = DateTime(hoje.year, hoje.month, hoje.day, 23, 59, 59).toIso8601String();

    try {
      final payments = await supabase
          .from('payments')
          .select('amount, status, created_at')
          .eq('company_id', widget.company.id)
          .gte('created_at', inicio)
          .lte('created_at', fim)
          .eq('status', 'paid');
      final appointments = await supabase
          .from('appointments')
          .select('id')
          .eq('company_id', widget.company.id)
          .gte('scheduled_at', inicio)
          .lte('scheduled_at', fim)
          .neq('status', 'canceled');

      if (!mounted) return;
      setState(() {
        _faturamentoHoje = payments.fold<double>(0, (sum, p) => sum + ((p['amount'] as num?)?.toDouble() ?? 0));
        _atendimentosHoje = appointments.length;
        _loading = false;
      });
    } on PostgrestException {
      // RLS bloqueou (staff sem acesso a financeiro) — mostramos um aviso em
      // vez de deixar a tela quebrada.
      if (!mounted) return;
      setState(() {
        _semAcesso = true;
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Financeiro — hoje')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _semAcesso
              ? const Center(
                  child: Padding(
                    padding: EdgeInsets.all(24),
                    child: Text('Você não tem acesso ao financeiro desta empresa.', textAlign: TextAlign.center),
                  ),
                )
              : RefreshIndicator(
                  onRefresh: _load,
                  child: ListView(
                    padding: const EdgeInsets.all(16),
                    children: [
                      _KpiCard(label: 'Faturamento de hoje', value: _currency.format(_faturamentoHoje), icon: Icons.attach_money),
                      const SizedBox(height: 12),
                      _KpiCard(label: 'Atendimentos hoje', value: '$_atendimentosHoje', icon: Icons.calendar_today),
                      const SizedBox(height: 24),
                      const Text(
                        'Relatório completo (por período, categoria e profissional) disponível no painel web.',
                        style: TextStyle(fontSize: 12, color: Colors.grey),
                        textAlign: TextAlign.center,
                      ),
                    ],
                  ),
                ),
    );
  }
}

class _KpiCard extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;

  const _KpiCard({required this.label, required this.value, required this.icon});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            Icon(icon, color: Theme.of(context).colorScheme.primary),
            const SizedBox(width: 12),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label, style: const TextStyle(fontSize: 12, color: Colors.grey)),
                Text(value, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
