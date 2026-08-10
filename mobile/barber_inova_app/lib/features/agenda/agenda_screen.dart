import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:supabase_flutter/supabase_flutter.dart' show RealtimeChannel, PostgresChangeEvent, PostgresChangeFilter, PostgresChangeFilterType;
import '../../data/company_service.dart';
import '../../data/supabase_client.dart';
import 'novo_agendamento_sheet.dart';

const _statusLabel = {
  'scheduled': 'Agendado',
  'in_progress': 'Em andamento',
  'completed': 'Concluído',
  'canceled': 'Cancelado',
  'no_show': 'Não compareceu',
};

/// Fila de atendimento do dia: a tela mais usada no celular, pensada pra
/// operação rápida no balcão (iniciar / concluir / cancelar com um toque).
class AgendaScreen extends StatefulWidget {
  final CurrentCompany company;

  const AgendaScreen({super.key, required this.company});

  @override
  State<AgendaScreen> createState() => _AgendaScreenState();
}

class _AgendaScreenState extends State<AgendaScreen> {
  DateTime _dia = DateTime.now();
  bool _loading = true;
  List<Map<String, dynamic>> _appointments = [];
  late final RealtimeChannel _channel;

  @override
  void initState() {
    super.initState();
    _load();
    // Agenda em tempo real: qualquer INSERT/UPDATE/DELETE em appointments
    // desta empresa recarrega a lista sozinho — sem precisar puxar pra
    // atualizar (requer a tabela estar na publication supabase_realtime,
    // ver migration 011_realtime_appointments_and_notify_trigger).
    _channel = supabase
        .channel('appointments-company-${widget.company.id}')
        .onPostgresChanges(
          event: PostgresChangeEvent.all,
          schema: 'public',
          table: 'appointments',
          filter: PostgresChangeFilter(type: PostgresChangeFilterType.eq, column: 'company_id', value: widget.company.id),
          callback: (_) => _load(),
        )
        .subscribe();
  }

  @override
  void dispose() {
    supabase.removeChannel(_channel);
    super.dispose();
  }

  String get _diaStr => DateFormat('yyyy-MM-dd').format(_dia);

  Future<void> _load() async {
    setState(() => _loading = true);
    final inicio = DateTime(_dia.year, _dia.month, _dia.day).toIso8601String();
    final fim = DateTime(_dia.year, _dia.month, _dia.day, 23, 59, 59).toIso8601String();
    final rows = await supabase
        .from('appointments')
        .select('id, scheduled_at, status, price, clients(name), professionals(name), services(name)')
        .eq('company_id', widget.company.id)
        .gte('scheduled_at', inicio)
        .lte('scheduled_at', fim)
        .order('scheduled_at');
    if (!mounted) return;
    setState(() {
      _appointments = List<Map<String, dynamic>>.from(rows);
      _loading = false;
    });
  }

  Future<void> _mudarStatus(String id, String status) async {
    await supabase.from('appointments').update({'status': status}).eq('id', id);
    _load();
  }

  Future<void> _abrirNovoAgendamento() async {
    final criado = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      builder: (_) => NovoAgendamentoSheet(companyId: widget.company.id, dia: _diaStr),
    );
    if (criado == true) _load();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.company.name),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(20),
          child: Padding(
            padding: const EdgeInsets.only(bottom: 6),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Container(width: 6, height: 6, decoration: const BoxDecoration(color: Colors.greenAccent, shape: BoxShape.circle)),
                const SizedBox(width: 6),
                Text('Agenda em tempo real', style: TextStyle(fontSize: 11, color: Theme.of(context).appBarTheme.foregroundColor?.withValues(alpha: 0.8))),
              ],
            ),
          ),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.calendar_today, size: 20),
            onPressed: () async {
              final escolhida = await showDatePicker(
                context: context,
                initialDate: _dia,
                firstDate: DateTime.now().subtract(const Duration(days: 365)),
                lastDate: DateTime.now().add(const Duration(days: 365)),
              );
              if (escolhida != null) {
                setState(() => _dia = escolhida);
                _load();
              }
            },
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _abrirNovoAgendamento,
        icon: const Icon(Icons.add),
        label: const Text('Novo'),
      ),
      body: RefreshIndicator(
        onRefresh: _load,
        child: _loading
            ? const Center(child: CircularProgressIndicator())
            : _appointments.isEmpty
                ? ListView(
                    children: const [
                      SizedBox(height: 120),
                      Center(child: Text('Nenhum agendamento neste dia.', style: TextStyle(color: Colors.grey))),
                    ],
                  )
                : ListView.separated(
                    padding: const EdgeInsets.all(12),
                    itemCount: _appointments.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 8),
                    itemBuilder: (context, index) => _AppointmentCard(
                      appointment: _appointments[index],
                      onStatusChange: _mudarStatus,
                    ),
                  ),
      ),
    );
  }
}

class _AppointmentCard extends StatelessWidget {
  final Map<String, dynamic> appointment;
  final Future<void> Function(String id, String status) onStatusChange;

  const _AppointmentCard({required this.appointment, required this.onStatusChange});

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
            if (status == 'scheduled' || status == 'in_progress')
              PopupMenuButton<String>(
                onSelected: (value) => onStatusChange(id, value),
                itemBuilder: (context) => [
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
