import 'package:flutter/material.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:intl/intl.dart';
import 'package:supabase_flutter/supabase_flutter.dart' show PostgrestException;
import '../../app/app_drawer.dart';
import '../../data/company_service.dart';
import '../../data/supabase_client.dart';
import '../../shared/period_filter.dart';
import '../payouts/payouts_screen.dart';
import 'expense_form_sheet.dart';

final _currency = NumberFormat.currency(locale: 'pt_BR', symbol: 'R\$');
final _dataFmt = DateFormat('dd/MM');

const categoriasDespesa = [
  ('aluguel', 'Aluguel'),
  ('fornecedores', 'Fornecedores'),
  ('salarios', 'Salários'),
  ('marketing', 'Marketing'),
  ('equipamentos', 'Equipamentos'),
  ('impostos', 'Impostos'),
  ('outros', 'Outros'),
];
const _categoriaLabel = {'aluguel': 'Aluguel', 'fornecedores': 'Fornecedores', 'salarios': 'Salários', 'marketing': 'Marketing', 'equipamentos': 'Equipamentos', 'impostos': 'Impostos', 'outros': 'Outros'};
const _coresGrafico = [Color(0xFFF97316), Color(0xFF10B981), Color(0xFF3B82F6), Color(0xFFFACC15), Color(0xFF9333EA)];

/// Relatório financeiro — FASE 7 fechou as lacunas encontradas na
/// auditoria: antes só mostrava "hoje" (bug de fuso, tag MOB-03), sem
/// despesas, sem gráficos. Agora tem período completo (mesmo componente
/// compartilhado com o Dashboard), CRUD de despesas e os 3 gráficos do Web
/// — adaptados pra tela pequena (scroll vertical, não tabela comprimida).
/// Repasse virou uma aba aqui dentro em vez de item escondido em "Mais".
class FinanceSummaryScreen extends StatefulWidget {
  final CurrentCompany company;

  const FinanceSummaryScreen({super.key, required this.company});

  @override
  State<FinanceSummaryScreen> createState() => _FinanceSummaryScreenState();
}

class _FinanceSummaryScreenState extends State<FinanceSummaryScreen> {
  Periodo _periodo = Periodo.mes;
  DateTime? _customStart;
  DateTime? _customEnd;
  bool _loading = true;
  bool _semAcesso = false;
  List<Map<String, dynamic>> _payments = [];
  List<Map<String, dynamic>> _expenses = [];

  ({DateTime start, DateTime end}) get _intervalo => resolvePeriodRange(_periodo, customStart: _customStart, customEnd: _customEnd);

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    final intervalo = _intervalo;
    try {
      // MOB-03 (achado no teste ao vivo desta fase): `payments.created_at` é
      // timestamptz — precisa de `.toUtc()` antes de serializar (mesmo bug
      // do Dashboard, ver comentário lá). `expenses.expense_date` já é só
      // `date` (sem hora), então o valor local mesmo é o certo — `.toUtc()`
      // ali mudaria o dia calendário errado pra quem está a oeste de UTC.
      final payments = await supabase
          .from('payments')
          .select('amount, status, created_at, appointment_id')
          .eq('company_id', widget.company.id)
          .gte('created_at', intervalo.start.toUtc().toIso8601String())
          .lte('created_at', intervalo.end.toUtc().toIso8601String())
          .eq('status', 'paid');
      final expenses = await supabase
          .from('expenses')
          .select('id, description, amount, category, expense_date, recurring')
          .eq('company_id', widget.company.id)
          .gte('expense_date', intervalo.start.toIso8601String().substring(0, 10))
          .lte('expense_date', intervalo.end.toIso8601String().substring(0, 10))
          .order('expense_date', ascending: false);

      // Receita por categoria de serviço precisa do appointment vinculado —
      // busca só os agendamentos referenciados pelos pagamentos do período
      // (evita buscar a tabela inteira).
      final appointmentIds = payments.map((p) => p['appointment_id']).whereType<String>().toSet().toList();
      Map<String, String> categoriaPorAppointment = {};
      if (appointmentIds.isNotEmpty) {
        final appts = await supabase.from('appointments').select('id, services(category)').inFilter('id', appointmentIds);
        categoriaPorAppointment = {for (final a in appts) a['id'] as String: (a['services']?['category'] as String?) ?? 'outros'};
      }

      if (!mounted) return;
      setState(() {
        _payments = List<Map<String, dynamic>>.from(payments).map((p) {
          return {...p, '_categoria': categoriaPorAppointment[p['appointment_id']] ?? 'outros'};
        }).toList();
        _expenses = List<Map<String, dynamic>>.from(expenses);
        _semAcesso = false;
        _loading = false;
      });
    } on PostgrestException {
      if (!mounted) return;
      setState(() {
        _semAcesso = true;
        _loading = false;
      });
    }
  }

  double get _receitaTotal => _payments.fold(0.0, (s, p) => s + ((p['amount'] as num?)?.toDouble() ?? 0));
  double get _despesaTotal => _expenses.fold(0.0, (s, d) => s + ((d['amount'] as num?)?.toDouble() ?? 0));
  double get _lucro => _receitaTotal - _despesaTotal;
  int get _margem => _receitaTotal > 0 ? ((_lucro / _receitaTotal) * 100).round() : 0;

  Map<String, double> get _despesaPorCategoria {
    final totais = <String, double>{};
    for (final d in _expenses) {
      final cat = (d['category'] as String?) ?? 'outros';
      totais[cat] = (totais[cat] ?? 0) + ((d['amount'] as num?)?.toDouble() ?? 0);
    }
    return totais;
  }

  Future<void> _escolherPersonalizado() async {
    final agora = DateTime.now();
    final range = await showDateRangePicker(context: context, firstDate: DateTime(agora.year - 5), lastDate: agora);
    if (range == null) return;
    setState(() {
      _periodo = Periodo.personalizado;
      _customStart = range.start;
      _customEnd = range.end;
    });
    _load();
  }

  Future<void> _abrirNovaDespesa() async {
    final salvou = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      builder: (_) => ExpenseFormSheet(companyId: widget.company.id),
    );
    if (salvou == true) _load();
  }

  Future<void> _excluirDespesa(Map<String, dynamic> despesa) async {
    final confirmar = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Excluir despesa?'),
        content: Text('"${despesa['description']}" será removida. Essa ação não pode ser desfeita.'),
        actions: [
          TextButton(onPressed: () => Navigator.of(context).pop(false), child: const Text('Cancelar')),
          FilledButton(onPressed: () => Navigator.of(context).pop(true), child: const Text('Excluir')),
        ],
      ),
    );
    if (confirmar != true) return;
    await supabase.from('expenses').delete().eq('id', despesa['id']);
    _load();
  }

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 2,
      child: Scaffold(
        drawer: const AppDrawer(),
        appBar: AppBar(
          title: const Text('Financeiro'),
          bottom: const TabBar(tabs: [Tab(text: 'Visão geral'), Tab(text: 'Repasse')]),
        ),
        body: TabBarView(
          children: [
            _loading
                ? const Center(child: CircularProgressIndicator())
                : _semAcesso
                    ? const Center(
                        child: Padding(
                          padding: EdgeInsets.all(24),
                          child: Text('Você não tem acesso ao financeiro desta empresa.', textAlign: TextAlign.center),
                        ),
                      )
                    : _buildVisaoGeral(context),
            PayoutsScreen(company: widget.company, embedded: true),
          ],
        ),
      ),
    );
  }

  Widget _buildVisaoGeral(BuildContext context) {
    final despesaPorCategoria = _despesaPorCategoria;
    return RefreshIndicator(
      onRefresh: _load,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          SizedBox(
            height: 36,
            child: ListView(
              scrollDirection: Axis.horizontal,
              children: [
                ...periodosPrincipais.map((p) => Padding(
                      padding: const EdgeInsets.only(right: 8),
                      child: ChoiceChip(
                        label: Text(periodosLabel[p]!),
                        selected: _periodo == p,
                        onSelected: (_) {
                          setState(() => _periodo = p);
                          _load();
                        },
                      ),
                    )),
                PopupMenuButton<Periodo>(
                  tooltip: 'Mais períodos',
                  onSelected: (p) {
                    if (p == Periodo.personalizado) {
                      _escolherPersonalizado();
                      return;
                    }
                    setState(() => _periodo = p);
                    _load();
                  },
                  itemBuilder: (context) => periodosSecundarios.map((p) => PopupMenuItem(value: p, child: Text(periodosLabel[p]!))).toList(),
                  child: Chip(
                    label: Text(periodosSecundarios.contains(_periodo) ? periodosLabel[_periodo]! : 'Mais...'),
                    avatar: const Icon(Icons.expand_more, size: 18),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          GridView.count(
            crossAxisCount: 2,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            mainAxisSpacing: 8,
            crossAxisSpacing: 8,
            childAspectRatio: 1.8,
            children: [
              _KpiCard(label: 'Receita total', value: _currency.format(_receitaTotal), icon: Icons.trending_up, color: Colors.green),
              _KpiCard(label: 'Despesas', value: _currency.format(_despesaTotal), icon: Icons.trending_down, color: Colors.red),
              _KpiCard(label: 'Lucro líquido', value: _currency.format(_lucro), icon: Icons.account_balance_wallet_outlined, color: _lucro >= 0 ? Colors.green : Colors.red),
              _KpiCard(label: 'Margem', value: '$_margem%', icon: Icons.percent, color: Colors.amber.shade800),
            ],
          ),
          const SizedBox(height: 24),
          Text('Despesas por categoria', style: Theme.of(context).textTheme.titleSmall),
          const SizedBox(height: 12),
          SizedBox(height: 180, child: _DespesaCategoriaChart(porCategoria: despesaPorCategoria)),
          const SizedBox(height: 24),
          Text('Receita, despesa e lucro no período', style: Theme.of(context).textTheme.titleSmall),
          const SizedBox(height: 12),
          SizedBox(height: 200, child: _SerieChart(payments: _payments, expenses: _expenses, periodo: _periodo)),
          const SizedBox(height: 24),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('Despesas registradas', style: Theme.of(context).textTheme.titleSmall),
              TextButton.icon(onPressed: _abrirNovaDespesa, icon: const Icon(Icons.add, size: 18), label: const Text('Nova despesa')),
            ],
          ),
          if (_expenses.isEmpty)
            const Padding(padding: EdgeInsets.symmetric(vertical: 24), child: Center(child: Text('Nenhuma despesa no período.', style: TextStyle(color: Colors.grey))))
          else
            ..._expenses.map((d) => Card(
                  child: ListTile(
                    title: Text(d['description'] as String? ?? ''),
                    subtitle: Text(
                      '${_categoriaLabel[d['category']] ?? d['category']} · ${_dataFmt.format(DateTime.parse(d['expense_date'] as String))}${d['recurring'] == true ? ' · Recorrente' : ''}',
                      style: const TextStyle(fontSize: 11),
                    ),
                    trailing: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(_currency.format((d['amount'] as num).toDouble()), style: const TextStyle(color: Colors.red, fontWeight: FontWeight.bold)),
                        IconButton(icon: const Icon(Icons.delete_outline, size: 18), onPressed: () => _excluirDespesa(d)),
                      ],
                    ),
                  ),
                )),
        ],
      ),
    );
  }
}

class _KpiCard extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;
  final Color color;

  const _KpiCard({required this.label, required this.value, required this.icon, required this.color});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
              Expanded(child: Text(label, style: const TextStyle(fontSize: 11, color: Colors.grey), overflow: TextOverflow.ellipsis)),
              Icon(icon, size: 16, color: color),
            ]),
            const SizedBox(height: 6),
            Text(value, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold), overflow: TextOverflow.ellipsis),
          ],
        ),
      ),
    );
  }
}

class _DespesaCategoriaChart extends StatelessWidget {
  final Map<String, double> porCategoria;

  const _DespesaCategoriaChart({required this.porCategoria});

  @override
  Widget build(BuildContext context) {
    if (porCategoria.isEmpty) {
      return const Center(child: Text('Nenhuma despesa registrada', style: TextStyle(color: Colors.grey)));
    }
    final entradas = porCategoria.entries.toList();
    return Row(
      children: [
        Expanded(
          child: PieChart(PieChartData(
            sectionsSpace: 2,
            centerSpaceRadius: 32,
            sections: [
              for (var i = 0; i < entradas.length; i++)
                PieChartSectionData(value: entradas[i].value, color: _coresGrafico[i % _coresGrafico.length], showTitle: false, radius: 40),
            ],
          )),
        ),
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            for (var i = 0; i < entradas.length; i++)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 3),
                child: Row(children: [
                  Container(width: 10, height: 10, decoration: BoxDecoration(color: _coresGrafico[i % _coresGrafico.length], shape: BoxShape.circle)),
                  const SizedBox(width: 6),
                  Text('${_categoriaLabel[entradas[i].key] ?? entradas[i].key} · ${_currency.format(entradas[i].value)}', style: const TextStyle(fontSize: 11)),
                ]),
              ),
          ],
        ),
      ],
    );
  }
}

class _SerieChart extends StatelessWidget {
  final List<Map<String, dynamic>> payments;
  final List<Map<String, dynamic>> expenses;
  final Periodo periodo;

  const _SerieChart({required this.payments, required this.expenses, required this.periodo});

  @override
  Widget build(BuildContext context) {
    if (payments.isEmpty && expenses.isEmpty) {
      return const Center(child: Text('Sem dados no período', style: TextStyle(color: Colors.grey)));
    }
    final anual = periodo == Periodo.ano || periodo == Periodo.anoPassado;
    String chaveDaData(DateTime d) => anual ? DateFormat('MMM', 'pt_BR').format(d) : DateFormat('dd/MM').format(d);

    final pontos = <String, ({double receita, double despesa})>{};
    for (final p in payments) {
      final chave = chaveDaData(DateTime.parse(p['created_at'] as String).toLocal());
      final atual = pontos[chave] ?? (receita: 0, despesa: 0);
      pontos[chave] = (receita: atual.receita + ((p['amount'] as num?)?.toDouble() ?? 0), despesa: atual.despesa);
    }
    for (final d in expenses) {
      final chave = chaveDaData(DateTime.parse(d['expense_date'] as String));
      final atual = pontos[chave] ?? (receita: 0, despesa: 0);
      pontos[chave] = (receita: atual.receita, despesa: atual.despesa + ((d['amount'] as num?)?.toDouble() ?? 0));
    }
    final entradas = pontos.entries.toList();
    final maxY = entradas.fold(0.0, (m, e) => [m, e.value.receita, e.value.despesa].reduce((a, b) => a > b ? a : b)) * 1.2;

    return BarChart(BarChartData(
      maxY: maxY == 0 ? 100 : maxY,
      gridData: const FlGridData(show: true, drawVerticalLine: false),
      borderData: FlBorderData(show: false),
      titlesData: FlTitlesData(
        leftTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
        topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
        rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
        bottomTitles: AxisTitles(
          sideTitles: SideTitles(
            showTitles: true,
            getTitlesWidget: (value, meta) {
              final i = value.toInt();
              if (i < 0 || i >= entradas.length) return const SizedBox.shrink();
              return Padding(padding: const EdgeInsets.only(top: 4), child: Text(entradas[i].key, style: const TextStyle(fontSize: 9)));
            },
          ),
        ),
      ),
      barGroups: [
        for (var i = 0; i < entradas.length; i++)
          BarChartGroupData(x: i, barRods: [
            BarChartRodData(toY: entradas[i].value.receita, color: Colors.green, width: 7, borderRadius: BorderRadius.circular(2)),
            BarChartRodData(toY: entradas[i].value.despesa, color: Colors.red, width: 7, borderRadius: BorderRadius.circular(2)),
          ]),
      ],
    ));
  }
}
