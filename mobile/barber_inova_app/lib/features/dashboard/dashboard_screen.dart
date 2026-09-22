import 'package:flutter/material.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:intl/intl.dart';
import 'package:supabase_flutter/supabase_flutter.dart' show PostgrestException;
import '../../app/app_drawer.dart';
import '../../data/company_service.dart';
import '../../data/supabase_client.dart';
import '../../shared/period_filter.dart';
import 'dashboard_filters_sheet.dart';

final _currency = NumberFormat.currency(locale: 'pt_BR', symbol: 'R\$');

const _metodoLabel = {'pix': 'Pix', 'card': 'Cartão', 'cash': 'Dinheiro', 'package': 'Pacote', 'online': 'Online'};
const _metodoCor = {
  'pix': Color(0xFF2563EB),
  'card': Color(0xFF16A34A),
  'cash': Color(0xFFCA8A04),
  'package': Color(0xFF9333EA),
  'online': Color(0xFFDB2777),
};

// Mesma constante (e mesmo espírito de janela "rolante até agora") de
// `apps/web-professional/.../dashboard/dashboard-view.tsx`.
const _horasExpedientePorPeriodo = {
  Periodo.hoje: 8,
  Periodo.ontem: 8,
  Periodo.semana: 56,
  Periodo.semanaPassada: 56,
  Periodo.mes: 240,
  Periodo.mesPassado: 240,
  Periodo.ano: 2880,
  Periodo.anoPassado: 2880,
  Periodo.personalizado: 8,
};

/// Visão geral do negócio — equivalente mobile do
/// `apps/web-professional/.../dashboard/dashboard-view.tsx`. FASE 7: ganhou
/// os filtros avançados (profissional/serviço/status/forma de pagamento/
/// cliente) em bottom sheet, os períodos extras (ontem/semana passada/mês
/// passado/ano passado/personalizado), os KPIs de cancelamentos/ticket
/// médio/novos clientes/recorrentes e o gráfico de faturamento por
/// profissional. "Fila de hoje" continua fora — a aba Agenda já cumpre esse
/// papel no mobile (decisão de antes desta fase, mantida).
///
/// Corrige também um bug real encontrado na auditoria: antes, o período
/// buscava só os 500 agendamentos/pagamentos mais recentes e filtrava em
/// Dart — empresa com mais de 500 lançamentos no período tinha números
/// incompletos sem aviso nenhum. Agora a busca já escopa por data no
/// servidor (`.gte/.lte`), então nunca corta dado do período selecionado.
class DashboardScreen extends StatefulWidget {
  final CurrentCompany company;

  const DashboardScreen({super.key, required this.company});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  DashboardFilters _filters = DashboardFilters();
  bool _loading = true;
  bool _semAcessoFinanceiro = false;
  List<Map<String, dynamic>> _appointments = [];
  List<Map<String, dynamic>> _payments = [];
  List<Map<String, dynamic>> _professionals = [];
  List<Map<String, dynamic>> _services = [];
  List<Map<String, dynamic>> _clients = [];
  int _totalClientes = 0;
  int _novosClientes = 0;
  int _clientesRecorrentes = 0;

  @override
  void initState() {
    super.initState();
    _load();
  }

  ({DateTime start, DateTime end}) get _intervalo =>
      resolvePeriodRange(_filters.periodo, customStart: _filters.customStart, customEnd: _filters.customEnd);

  Future<void> _load() async {
    setState(() => _loading = true);
    final companyId = widget.company.id;
    final intervalo = _intervalo;
    try {
      // As 3 primeiras já eram carregadas (viram base pros filtros); as duas
      // de conteúdo (appointments/payments) agora escopam por data no
      // servidor — corrige o bug do período "Ano" (ver comentário da classe).
      // MOB-03 (achado no teste ao vivo desta fase): `intervalo.start`/`.end`
      // são `DateTime` locais (`resolvePeriodRange`, em `period_filter.dart`)
      // — sem `.toUtc()` antes de serializar, a string ISO sai sem 'Z'/
      // offset e o Postgres lê como se já fosse UTC, deslocando a janela do
      // período pelo fuso do aparelho (mesma classe de bug já corrigida em
      // `agenda_screen.dart` antes desta fase).
      final inicioUtc = intervalo.start.toUtc().toIso8601String();
      final fimUtc = intervalo.end.toUtc().toIso8601String();
      final results = await Future.wait<List<Map<String, dynamic>>>([
        supabase
            .from('appointments')
            .select('id, professional_id, service_id, client_id, scheduled_at, status')
            .eq('company_id', companyId)
            .gte('scheduled_at', inicioUtc)
            .lte('scheduled_at', fimUtc)
            .order('scheduled_at', ascending: false),
        supabase
            .from('payments')
            .select('amount, method, status, created_at, appointment_id, client_id')
            .eq('company_id', companyId)
            .gte('created_at', inicioUtc)
            .lte('created_at', fimUtc)
            .order('created_at', ascending: false),
        supabase.from('professionals').select('id, name').eq('company_id', companyId).eq('active', true).order('name', ascending: true),
        supabase.from('services').select('id, name').eq('company_id', companyId).eq('active', true).order('name', ascending: true),
        supabase.from('clients').select('id, name').eq('company_id', companyId).order('name', ascending: true),
      ]);
      final totalClientesResp = await supabase.from('clients').select('id').eq('company_id', companyId).count();

      final dias = diasNoIntervalo(intervalo);
      // "Novos clientes"/"recorrentes" reaproveitam as RPCs da Fase 5
      // (nenhuma query nova) — elas medem "últimos N dias a partir de
      // agora", então pra períodos rolantes (hoje/semana/mês/ano) o
      // resultado é exato; pra período fechado no passado
      // (ontem/semana passada/mês passado/ano passado/personalizado) é uma
      // aproximação (mesma janela de N dias, mas sempre medida a partir de
      // agora) — limitação da RPC existente, documentada aqui em vez de
      // fingir precisão que não existe.
      final novosClientesFuture = supabase.rpc('get_new_client_candidates', params: {'p_company_id': companyId, 'p_days': dias});
      final recorrentesFuture = supabase.rpc('get_recurring_client_candidates', params: {'p_company_id': companyId, 'p_min_appointments': 3, 'p_period_days': dias});
      final segmentacao = await Future.wait([novosClientesFuture, recorrentesFuture]);

      if (!mounted) return;
      setState(() {
        _appointments = List<Map<String, dynamic>>.from(results[0] as List);
        _payments = List<Map<String, dynamic>>.from(results[1] as List);
        _professionals = List<Map<String, dynamic>>.from(results[2] as List);
        _services = List<Map<String, dynamic>>.from(results[3] as List);
        _clients = List<Map<String, dynamic>>.from(results[4]);
        _totalClientes = totalClientesResp.count;
        _novosClientes = (segmentacao[0] as List).length;
        _clientesRecorrentes = (segmentacao[1] as List).length;
        _semAcessoFinanceiro = false;
        _loading = false;
      });
    } on PostgrestException {
      // RLS bloqueou payments pra quem não é manager — mesma regra do
      // Financeiro. O Dashboard segue mostrando o que der (agendamentos), só
      // zera o que depende de payments.
      if (!mounted) return;
      setState(() {
        _semAcessoFinanceiro = true;
        _loading = false;
      });
    }
  }

  // Filtros avançados aplicados em Dart sobre o já escopado por data — mesma
  // lógica de `dashboard-view.tsx` (payments não tem professional_id/
  // service_id direto, então cruza pelo appointment vinculado).
  List<Map<String, dynamic>> get _appointmentsFiltrados {
    return _appointments.where((a) {
      if (_filters.professionalIds.isNotEmpty && !_filters.professionalIds.contains(a['professional_id'])) return false;
      if (_filters.serviceIds.isNotEmpty && !_filters.serviceIds.contains(a['service_id'])) return false;
      if (_filters.status.isNotEmpty && !_filters.status.contains(a['status'])) return false;
      if (_filters.clientId != null && a['client_id'] != _filters.clientId) return false;
      return true;
    }).toList();
  }

  List<Map<String, dynamic>> get _paymentsFiltrados {
    final porId = {for (final a in _appointments) a['id'] as String: a};
    return _payments.where((p) {
      if (p['status'] != 'paid') return false;
      if (_filters.clientId != null && p['client_id'] != _filters.clientId) return false;
      if (_filters.paymentMethods.isNotEmpty && !_filters.paymentMethods.contains(p['method'] ?? '')) return false;
      if (_filters.professionalIds.isNotEmpty || _filters.serviceIds.isNotEmpty || _filters.status.isNotEmpty) {
        final agendamento = porId[p['appointment_id']];
        if (agendamento == null) return false;
        if (_filters.professionalIds.isNotEmpty && !_filters.professionalIds.contains(agendamento['professional_id'])) return false;
        if (_filters.serviceIds.isNotEmpty && !_filters.serviceIds.contains(agendamento['service_id'])) return false;
        if (_filters.status.isNotEmpty && !_filters.status.contains(agendamento['status'])) return false;
      }
      return true;
    }).toList();
  }

  double get _faturamento => _paymentsFiltrados.fold(0, (s, p) => s + ((p['amount'] as num?)?.toDouble() ?? 0));

  int get _cancelamentos => _appointmentsFiltrados.where((a) => a['status'] == 'canceled').length;

  int get _atendimentosConcluidos => _appointmentsFiltrados.where((a) => a['status'] == 'completed').length;

  double get _ticketMedio => _atendimentosConcluidos == 0 ? 0 : _faturamento / _atendimentosConcluidos;

  List<Map<String, dynamic>> get _profissionaisConsiderados =>
      _filters.professionalIds.isEmpty ? _professionals : _professionals.where((p) => _filters.professionalIds.contains(p['id'])).toList();

  int get _ocupacao {
    final considerados = _profissionaisConsiderados;
    if (considerados.isEmpty) return 0;
    final intervalo = _intervalo;
    final horas = _filters.periodo == Periodo.personalizado ? diasNoIntervalo(intervalo) * 8 : _horasExpedientePorPeriodo[_filters.periodo]!;
    return ((_appointmentsFiltrados.length / (considerados.length * horas)) * 100).round();
  }

  Map<String, double> get _porMetodo {
    final totais = <String, double>{};
    for (final p in _paymentsFiltrados) {
      final metodo = (p['method'] as String?) ?? 'outro';
      totais[metodo] = (totais[metodo] ?? 0) + ((p['amount'] as num?)?.toDouble() ?? 0);
    }
    return totais;
  }

  List<({String nome, double faturamento, int atendimentos})> get _porProfissional {
    final porId = {for (final a in _appointmentsFiltrados) a['id'] as String: a};
    return _profissionaisConsiderados
        .map((prof) {
          final total = _paymentsFiltrados.where((pg) {
            final ag = porId[pg['appointment_id']];
            return ag != null && ag['professional_id'] == prof['id'];
          }).fold(0.0, (s, p) => s + ((p['amount'] as num?)?.toDouble() ?? 0));
          final atendimentos = _appointmentsFiltrados.where((a) => a['professional_id'] == prof['id']).length;
          return (nome: (prof['name'] as String).split(' ').first, faturamento: total, atendimentos: atendimentos);
        })
        .where((x) => x.atendimentos > 0)
        .toList();
  }

  Future<void> _abrirFiltros() async {
    final resultado = await showDashboardFiltersSheet(
      context,
      atuais: _filters,
      professionals: _professionals,
      services: _services,
      clients: _clients,
    );
    if (resultado != null) {
      setState(() => _filters = resultado);
    }
  }

  Future<void> _escolherPersonalizado() async {
    final agora = DateTime.now();
    final range = await showDateRangePicker(
      context: context,
      firstDate: DateTime(agora.year - 5),
      lastDate: agora,
      initialDateRange: _filters.customStart != null && _filters.customEnd != null
          ? DateTimeRange(start: _filters.customStart!, end: _filters.customEnd!)
          : DateTimeRange(start: agora.subtract(const Duration(days: 7)), end: agora),
    );
    if (range == null) return;
    setState(() {
      _filters = _filters.copy()
        ..periodo = Periodo.personalizado
        ..customStart = range.start
        ..customEnd = range.end;
    });
    _load();
  }

  @override
  Widget build(BuildContext context) {
    final atendimentos = _appointmentsFiltrados;
    final faturamento = _faturamento;
    final porMetodo = _porMetodo;
    final porProfissional = _porProfissional;
    final badge = _filters.avancadosAtivos;

    return Scaffold(
      drawer: const AppDrawer(),
      appBar: AppBar(
        title: const Text('Dashboard'),
        actions: [
          IconButton(
            icon: Badge(
              isLabelVisible: badge > 0,
              label: Text('$badge'),
              child: const Icon(Icons.tune),
            ),
            tooltip: 'Filtros',
            onPressed: _abrirFiltros,
          ),
        ],
      ),
      // FASE 7: SafeArea explícito — sem ele, o último card da lista
      // (gráfico "por profissional") ficava colado na barra de gestos/home
      // indicator em aparelhos com notch (o AppBar já cobre o topo, então
      // isso só reserva o espaço de baixo).
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : SafeArea(
              top: false,
              child: RefreshIndicator(
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
                                selected: _filters.periodo == p,
                                onSelected: (_) {
                                  setState(() => _filters = _filters.copy()..periodo = p);
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
                            setState(() => _filters = _filters.copy()..periodo = p);
                            _load();
                          },
                          itemBuilder: (context) => periodosSecundarios.map((p) => PopupMenuItem(value: p, child: Text(periodosLabel[p]!))).toList(),
                          child: Chip(
                            label: Text(periodosSecundarios.contains(_filters.periodo) ? periodosLabel[_filters.periodo]! : 'Mais...'),
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
                    childAspectRatio: 1.7,
                    children: [
                      _KpiCard(label: 'Faturamento', value: _currency.format(faturamento), icon: Icons.attach_money),
                      _KpiCard(label: 'Atendimentos', value: '${atendimentos.length}', icon: Icons.calendar_today),
                      // Clientes propositalmente NÃO respeita o período — mesma
                      // regra do Dashboard web (mostra o total cadastrado).
                      _KpiCard(label: 'Clientes', value: '$_totalClientes', icon: Icons.people),
                      _KpiCard(label: 'Ocupação', value: '$_ocupacao%', icon: Icons.trending_up),
                      _KpiCard(label: 'Cancelamentos', value: '$_cancelamentos', icon: Icons.event_busy),
                      _KpiCard(label: 'Ticket médio', value: _currency.format(_ticketMedio), icon: Icons.receipt_long),
                      _KpiCard(label: 'Novos clientes', value: '$_novosClientes', icon: Icons.person_add),
                      _KpiCard(label: 'Recorrentes', value: '$_clientesRecorrentes', icon: Icons.repeat),
                    ],
                  ),
                  if (_semAcessoFinanceiro) ...[
                    const SizedBox(height: 12),
                    const Text(
                      'Faturamento e formas de pagamento ficam zerados porque você não tem acesso ao financeiro desta empresa.',
                      style: TextStyle(fontSize: 12, color: Colors.grey),
                    ),
                  ],
                  const SizedBox(height: 24),
                  Text('Faturamento no período', style: Theme.of(context).textTheme.titleSmall),
                  const SizedBox(height: 12),
                  SizedBox(height: 180, child: _FaturamentoChart(payments: _paymentsFiltrados)),
                  const SizedBox(height: 24),
                  Text('Faturamento por profissional', style: Theme.of(context).textTheme.titleSmall),
                  const SizedBox(height: 12),
                  SizedBox(height: 200, child: _PorProfissionalChart(dados: porProfissional)),
                  const SizedBox(height: 24),
                  Text('Formas de pagamento', style: Theme.of(context).textTheme.titleSmall),
                  const SizedBox(height: 12),
                  SizedBox(height: 180, child: _MetodoPagamentoChart(porMetodo: porMetodo)),
                  const SizedBox(height: 24),
                ],
              ),
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
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(child: Text(label, style: const TextStyle(fontSize: 11, color: Colors.grey), overflow: TextOverflow.ellipsis)),
                Icon(icon, size: 16, color: Theme.of(context).colorScheme.primary),
              ],
            ),
            const SizedBox(height: 6),
            Text(value, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold), overflow: TextOverflow.ellipsis),
          ],
        ),
      ),
    );
  }
}

class _FaturamentoChart extends StatelessWidget {
  final List<Map<String, dynamic>> payments;

  const _FaturamentoChart({required this.payments});

  @override
  Widget build(BuildContext context) {
    if (payments.isEmpty) {
      return const Center(child: Text('Sem dados no período', style: TextStyle(color: Colors.grey)));
    }
    final grupos = <String, double>{};
    for (final p in payments) {
      final d = DateTime.parse(p['created_at'] as String).toLocal();
      final chave = DateFormat('dd/MM').format(d);
      grupos[chave] = (grupos[chave] ?? 0) + ((p['amount'] as num?)?.toDouble() ?? 0);
    }
    final entradas = grupos.entries.toList();
    final spots = [for (var i = 0; i < entradas.length; i++) FlSpot(i.toDouble(), entradas[i].value)];
    final primary = Theme.of(context).colorScheme.primary;
    return LineChart(
      LineChartData(
        gridData: const FlGridData(show: true, drawVerticalLine: false),
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
        borderData: FlBorderData(show: false),
        lineBarsData: [LineChartBarData(spots: spots, isCurved: true, color: primary, barWidth: 2.5, dotData: const FlDotData(show: false))],
      ),
    );
  }
}

class _PorProfissionalChart extends StatelessWidget {
  final List<({String nome, double faturamento, int atendimentos})> dados;

  const _PorProfissionalChart({required this.dados});

  @override
  Widget build(BuildContext context) {
    if (dados.isEmpty) {
      return const Center(child: Text('Sem dados no período', style: TextStyle(color: Colors.grey)));
    }
    final primary = Theme.of(context).colorScheme.primary;
    final maxY = dados.map((d) => d.faturamento).fold(0.0, (a, b) => a > b ? a : b) * 1.2;
    return BarChart(
      BarChartData(
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
                if (i < 0 || i >= dados.length) return const SizedBox.shrink();
                return Padding(padding: const EdgeInsets.only(top: 4), child: Text(dados[i].nome, style: const TextStyle(fontSize: 9)));
              },
            ),
          ),
        ),
        barGroups: [
          for (var i = 0; i < dados.length; i++)
            BarChartGroupData(x: i, barRods: [BarChartRodData(toY: dados[i].faturamento, color: primary, width: 18, borderRadius: BorderRadius.circular(4))]),
        ],
      ),
    );
  }
}

class _MetodoPagamentoChart extends StatelessWidget {
  final Map<String, double> porMetodo;

  const _MetodoPagamentoChart({required this.porMetodo});

  @override
  Widget build(BuildContext context) {
    if (porMetodo.isEmpty) {
      return const Center(child: Text('Sem dados no período', style: TextStyle(color: Colors.grey)));
    }
    return Row(
      children: [
        Expanded(
          child: PieChart(
            PieChartData(
              sectionsSpace: 2,
              centerSpaceRadius: 32,
              sections: porMetodo.entries
                  .map((e) => PieChartSectionData(value: e.value, color: _metodoCor[e.key] ?? Colors.grey, showTitle: false, radius: 40))
                  .toList(),
            ),
          ),
        ),
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: porMetodo.entries.map((e) {
            return Padding(
              padding: const EdgeInsets.symmetric(vertical: 3),
              child: Row(
                children: [
                  Container(width: 10, height: 10, decoration: BoxDecoration(color: _metodoCor[e.key] ?? Colors.grey, shape: BoxShape.circle)),
                  const SizedBox(width: 6),
                  Text('${_metodoLabel[e.key] ?? e.key} · ${_currency.format(e.value)}', style: const TextStyle(fontSize: 11)),
                ],
              ),
            );
          }).toList(),
        ),
      ],
    );
  }
}
