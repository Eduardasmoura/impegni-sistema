import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../data/supabase_client.dart';

/// Reagendamento — mesma RPC e mesmas RPCs de disponibilidade já usadas
/// pelo reagendamento do cliente e agora do Web-profissional
/// (`get_availability_month/day` já descontam expediente, bloqueios e
/// outros agendamentos; `reschedule_appointment` já autoriza staff via
/// `is_company_member` e agora também registra em `audit_logs`) — nenhuma
/// regra nova, só a UI mobile que faltava.
class ReagendarSheet extends StatefulWidget {
  final String appointmentId;
  final String companyId;
  final String professionalId;
  final String serviceId;
  final String clienteNome;
  final String servicoNome;

  const ReagendarSheet({
    super.key,
    required this.appointmentId,
    required this.companyId,
    required this.professionalId,
    required this.serviceId,
    required this.clienteNome,
    required this.servicoNome,
  });

  @override
  State<ReagendarSheet> createState() => _ReagendarSheetState();
}

class _ReagendarSheetState extends State<ReagendarSheet> {
  late DateTime _viewMonth = DateTime(DateTime.now().year, DateTime.now().month);
  Map<String, int> _countsByDay = {};
  bool _carregandoMes = true;
  String? _diaEscolhido;
  List<String> _horariosDoDia = [];
  bool _carregandoHorarios = false;
  String? _horaEscolhida;
  bool _salvando = false;
  String? _erro;

  @override
  void initState() {
    super.initState();
    _carregarMes();
  }

  Future<void> _carregarMes() async {
    setState(() => _carregandoMes = true);
    final monthKey = '${_viewMonth.year}-${_viewMonth.month.toString().padLeft(2, '0')}-01';
    final rows = await supabase.rpc('get_availability_month', params: {
      'p_company_id': widget.companyId,
      'p_professional_id': widget.professionalId,
      'p_service_id': widget.serviceId,
      'p_month': monthKey,
    });
    if (!mounted) return;
    final map = <String, int>{};
    for (final r in List<Map<String, dynamic>>.from(rows)) {
      map[r['day'] as String] = r['available_count'] as int;
    }
    setState(() {
      _countsByDay = map;
      _carregandoMes = false;
    });
  }

  Future<void> _carregarHorarios(String dia) async {
    setState(() {
      _diaEscolhido = dia;
      _horaEscolhida = null;
      _carregandoHorarios = true;
    });
    final rows = await supabase.rpc('get_availability_day', params: {
      'p_company_id': widget.companyId,
      'p_professional_id': widget.professionalId,
      'p_service_id': widget.serviceId,
      'p_day': dia,
    });
    if (!mounted) return;
    setState(() {
      _horariosDoDia = List<Map<String, dynamic>>.from(rows).map((r) => (r['slot_time'] as String).substring(0, 5)).toList();
      _carregandoHorarios = false;
    });
  }

  Future<void> _confirmar() async {
    if (_diaEscolhido == null || _horaEscolhida == null) return;
    setState(() {
      _salvando = true;
      _erro = null;
    });
    final novoHorario = DateTime.parse('${_diaEscolhido!}T$_horaEscolhida:00').toUtc().toIso8601String();
    try {
      await supabase.rpc('reschedule_appointment', params: {
        'p_appointment_id': widget.appointmentId,
        'p_new_scheduled_at': novoHorario,
      });
      if (mounted) Navigator.of(context).pop(true);
    } catch (e) {
      setState(() => _erro = 'Não foi possível reagendar. Tente outro horário.');
    } finally {
      if (mounted) setState(() => _salvando = false);
    }
  }

  void _mudarMes(int delta) {
    setState(() {
      _viewMonth = DateTime(_viewMonth.year, _viewMonth.month + delta);
      _diaEscolhido = null;
      _horaEscolhida = null;
      _horariosDoDia = [];
    });
    _carregarMes();
  }

  @override
  Widget build(BuildContext context) {
    final hoje = DateTime.now();
    final hojeStr = DateFormat('yyyy-MM-dd').format(hoje);
    final diasNoMes = DateTime(_viewMonth.year, _viewMonth.month + 1, 0).day;
    final primeiroDiaSemana = DateTime(_viewMonth.year, _viewMonth.month, 1).weekday % 7; // 0=domingo

    return DraggableScrollableSheet(
      initialChildSize: 0.85,
      minChildSize: 0.5,
      maxChildSize: 0.95,
      expand: false,
      builder: (context, scrollController) => Padding(
        padding: const EdgeInsets.all(16),
        child: ListView(
          controller: scrollController,
          children: [
            Text('Reagendar', style: Theme.of(context).textTheme.titleMedium),
            Text('${widget.clienteNome} · ${widget.servicoNome}', style: const TextStyle(color: Colors.grey)),
            const SizedBox(height: 16),
            if (_erro != null) ...[
              Text(_erro!, style: const TextStyle(color: Colors.red)),
              const SizedBox(height: 8),
            ],
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                IconButton(onPressed: () => _mudarMes(-1), icon: const Icon(Icons.chevron_left)),
                Text(DateFormat("MMMM 'de' y", 'pt_BR').format(_viewMonth), style: const TextStyle(fontWeight: FontWeight.bold)),
                IconButton(onPressed: () => _mudarMes(1), icon: const Icon(Icons.chevron_right)),
              ],
            ),
            if (_carregandoMes)
              const Padding(padding: EdgeInsets.symmetric(vertical: 24), child: Center(child: CircularProgressIndicator()))
            else
              GridView.count(
                crossAxisCount: 7,
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                children: [
                  ...List.generate(primeiroDiaSemana, (_) => const SizedBox()),
                  ...List.generate(diasNoMes, (i) {
                    final dia = i + 1;
                    final diaStr = '${_viewMonth.year}-${_viewMonth.month.toString().padLeft(2, '0')}-${dia.toString().padLeft(2, '0')}';
                    final passado = diaStr.compareTo(hojeStr) < 0;
                    final count = _countsByDay[diaStr] ?? 0;
                    final selecionado = _diaEscolhido == diaStr;
                    final cor = count <= 0 ? Colors.grey.shade300 : count <= 2 ? Colors.red : count <= 5 ? Colors.orange : Colors.green;
                    return Padding(
                      padding: const EdgeInsets.all(2),
                      child: InkWell(
                        onTap: passado ? null : () => _carregarHorarios(diaStr),
                        borderRadius: BorderRadius.circular(8),
                        child: Container(
                          decoration: BoxDecoration(
                            border: Border.all(color: selecionado ? Theme.of(context).colorScheme.primary : Colors.transparent, width: 2),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Text('$dia', style: TextStyle(color: passado ? Colors.grey.shade400 : null)),
                              if (!passado) Container(width: 16, height: 3, decoration: BoxDecoration(color: cor, borderRadius: BorderRadius.circular(2))),
                            ],
                          ),
                        ),
                      ),
                    );
                  }),
                ],
              ),
            if (_diaEscolhido != null) ...[
              const SizedBox(height: 16),
              const Text('Horários disponíveis', style: TextStyle(fontWeight: FontWeight.bold)),
              const SizedBox(height: 8),
              if (_carregandoHorarios)
                const Center(child: CircularProgressIndicator())
              else if (_horariosDoDia.isEmpty)
                const Text('Nenhum horário disponível neste dia.', style: TextStyle(color: Colors.grey))
              else
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: _horariosDoDia.map((h) {
                    final selecionado = _horaEscolhida == h;
                    return ChoiceChip(
                      label: Text(h),
                      selected: selecionado,
                      onSelected: (_) => setState(() => _horaEscolhida = h),
                    );
                  }).toList(),
                ),
            ],
            const SizedBox(height: 20),
            FilledButton(
              onPressed: (_diaEscolhido == null || _horaEscolhida == null || _salvando) ? null : _confirmar,
              child: Text(_salvando ? 'Remarcando...' : 'Confirmar novo horário'),
            ),
          ],
        ),
      ),
    );
  }
}
