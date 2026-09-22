import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../app/app_drawer.dart';
import '../../data/company_service.dart';
import '../../data/supabase_client.dart';
import 'reagendar_sheet.dart';

final _dataHora = DateFormat('dd/MM/yyyy HH:mm');
final _data = DateFormat('dd/MM/yyyy');

const _tipoInfo = {
  'block': (label: 'Bloqueio', icon: Icons.block, color: Colors.orange),
  'day_off': (label: 'Folga', icon: Icons.free_breakfast_outlined, color: Colors.blue),
  'vacation': (label: 'Férias', icon: Icons.beach_access_outlined, color: Colors.teal),
};

/// Bloqueios, folgas e férias — reaproveita `professional_blocks` (já
/// existia no backend, criada pra exatamente isso, só sem UI em nenhum
/// app) e a nova RPC `get_block_conflicts`. Mesma lógica do Web-
/// profissional (`agenda/bloqueios/bloqueios-view.tsx`) — nada calculado
/// aqui que não seja repetição da mesma regra do servidor.
class BlocksScreen extends StatefulWidget {
  final CurrentCompany company;

  const BlocksScreen({super.key, required this.company});

  @override
  State<BlocksScreen> createState() => _BlocksScreenState();
}

class _BlocksScreenState extends State<BlocksScreen> {
  bool _loading = true;
  List<Map<String, dynamic>> _professionals = [];
  List<Map<String, dynamic>> _blocks = [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    final resultados = await Future.wait<dynamic>([
      supabase.from('professionals').select('id, name').eq('company_id', widget.company.id).eq('active', true).order('name', ascending: true),
      supabase
          .from('professional_blocks')
          .select('id, professional_id, starts_at, ends_at, reason, type, professionals(name)')
          .eq('company_id', widget.company.id)
          .order('starts_at', ascending: false),
    ]);
    if (!mounted) return;
    setState(() {
      _professionals = List<Map<String, dynamic>>.from(resultados[0]);
      _blocks = List<Map<String, dynamic>>.from(resultados[1]);
      _loading = false;
    });
  }

  Future<void> _abrirFormulario(String tipo) async {
    final criado = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      builder: (_) => _BlockFormSheet(companyId: widget.company.id, tipo: tipo, professionals: _professionals),
    );
    if (criado == true) _load();
  }

  Future<void> _excluir(Map<String, dynamic> bloqueio) async {
    final info = _tipoInfo[bloqueio['type']] ?? _tipoInfo['block']!;
    final confirmar = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Excluir ${info.label.toLowerCase()}?'),
        content: Text('${info.label} de ${bloqueio['professionals']?['name'] ?? 'profissional'} em ${_data.format(DateTime.parse(bloqueio['starts_at']).toLocal())} será removido(a). Agendamentos não são afetados.'),
        actions: [
          TextButton(onPressed: () => Navigator.of(context).pop(false), child: const Text('Cancelar')),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: Theme.of(context).colorScheme.error),
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('Excluir'),
          ),
        ],
      ),
    );
    if (confirmar != true) return;
    await supabase.from('professional_blocks').delete().eq('id', bloqueio['id']);
    _load();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      drawer: const AppDrawer(),
      appBar: AppBar(title: const Text('Bloqueios, folgas e férias')),
      body: SafeArea(
        top: false,
        child: _loading
            ? const Center(child: CircularProgressIndicator())
            : RefreshIndicator(
                onRefresh: _load,
                child: ListView(
                  padding: const EdgeInsets.all(12),
                  children: [
                    const Text(
                      'Períodos em que um profissional não recebe agendamento. Já contam automaticamente na ocupação da Agenda e nos horários disponíveis pro cliente.',
                      style: TextStyle(fontSize: 12, color: Colors.grey),
                    ),
                    const SizedBox(height: 12),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        OutlinedButton.icon(onPressed: () => _abrirFormulario('block'), icon: const Icon(Icons.add), label: const Text('Bloquear horário')),
                        OutlinedButton.icon(onPressed: () => _abrirFormulario('day_off'), icon: const Icon(Icons.add), label: const Text('Folga')),
                        OutlinedButton.icon(onPressed: () => _abrirFormulario('vacation'), icon: const Icon(Icons.add), label: const Text('Férias')),
                      ],
                    ),
                    const SizedBox(height: 16),
                    if (_blocks.isEmpty)
                      const Padding(
                        padding: EdgeInsets.symmetric(vertical: 40),
                        child: Center(child: Text('Nenhum bloqueio, folga ou período de férias cadastrado.', style: TextStyle(color: Colors.grey))),
                      )
                    else
                      ..._blocks.map((b) {
                        final info = _tipoInfo[b['type']] ?? _tipoInfo['block']!;
                        return Card(
                          margin: const EdgeInsets.only(bottom: 8),
                          child: ListTile(
                            leading: CircleAvatar(backgroundColor: info.color.withValues(alpha: 0.15), child: Icon(info.icon, color: info.color, size: 20)),
                            title: Text('${info.label} · ${b['professionals']?['name'] ?? 'Profissional removido'}'),
                            subtitle: Text(
                              '${_dataHora.format(DateTime.parse(b['starts_at']).toLocal())} até ${_dataHora.format(DateTime.parse(b['ends_at']).toLocal())}'
                              '${b['reason'] != null ? ' · ${b['reason']}' : ''}',
                            ),
                            trailing: IconButton(icon: const Icon(Icons.delete_outline), color: Theme.of(context).colorScheme.error, onPressed: () => _excluir(b)),
                          ),
                        );
                      }),
                  ],
                ),
              ),
      ),
    );
  }
}

class _BlockFormSheet extends StatefulWidget {
  final String companyId;
  final String tipo;
  final List<Map<String, dynamic>> professionals;

  const _BlockFormSheet({required this.companyId, required this.tipo, required this.professionals});

  @override
  State<_BlockFormSheet> createState() => _BlockFormSheetState();
}

class _BlockFormSheetState extends State<_BlockFormSheet> {
  String? _professionalId;
  DateTime _data = DateTime.now();
  DateTime _dataFim = DateTime.now();
  bool _diaInteiro = true;
  TimeOfDay _horaInicio = const TimeOfDay(hour: 9, minute: 0);
  TimeOfDay _horaFim = const TimeOfDay(hour: 18, minute: 0);
  final _motivoController = TextEditingController();
  bool _verificando = false;
  String? _erro;

  @override
  void initState() {
    super.initState();
    _diaInteiro = widget.tipo != 'block';
    if (widget.professionals.isNotEmpty) _professionalId = widget.professionals.first['id'] as String;
  }

  @override
  void dispose() {
    _motivoController.dispose();
    super.dispose();
  }

  String get _titulo => (_tipoInfo[widget.tipo] ?? _tipoInfo['block']!).label;

  ({DateTime inicio, DateTime fim})? _montarIntervalo() {
    if (_professionalId == null) return null;
    if (widget.tipo == 'vacation') {
      if (_dataFim.isBefore(_data)) return null;
      final inicio = DateTime(_data.year, _data.month, _data.day);
      final fim = DateTime(_dataFim.year, _dataFim.month, _dataFim.day + 1);
      return (inicio: inicio, fim: fim);
    }
    if (_diaInteiro) {
      final inicio = DateTime(_data.year, _data.month, _data.day);
      final fim = DateTime(_data.year, _data.month, _data.day + 1);
      return (inicio: inicio, fim: fim);
    }
    final inicio = DateTime(_data.year, _data.month, _data.day, _horaInicio.hour, _horaInicio.minute);
    final fim = DateTime(_data.year, _data.month, _data.day, _horaFim.hour, _horaFim.minute);
    if (!fim.isAfter(inicio)) return null;
    return (inicio: inicio, fim: fim);
  }

  Future<void> _continuar() async {
    final intervalo = _montarIntervalo();
    if (intervalo == null) return;
    setState(() {
      _verificando = true;
      _erro = null;
    });
    final startsAt = intervalo.inicio.toUtc().toIso8601String();
    final endsAt = intervalo.fim.toUtc().toIso8601String();
    try {
      final conflitos = await supabase.rpc('get_block_conflicts', params: {
        'p_company_id': widget.companyId,
        'p_professional_id': _professionalId,
        'p_starts_at': startsAt,
        'p_ends_at': endsAt,
      });
      final lista = List<Map<String, dynamic>>.from(conflitos);
      if (!mounted) return;
      final payload = {
        'company_id': widget.companyId,
        'professional_id': _professionalId,
        'starts_at': startsAt,
        'ends_at': endsAt,
        'reason': _motivoController.text.trim().isEmpty ? null : _motivoController.text.trim(),
        'type': widget.tipo,
      };
      if (lista.isEmpty) {
        await _criar(payload);
        return;
      }
      final criouMesmoAssim = await showModalBottomSheet<bool>(
        context: context,
        isScrollControlled: true,
        builder: (_) => _ConflitosSheet(companyId: widget.companyId, professionalId: _professionalId!, conflitos: lista),
      );
      if (criouMesmoAssim == true) await _criar(payload);
    } catch (e) {
      setState(() => _erro = 'Não foi possível verificar conflitos. Tente de novo.');
    } finally {
      if (mounted) setState(() => _verificando = false);
    }
  }

  Future<void> _criar(Map<String, dynamic> payload) async {
    try {
      await supabase.from('professional_blocks').insert(payload);
      if (mounted) Navigator.of(context).pop(true);
    } catch (e) {
      setState(() => _erro = 'Não foi possível criar. Tente de novo.');
    }
  }

  Future<void> _escolherData({required bool fim}) async {
    final escolhida = await showDatePicker(
      context: context,
      initialDate: fim ? _dataFim : _data,
      firstDate: DateTime.now().subtract(const Duration(days: 1)),
      lastDate: DateTime.now().add(const Duration(days: 730)),
    );
    if (escolhida == null) return;
    setState(() {
      if (fim) {
        _dataFim = escolhida;
      } else {
        _data = escolhida;
        if (widget.tipo != 'vacation' && _dataFim.isBefore(_data)) _dataFim = _data;
      }
    });
  }

  Future<void> _escolherHora({required bool fim}) async {
    final escolhida = await showTimePicker(context: context, initialTime: fim ? _horaFim : _horaInicio);
    if (escolhida == null) return;
    setState(() {
      if (fim) {
        _horaFim = escolhida;
      } else {
        _horaInicio = escolhida;
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(left: 16, right: 16, top: 16, bottom: MediaQuery.of(context).viewInsets.bottom + 16),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(_titulo, style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 12),
            if (_erro != null) ...[Text(_erro!, style: const TextStyle(color: Colors.red)), const SizedBox(height: 8)],
            DropdownButtonFormField<String>(
              initialValue: _professionalId,
              decoration: const InputDecoration(labelText: 'Profissional', border: OutlineInputBorder()),
              items: widget.professionals.map((p) => DropdownMenuItem(value: p['id'] as String, child: Text(p['name'] as String))).toList(),
              onChanged: (v) => setState(() => _professionalId = v),
            ),
            const SizedBox(height: 12),
            if (widget.tipo == 'vacation') ...[
              InkWell(
                onTap: () => _escolherData(fim: false),
                child: InputDecorator(decoration: const InputDecoration(labelText: 'Data inicial', border: OutlineInputBorder()), child: Text(_data.format())),
              ),
              const SizedBox(height: 12),
              InkWell(
                onTap: () => _escolherData(fim: true),
                child: InputDecorator(decoration: const InputDecoration(labelText: 'Data final', border: OutlineInputBorder()), child: Text(_dataFim.format())),
              ),
            ] else ...[
              InkWell(
                onTap: () => _escolherData(fim: false),
                child: InputDecorator(decoration: const InputDecoration(labelText: 'Data', border: OutlineInputBorder()), child: Text(_data.format())),
              ),
              if (widget.tipo == 'day_off') ...[
                const SizedBox(height: 4),
                CheckboxListTile(
                  value: _diaInteiro,
                  onChanged: (v) => setState(() => _diaInteiro = v ?? true),
                  title: const Text('Dia inteiro'),
                  controlAffinity: ListTileControlAffinity.leading,
                  contentPadding: EdgeInsets.zero,
                ),
              ],
              if (widget.tipo == 'block' || !_diaInteiro) ...[
                const SizedBox(height: 12),
                Row(children: [
                  Expanded(
                    child: InkWell(
                      onTap: () => _escolherHora(fim: false),
                      child: InputDecorator(decoration: const InputDecoration(labelText: 'Hora início', border: OutlineInputBorder()), child: Text(_horaInicio.format(context))),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: InkWell(
                      onTap: () => _escolherHora(fim: true),
                      child: InputDecorator(decoration: const InputDecoration(labelText: 'Hora fim', border: OutlineInputBorder()), child: Text(_horaFim.format(context))),
                    ),
                  ),
                ]),
              ],
            ],
            const SizedBox(height: 12),
            TextField(
              controller: _motivoController,
              maxLines: 2,
              decoration: const InputDecoration(labelText: 'Motivo (opcional)', border: OutlineInputBorder()),
            ),
            const SizedBox(height: 16),
            FilledButton(
              onPressed: (_verificando || _montarIntervalo() == null) ? null : _continuar,
              child: Text(_verificando ? 'Verificando...' : 'Continuar'),
            ),
          ],
        ),
      ),
    );
  }
}

extension on DateTime {
  String format() => _data.format(this);
}

/// Mostra os agendamentos que colidem com o período antes de criar o
/// bloqueio — nunca cancela/move nada sozinho, só informa (mesma regra do
/// Web, `conflitos-dialog.tsx`). Devolve `true` só se a pessoa escolher
/// "Criar mesmo assim".
class _ConflitosSheet extends StatefulWidget {
  final String companyId;
  final String professionalId;
  final List<Map<String, dynamic>> conflitos;

  const _ConflitosSheet({required this.companyId, required this.professionalId, required this.conflitos});

  @override
  State<_ConflitosSheet> createState() => _ConflitosSheetState();
}

class _ConflitosSheetState extends State<_ConflitosSheet> {
  final Set<String> _resolvidos = {};

  Future<void> _cancelar(Map<String, dynamic> c) async {
    final confirmar = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Cancelar agendamento?'),
        content: Text('"${c['client_name']}" · ${c['service_name']} em ${_dataHora.format(DateTime.parse(c['scheduled_at']).toLocal())} será cancelado.'),
        actions: [
          TextButton(onPressed: () => Navigator.of(context).pop(false), child: const Text('Voltar')),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: Theme.of(context).colorScheme.error),
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('Cancelar agendamento'),
          ),
        ],
      ),
    );
    if (confirmar != true) return;
    await supabase.from('appointments').update({'status': 'canceled'}).eq('id', c['appointment_id']);
    if (!mounted) return;
    setState(() => _resolvidos.add(c['appointment_id'] as String));
  }

  Future<void> _reagendar(Map<String, dynamic> c) async {
    final reagendou = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      builder: (_) => ReagendarSheet(
        appointmentId: c['appointment_id'] as String,
        companyId: widget.companyId,
        professionalId: widget.professionalId,
        serviceId: c['service_id'] as String,
        clienteNome: c['client_name'] as String,
        servicoNome: c['service_name'] as String,
      ),
    );
    if (reagendou == true && mounted) setState(() => _resolvidos.add(c['appointment_id'] as String));
  }

  @override
  Widget build(BuildContext context) {
    final pendentes = widget.conflitos.where((c) => !_resolvidos.contains(c['appointment_id'])).length;
    return DraggableScrollableSheet(
      initialChildSize: 0.75,
      minChildSize: 0.4,
      maxChildSize: 0.95,
      expand: false,
      builder: (context, scrollController) => Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(children: [
              Icon(Icons.warning_amber_rounded, color: Theme.of(context).colorScheme.error),
              const SizedBox(width: 8),
              Expanded(child: Text('$pendentes agendamento${pendentes == 1 ? '' : 's'} neste período', style: Theme.of(context).textTheme.titleMedium)),
            ]),
            const SizedBox(height: 4),
            const Text(
              'Criar o bloqueio não cancela nem move esses agendamentos automaticamente. Reagende ou cancele cada um, ou crie mesmo assim e resolva depois.',
              style: TextStyle(fontSize: 12, color: Colors.grey),
            ),
            const SizedBox(height: 12),
            Expanded(
              child: ListView.separated(
                controller: scrollController,
                itemCount: widget.conflitos.length,
                separatorBuilder: (_, __) => const SizedBox(height: 8),
                itemBuilder: (context, index) {
                  final c = widget.conflitos[index];
                  final resolvido = _resolvidos.contains(c['appointment_id']);
                  return Card(
                    child: Padding(
                      padding: const EdgeInsets.all(12),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(c['client_name'] as String, style: const TextStyle(fontWeight: FontWeight.w600)),
                          Text(
                            '${c['service_name']} · ${_dataHora.format(DateTime.parse(c['scheduled_at']).toLocal())}',
                            style: const TextStyle(fontSize: 12, color: Colors.grey),
                          ),
                          if (resolvido)
                            const Padding(padding: EdgeInsets.only(top: 6), child: Text('Resolvido', style: TextStyle(fontSize: 12, color: Colors.grey)))
                          else
                            Padding(
                              padding: const EdgeInsets.only(top: 8),
                              child: Row(children: [
                                OutlinedButton.icon(onPressed: () => _reagendar(c), icon: const Icon(Icons.calendar_month, size: 16), label: const Text('Reagendar')),
                                const SizedBox(width: 8),
                                OutlinedButton.icon(
                                  onPressed: () => _cancelar(c),
                                  icon: const Icon(Icons.close, size: 16),
                                  label: const Text('Cancelar'),
                                  style: OutlinedButton.styleFrom(foregroundColor: Theme.of(context).colorScheme.error),
                                ),
                              ]),
                            ),
                        ],
                      ),
                    ),
                  );
                },
              ),
            ),
            const SizedBox(height: 8),
            Row(children: [
              Expanded(child: OutlinedButton(onPressed: () => Navigator.of(context).pop(false), child: const Text('Voltar'))),
              const SizedBox(width: 8),
              Expanded(child: FilledButton(onPressed: () => Navigator.of(context).pop(true), child: const Text('Criar mesmo assim'))),
            ]),
          ],
        ),
      ),
    );
  }
}
