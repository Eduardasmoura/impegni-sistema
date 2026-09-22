import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:intl/intl.dart';
import 'package:supabase_flutter/supabase_flutter.dart' show RealtimeChannel, PostgresChangeEvent, PostgresChangeFilter, PostgresChangeFilterType;
import '../../app/app_drawer.dart';
import '../../data/company_service.dart';
import '../../data/supabase_client.dart';
import 'novo_agendamento_sheet.dart';
import 'occupancy_calendar.dart';
import 'reagendar_sheet.dart';

const _statusLabel = {
  'scheduled': 'Agendado',
  'in_progress': 'Em andamento',
  'completed': 'Concluído',
  'canceled': 'Cancelado',
  'no_show': 'Não compareceu',
};

String _toDateStr(DateTime d) => DateFormat('yyyy-MM-dd').format(d);

/// Fila de atendimento do dia + calendário mensal de ocupação — FASE 7
/// trouxe o seletor de profissional, o calendário (mesma RPC
/// `get_professional_occupancy_month` do Web) e o bloqueio de criar
/// agendamento em dia passado, fechando a lacuna encontrada na auditoria.
/// Continua sendo a tela mais usada no celular, pensada pra operação rápida
/// no balcão (iniciar / concluir / cancelar com um toque).
class AgendaScreen extends StatefulWidget {
  final CurrentCompany company;

  const AgendaScreen({super.key, required this.company});

  @override
  State<AgendaScreen> createState() => _AgendaScreenState();
}

class _AgendaScreenState extends State<AgendaScreen> {
  final _hoje = DateTime.now();
  late DateTime _dia = _hoje;
  late int _viewYear = _hoje.year;
  late int _viewMonth = _hoje.month - 1; // 0-indexado

  bool _loadingOpcoes = true;
  bool _loadingDia = true;
  bool _carregandoMes = false;
  List<Map<String, dynamic>> _professionals = [];
  String? _professionalId;
  List<Map<String, dynamic>> _appointments = [];
  Map<String, DiaOcupacao> _occupancyByDay = {};
  late final RealtimeChannel _channel;

  // Offline mínimo (FASE 7, Section 10 do plano): só leitura da agenda do
  // dia já vista — sem escrita offline, então sem risco de conflito e sem
  // fila de sincronização pra construir. Fora do escopo (documentado pro
  // relatório final): cache de múltiplos dias, offline em Clientes/
  // Financeiro/Dashboard, qualquer ação de escrita offline.
  static const _cacheStorage = FlutterSecureStorage();
  bool _offline = false;
  DateTime? _offlineDesde;

  @override
  void initState() {
    super.initState();
    _loadOpcoes();
    // Agenda em tempo real: qualquer INSERT/UPDATE/DELETE em appointments
    // desta empresa recarrega a lista sozinho — sem precisar puxar pra
    // atualizar (requer a tabela estar na publication supabase_realtime).
    _channel = supabase
        .channel('appointments-company-${widget.company.id}')
        .onPostgresChanges(
          event: PostgresChangeEvent.all,
          schema: 'public',
          table: 'appointments',
          filter: PostgresChangeFilter(type: PostgresChangeFilterType.eq, column: 'company_id', value: widget.company.id),
          callback: (_) {
            _loadDia();
            _loadOcupacaoMes();
          },
        )
        .subscribe();
  }

  @override
  void dispose() {
    supabase.removeChannel(_channel);
    super.dispose();
  }

  String get _diaStr => _toDateStr(_dia);
  String get _hojeStr => _toDateStr(_hoje);
  bool get _diaEhPassado => _diaStr.compareTo(_hojeStr) < 0;

  Future<void> _loadOpcoes() async {
    setState(() => _loadingOpcoes = true);
    final professionals = await supabase.from('professionals').select('id, name, user_id').eq('company_id', widget.company.id).eq('active', true).order('name', ascending: true);
    if (!mounted) return;
    final lista = List<Map<String, dynamic>>.from(professionals);
    // Seleciona automaticamente o profissional ligado ao usuário logado
    // (professionals.user_id) — mesma regra do Web. Quem não tem registro
    // próprio (dono/gerente puro) cai no primeiro da lista.
    final currentUserId = supabase.auth.currentUser?.id;
    final proprio = lista.where((p) => p['user_id'] == currentUserId).firstOrNull;
    setState(() {
      _professionals = lista;
      _professionalId = proprio?['id'] as String? ?? (lista.isNotEmpty ? lista.first['id'] as String : null);
      _loadingOpcoes = false;
    });
    if (_professionalId != null) {
      await Future.wait([_loadDia(), _loadOcupacaoMes()]);
    } else {
      setState(() => _loadingDia = false);
    }
  }

  String get _cacheKey => 'agenda_cache_${widget.company.id}_${_professionalId}_$_diaStr';

  Future<void> _loadDia() async {
    if (_professionalId == null) return;
    setState(() => _loadingDia = true);
    // MOB-03: DateTime local sem `.toUtc()` serializa sem 'Z', e o Postgres
    // lia como se já fosse UTC (o intervalo do dia ficava deslocado pelo
    // fuso do aparelho).
    final inicio = DateTime(_dia.year, _dia.month, _dia.day).toUtc().toIso8601String();
    final fim = DateTime(_dia.year, _dia.month, _dia.day, 23, 59, 59).toUtc().toIso8601String();
    try {
      final rows = await supabase
          .from('appointments')
          .select('id, scheduled_at, status, price, duration_min, professional_id, service_id, clients(name), professionals(name), services(name)')
          .eq('company_id', widget.company.id)
          .eq('professional_id', _professionalId!)
          .gte('scheduled_at', inicio)
          .lte('scheduled_at', fim)
          // BUG achado no teste ao vivo desta fase: `.order()` do
          // postgrest-dart é DESCENDENTE por padrão (`ascending: false`) —
          // sem isso explícito, a fila do dia aparecia do último horário
          // pro primeiro.
          .order('scheduled_at', ascending: true);
      if (!mounted) return;
      final lista = List<Map<String, dynamic>>.from(rows);
      setState(() {
        _appointments = lista;
        _offline = false;
        _offlineDesde = null;
        _loadingDia = false;
      });
      // Salva pra consulta offline depois — melhor esforço, não bloqueia a
      // tela nem trata falha de escrita no storage como erro de carregar.
      unawaited(_salvarCache(lista));
    } catch (_) {
      if (!mounted) return;
      final cache = await _lerCache();
      if (!mounted) return;
      setState(() {
        _loadingDia = false;
        _offline = true;
        if (cache != null) {
          _appointments = cache.$1;
          _offlineDesde = cache.$2;
        }
        // Sem cache pra este dia/profissional: mantém a lista vazia — a
        // mensagem "sem conexão" já deixa claro que não é "dia livre".
      });
    }
  }

  Future<void> _salvarCache(List<Map<String, dynamic>> lista) async {
    try {
      final payload = jsonEncode({'salvo_em': DateTime.now().toIso8601String(), 'agendamentos': lista});
      await _cacheStorage.write(key: _cacheKey, value: payload);
    } catch (_) {
      // Cache é um extra, não uma garantia — qualquer falha de storage aqui
      // não pode virar erro visível pra quem só queria ver a agenda.
    }
  }

  Future<(List<Map<String, dynamic>>, DateTime)?> _lerCache() async {
    try {
      final salvo = await _cacheStorage.read(key: _cacheKey);
      if (salvo == null) return null;
      final decoded = jsonDecode(salvo) as Map<String, dynamic>;
      final lista = List<Map<String, dynamic>>.from(decoded['agendamentos'] as List);
      final salvoEm = DateTime.parse(decoded['salvo_em'] as String);
      return (lista, salvoEm);
    } catch (_) {
      return null;
    }
  }

  Future<void> _loadOcupacaoMes() async {
    if (_professionalId == null) return;
    setState(() => _carregandoMes = true);
    final monthKey = '$_viewYear-${(_viewMonth + 1).toString().padLeft(2, '0')}-01';
    final rows = await supabase.rpc('get_professional_occupancy_month', params: {
      'p_company_id': widget.company.id,
      'p_professional_id': _professionalId!,
      'p_month': monthKey,
    });
    if (!mounted) return;
    final map = <String, DiaOcupacao>{};
    for (final r in List<Map<String, dynamic>>.from(rows)) {
      map[r['day'] as String] = DiaOcupacao(
        capacityMin: r['capacity_min'] as int,
        occupiedMin: r['occupied_min'] as int,
        appointmentCount: r['appointment_count'] as int,
        occupancyPct: (r['occupancy_pct'] as num).toDouble(),
      );
    }
    setState(() {
      _occupancyByDay = map;
      _carregandoMes = false;
    });
  }

  Future<void> _mudarStatus(String id, String status) async {
    if (_offline) return; // defesa em profundidade — a UI já esconde a ação offline
    await supabase.from('appointments').update({'status': status}).eq('id', id);
    _loadDia();
    _loadOcupacaoMes();
  }

  Future<void> _abrirNovoAgendamento() async {
    if (_diaEhPassado || _offline) return;
    final criado = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      builder: (_) => NovoAgendamentoSheet(companyId: widget.company.id, dia: _diaStr, initialProfessionalId: _professionalId),
    );
    if (criado == true) {
      _loadDia();
      _loadOcupacaoMes();
    }
  }

  ({int atendimentos, int ocupadoMin, int? capacidadeMin, int? disponivelMin}) get _resumoDia {
    final ativos = _appointments.where((a) => a['status'] != 'canceled');
    final ocupadoMin = ativos.fold<int>(0, (s, a) => s + ((a['duration_min'] as int?) ?? 0));
    final capacidadeMin = _occupancyByDay[_diaStr]?.capacityMin;
    final disponivelMin = capacidadeMin != null ? (capacidadeMin - ocupadoMin).clamp(0, capacidadeMin) : null;
    return (atendimentos: ativos.length, ocupadoMin: ocupadoMin, capacidadeMin: capacidadeMin, disponivelMin: disponivelMin);
  }

  @override
  Widget build(BuildContext context) {
    final resumo = _resumoDia;
    return Scaffold(
      drawer: const AppDrawer(),
      appBar: AppBar(
        title: Text(widget.company.name),
        // "Bloqueios, folgas e férias" e "Lista de espera" saíram daqui —
        // agora são itens do menu lateral (mesmas rotas do Web,
        // `/agenda/bloqueios` e `/agenda/espera`), não duplicam mais a
        // entrada.
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: (_diaEhPassado || _offline) ? null : _abrirNovoAgendamento,
        icon: const Icon(Icons.add),
        label: const Text('Novo'),
        backgroundColor: (_diaEhPassado || _offline) ? Colors.grey : null,
      ),
      // FASE 7: SafeArea (só embaixo — o AppBar já cobre o topo) pra o
      // último agendamento da lista não ficar colado no home indicator.
      body: _loadingOpcoes
          ? const Center(child: CircularProgressIndicator())
          : SafeArea(
              top: false,
              child: RefreshIndicator(
                onRefresh: () => Future.wait([_loadDia(), _loadOcupacaoMes()]),
              child: ListView(
                padding: const EdgeInsets.all(12),
                children: [
                  if (_offline)
                    Card(
                      color: Theme.of(context).colorScheme.errorContainer,
                      child: Padding(
                        padding: const EdgeInsets.all(12),
                        child: Row(
                          children: [
                            Icon(Icons.cloud_off, size: 18, color: Theme.of(context).colorScheme.onErrorContainer),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                _offlineDesde != null
                                    ? 'Sem conexão — mostrando dados salvos às ${DateFormat('HH:mm').format(_offlineDesde!.toLocal())}. Criar, editar e cancelar ficam desativados até reconectar.'
                                    : 'Sem conexão e sem dados salvos para este dia ainda.',
                                style: TextStyle(fontSize: 12, color: Theme.of(context).colorScheme.onErrorContainer),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  if (_offline) const SizedBox(height: 8),
                  if (_professionals.length > 1)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: DropdownButtonFormField<String>(
                        initialValue: _professionalId,
                        decoration: const InputDecoration(labelText: 'Profissional', isDense: true, border: OutlineInputBorder()),
                        items: _professionals.map((p) => DropdownMenuItem(value: p['id'] as String, child: Text(p['name'] as String))).toList(),
                        onChanged: (v) {
                          if (v == null) return;
                          setState(() => _professionalId = v);
                          _loadDia();
                          _loadOcupacaoMes();
                        },
                      ),
                    ),
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(12),
                      child: OccupancyCalendar(
                        year: _viewYear,
                        month: _viewMonth,
                        loading: _carregandoMes,
                        occupancyByDay: _occupancyByDay,
                        selectedDate: _diaStr,
                        onMonthChange: (y, m) {
                          setState(() {
                            _viewYear = y;
                            _viewMonth = m;
                          });
                          _loadOcupacaoMes();
                        },
                        onSelectDate: (dateStr) {
                          setState(() => _dia = DateTime.parse(dateStr));
                          _loadDia();
                        },
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(child: _ResumoCard(label: 'Atendimentos', value: '${resumo.atendimentos}')),
                      const SizedBox(width: 8),
                      Expanded(child: _ResumoCard(label: 'Ocupado', value: _formatMin(resumo.ocupadoMin))),
                      const SizedBox(width: 8),
                      Expanded(child: _ResumoCard(label: 'Disponível', value: resumo.disponivelMin != null ? _formatMin(resumo.disponivelMin!) : '—')),
                    ],
                  ),
                  const SizedBox(height: 16),
                  Text(DateFormat("EEEE, d 'de' MMMM", 'pt_BR').format(_dia), style: Theme.of(context).textTheme.titleSmall),
                  if (_diaEhPassado)
                    const Padding(
                      padding: EdgeInsets.only(top: 4),
                      child: Text('Dia passado — não é possível criar novos agendamentos.', style: TextStyle(fontSize: 11, color: Colors.grey)),
                    ),
                  const SizedBox(height: 8),
                  if (_loadingDia)
                    const Padding(padding: EdgeInsets.symmetric(vertical: 40), child: Center(child: CircularProgressIndicator()))
                  else if (_appointments.isEmpty)
                    const Padding(
                      padding: EdgeInsets.symmetric(vertical: 40),
                      child: Center(child: Text('Nenhum agendamento neste dia.', style: TextStyle(color: Colors.grey))),
                    )
                  else
                    ..._appointments.map((a) => Padding(
                          padding: const EdgeInsets.only(bottom: 8),
                          child: _AppointmentCard(
                            appointment: a,
                            companyId: widget.company.id,
                            onStatusChange: _mudarStatus,
                            onReagendado: () {
                              _loadDia();
                              _loadOcupacaoMes();
                            },
                            readOnly: _offline,
                          ),
                        )),
                ],
              ),
            ),
          ),
    );
  }
}

String _formatMin(int min) {
  final h = min ~/ 60;
  final m = min % 60;
  if (h == 0) return '${m}min';
  if (m == 0) return '${h}h';
  return '${h}h${m.toString().padLeft(2, '0')}';
}

class _ResumoCard extends StatelessWidget {
  final String label;
  final String value;

  const _ResumoCard({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 8),
        child: Column(
          children: [
            Text(value, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
            Text(label, style: const TextStyle(fontSize: 10, color: Colors.grey)),
          ],
        ),
      ),
    );
  }
}

class _AppointmentCard extends StatelessWidget {
  final Map<String, dynamic> appointment;
  final String companyId;
  final Future<void> Function(String id, String status) onStatusChange;
  final VoidCallback onReagendado;
  final bool readOnly;

  const _AppointmentCard({
    required this.appointment,
    required this.companyId,
    required this.onStatusChange,
    required this.onReagendado,
    this.readOnly = false,
  });

  @override
  Widget build(BuildContext context) {
    final id = appointment['id'] as String;
    final status = appointment['status'] as String;
    final scheduledAt = DateTime.parse(appointment['scheduled_at'] as String).toLocal();
    final clientName = (appointment['clients']?['name'] as String?) ?? 'Cliente';
    final professionalName = appointment['professionals']?['name'] as String?;
    final serviceName = appointment['services']?['name'] as String?;
    final price = (appointment['price'] as num?)?.toDouble() ?? 0;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Row(
          children: [
            SizedBox(
              width: 52,
              child: Text(DateFormat('HH:mm').format(scheduledAt), style: const TextStyle(fontWeight: FontWeight.bold)),
            ),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(clientName, style: const TextStyle(fontWeight: FontWeight.w600), overflow: TextOverflow.ellipsis),
                  Text(
                    '${serviceName ?? ''} · ${professionalName ?? ''} · R\$ ${price.toStringAsFixed(2)}',
                    style: const TextStyle(fontSize: 12, color: Colors.grey),
                    overflow: TextOverflow.ellipsis,
                  ),
                  Text(_statusLabel[status] ?? status, style: const TextStyle(fontSize: 11)),
                ],
              ),
            ),
            if (!readOnly && (status == 'scheduled' || status == 'in_progress'))
              PopupMenuButton<String>(
                onSelected: (value) async {
                  if (value == 'reagendar') {
                    final reagendou = await showModalBottomSheet<bool>(
                      context: context,
                      isScrollControlled: true,
                      builder: (_) => ReagendarSheet(
                        appointmentId: id,
                        companyId: companyId,
                        professionalId: appointment['professional_id'] as String,
                        serviceId: appointment['service_id'] as String,
                        clienteNome: clientName,
                        servicoNome: serviceName ?? 'Atendimento',
                      ),
                    );
                    if (reagendou == true) onReagendado();
                    return;
                  }
                  onStatusChange(id, value);
                },
                itemBuilder: (context) => [
                  // reschedule_appointment (RPC) só permite reagendar quem
                  // ainda está "scheduled" — mesma regra do Web.
                  if (status == 'scheduled') const PopupMenuItem(value: 'reagendar', child: Text('Reagendar')),
                  if (status == 'scheduled') const PopupMenuItem(value: 'in_progress', child: Text('Iniciar')),
                  if (status == 'in_progress') const PopupMenuItem(value: 'scheduled', child: Text('Voltar pra agendado')),
                  const PopupMenuItem(value: 'completed', child: Text('Concluir')),
                  const PopupMenuItem(value: 'canceled', child: Text('Cancelar')),
                ],
              ),
          ],
        ),
      ),
    );
  }
}
