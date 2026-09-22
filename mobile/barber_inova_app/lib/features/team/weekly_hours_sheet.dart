import 'package:flutter/material.dart';
import '../../data/supabase_client.dart';

// Domingo=0..Sábado=6 — mesma convenção da coluna `weekday` no banco
// (extract(dow from date)), sem nenhuma conversão. Ordem de exibição
// Segunda→Domingo, não a ordem numérica da coluna.
const _dias = [
  (weekday: 1, label: 'Segunda'),
  (weekday: 2, label: 'Terça'),
  (weekday: 3, label: 'Quarta'),
  (weekday: 4, label: 'Quinta'),
  (weekday: 5, label: 'Sexta'),
  (weekday: 6, label: 'Sábado'),
  (weekday: 0, label: 'Domingo'),
];

/// Expediente por dia da semana — evolução de `professionals.start_time`/
/// `end_time` (continuam existindo, viram o valor de partida/fallback pra
/// quem nunca abrir esta tela). Salva as 7 linhas de uma vez em
/// `professional_weekly_hours`; o backend já sabe priorizar essas linhas
/// sobre o campo legado (mesma RPC/trigger usados por disponibilidade,
/// reagendamento e calendário de ocupação) — nenhuma outra tela mobile
/// precisou mudar.
class WeeklyHoursSheet extends StatefulWidget {
  final String companyId;
  final Map<String, dynamic> professional;

  const WeeklyHoursSheet({super.key, required this.companyId, required this.professional});

  @override
  State<WeeklyHoursSheet> createState() => _WeeklyHoursSheetState();
}

class _DiaForm {
  bool active;
  String startTime;
  String endTime;

  _DiaForm({required this.active, required this.startTime, required this.endTime});
}

class _WeeklyHoursSheetState extends State<WeeklyHoursSheet> {
  bool _loading = true;
  bool _salvando = false;
  String? _erro;
  final Map<int, _DiaForm> _porDia = {};

  @override
  void initState() {
    super.initState();
    _carregar();
  }

  Future<void> _carregar() async {
    final rows = await supabase
        .from('professional_weekly_hours')
        .select('weekday, active, start_time, end_time')
        .eq('professional_id', widget.professional['id'] as String);
    if (!mounted) return;
    final existentes = {for (final r in List<Map<String, dynamic>>.from(rows)) r['weekday'] as int: r};
    final legadoInicio = ((widget.professional['start_time'] as String?) ?? '09:00').substring(0, 5);
    final legadoFim = ((widget.professional['end_time'] as String?) ?? '18:00').substring(0, 5);
    setState(() {
      for (final d in _dias) {
        final linha = existentes[d.weekday];
        _porDia[d.weekday] = linha == null
            ? _DiaForm(active: true, startTime: legadoInicio, endTime: legadoFim)
            : _DiaForm(
                active: linha['active'] as bool,
                startTime: ((linha['start_time'] as String?) ?? legadoInicio).substring(0, 5),
                endTime: ((linha['end_time'] as String?) ?? legadoFim).substring(0, 5),
              );
      }
      _loading = false;
    });
  }

  Future<void> _escolherHora(int weekday, {required bool fim}) async {
    final dia = _porDia[weekday]!;
    final atual = fim ? dia.endTime : dia.startTime;
    final partes = atual.split(':');
    final inicial = TimeOfDay(hour: int.tryParse(partes[0]) ?? 9, minute: int.tryParse(partes.length > 1 ? partes[1] : '0') ?? 0);
    final escolhido = await showTimePicker(context: context, initialTime: inicial);
    if (escolhido == null) return;
    final formatado = '${escolhido.hour.toString().padLeft(2, '0')}:${escolhido.minute.toString().padLeft(2, '0')}';
    setState(() {
      if (fim) {
        dia.endTime = formatado;
      } else {
        dia.startTime = formatado;
      }
    });
  }

  Future<void> _salvar() async {
    setState(() {
      _salvando = true;
      _erro = null;
    });
    final payload = _dias.map((d) {
      final dia = _porDia[d.weekday]!;
      return {
        'company_id': widget.companyId,
        'professional_id': widget.professional['id'],
        'weekday': d.weekday,
        'active': dia.active,
        'start_time': dia.active ? dia.startTime : null,
        'end_time': dia.active ? dia.endTime : null,
      };
    }).toList();
    try {
      await supabase.from('professional_weekly_hours').upsert(payload, onConflict: 'professional_id,weekday');
      if (mounted) Navigator.of(context).pop(true);
    } catch (e) {
      setState(() => _erro = 'Não foi possível salvar. Tente de novo.');
    } finally {
      if (mounted) setState(() => _salvando = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return DraggableScrollableSheet(
      initialChildSize: 0.85,
      minChildSize: 0.5,
      maxChildSize: 0.95,
      expand: false,
      builder: (context, scrollController) => Padding(
        padding: const EdgeInsets.all(16),
        child: _loading
            ? const Center(child: CircularProgressIndicator())
            : ListView(
                controller: scrollController,
                children: [
                  Text('Horários de atendimento', style: Theme.of(context).textTheme.titleMedium),
                  Text(widget.professional['name'] as String? ?? '', style: const TextStyle(color: Colors.grey)),
                  const SizedBox(height: 16),
                  if (_erro != null) ...[Text(_erro!, style: const TextStyle(color: Colors.red)), const SizedBox(height: 8)],
                  ..._dias.map((d) {
                    final dia = _porDia[d.weekday]!;
                    return Padding(
                      padding: const EdgeInsets.symmetric(vertical: 6),
                      child: Row(
                        children: [
                          SizedBox(width: 72, child: Text(d.label, style: const TextStyle(fontWeight: FontWeight.w600))),
                          Expanded(
                            child: dia.active
                                ? Row(
                                    children: [
                                      Expanded(
                                        child: OutlinedButton(
                                          onPressed: () => _escolherHora(d.weekday, fim: false),
                                          child: Text(dia.startTime),
                                        ),
                                      ),
                                      const Padding(padding: EdgeInsets.symmetric(horizontal: 6), child: Text('até')),
                                      Expanded(
                                        child: OutlinedButton(
                                          onPressed: () => _escolherHora(d.weekday, fim: true),
                                          child: Text(dia.endTime),
                                        ),
                                      ),
                                    ],
                                  )
                                : const Text('Fechado', style: TextStyle(color: Colors.grey)),
                          ),
                          Switch(
                            value: dia.active,
                            onChanged: (v) => setState(() => dia.active = v),
                          ),
                        ],
                      ),
                    );
                  }),
                  const SizedBox(height: 8),
                  const Text(
                    'Bloqueios pontuais, folgas e férias continuam em Agenda → Bloqueios, folgas e férias — isto aqui é só o expediente que se repete toda semana.',
                    style: TextStyle(fontSize: 11, color: Colors.grey),
                  ),
                  const SizedBox(height: 16),
                  FilledButton(
                    onPressed: _salvando ? null : _salvar,
                    child: Text(_salvando ? 'Salvando...' : 'Salvar horários'),
                  ),
                ],
              ),
      ),
    );
  }
}
