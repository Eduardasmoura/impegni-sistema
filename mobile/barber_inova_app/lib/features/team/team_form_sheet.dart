import 'package:flutter/material.dart';
import '../../data/supabase_client.dart';

/// Criar/editar profissional — mesmos campos de
/// `apps/web-professional/.../equipe/equipe-view.tsx`.
class TeamFormSheet extends StatefulWidget {
  final String companyId;
  final Map<String, dynamic>? profissional;

  const TeamFormSheet({super.key, required this.companyId, this.profissional});

  @override
  State<TeamFormSheet> createState() => _TeamFormSheetState();
}

class _TeamFormSheetState extends State<TeamFormSheet> {
  late final _nameController = TextEditingController(text: widget.profissional?['name'] as String? ?? '');
  late final _roleController = TextEditingController(text: widget.profissional?['role_title'] as String? ?? '');
  late final _startController = TextEditingController(text: (widget.profissional?['start_time'] as String?)?.substring(0, 5) ?? '09:00');
  late final _endController = TextEditingController(text: (widget.profissional?['end_time'] as String?)?.substring(0, 5) ?? '18:00');
  final _commissionController = TextEditingController();
  late bool _active = widget.profissional?['active'] as bool? ?? true;
  String _commissionType = 'percentage';
  bool _saving = false;
  bool _loadingCommission = false;
  String? _error;

  bool get _editando => widget.profissional != null;

  @override
  void initState() {
    super.initState();
    if (_editando) _carregarComissaoAtual();
  }

  // Comissão vigente é a vigência aberta (effective_to is null) de
  // professional_commissions (migration 054) — não uma coluna direta em
  // professionals. Mesmo motivo do web: trocar a comissão fecha essa
  // vigência e abre outra, preservando o valor válido em cada atendimento
  // passado.
  Future<void> _carregarComissaoAtual() async {
    setState(() => _loadingCommission = true);
    final rows = await supabase
        .from('professional_commissions')
        .select('commission_type, commission_value')
        .eq('professional_id', widget.profissional!['id'] as String)
        .isFilter('effective_to', null)
        .limit(1);
    if (!mounted) return;
    if (rows.isNotEmpty) {
      final row = rows.first;
      setState(() {
        _commissionType = row['commission_type'] as String;
        _commissionController.text = (row['commission_value'] as num).toString();
      });
    }
    setState(() => _loadingCommission = false);
  }

  @override
  void dispose() {
    _nameController.dispose();
    _roleController.dispose();
    _startController.dispose();
    _endController.dispose();
    _commissionController.dispose();
    super.dispose();
  }

  Future<void> _salvar() async {
    if (_nameController.text.trim().isEmpty) return;
    setState(() {
      _saving = true;
      _error = null;
    });
    final payload = {
      'name': _nameController.text.trim(),
      'role_title': _roleController.text.trim().isEmpty ? null : _roleController.text.trim(),
      'start_time': _startController.text,
      'end_time': _endController.text,
      'active': _active,
    };
    try {
      String professionalId;
      if (_editando) {
        professionalId = widget.profissional!['id'] as String;
        await supabase.from('professionals').update(payload).eq('id', professionalId);
      } else {
        final inserted = await supabase.from('professionals').insert({'company_id': widget.companyId, ...payload}).select('id').single();
        professionalId = inserted['id'] as String;
      }
      if (_commissionController.text.trim().isNotEmpty) {
        await supabase.rpc('set_professional_commission', params: {
          'p_professional_id': professionalId,
          'p_commission_type': _commissionType,
          'p_commission_value': double.tryParse(_commissionController.text.replaceAll(',', '.')) ?? 0,
        });
      }
      if (mounted) Navigator.of(context).pop(true);
    } catch (e) {
      // Cai aqui também quando o gatilho `enforce_limit_professionals`
      // bloqueia (plano sem espaço pra mais um profissional) — a mensagem
      // de erro do Postgres já vem pronta em PT-BR.
      setState(() => _error = e.toString().contains('permite até') ? _mensagemDoPlano(e) : 'Não foi possível salvar. Tente de novo.');
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  String _mensagemDoPlano(Object e) {
    final texto = e.toString();
    final inicio = texto.indexOf('Seu plano');
    if (inicio == -1) return 'Seu plano não permite mais profissionais.';
    final fim = texto.indexOf(RegExp(r'[.!]\s*$'), inicio);
    return texto.substring(inicio, fim == -1 ? texto.length : fim + 1);
  }

  Future<void> _escolherHorario(TextEditingController controller) async {
    final partes = controller.text.split(':');
    final inicial = TimeOfDay(hour: int.tryParse(partes[0]) ?? 9, minute: int.tryParse(partes.length > 1 ? partes[1] : '0') ?? 0);
    final escolhido = await showTimePicker(context: context, initialTime: inicial);
    if (escolhido != null) {
      controller.text = '${escolhido.hour.toString().padLeft(2, '0')}:${escolhido.minute.toString().padLeft(2, '0')}';
    }
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
            Text(_editando ? 'Editar profissional' : 'Novo profissional', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 16),
            if (_error != null) ...[
              Text(_error!, style: const TextStyle(color: Colors.red)),
              const SizedBox(height: 8),
            ],
            TextField(controller: _nameController, decoration: const InputDecoration(labelText: 'Nome', border: OutlineInputBorder())),
            const SizedBox(height: 12),
            TextField(
              controller: _roleController,
              decoration: const InputDecoration(labelText: 'Cargo', hintText: 'Ex: barbeiro', border: OutlineInputBorder()),
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _startController,
                    readOnly: true,
                    onTap: () => _escolherHorario(_startController),
                    decoration: const InputDecoration(labelText: 'Início', border: OutlineInputBorder()),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: TextField(
                    controller: _endController,
                    readOnly: true,
                    onTap: () => _escolherHorario(_endController),
                    decoration: const InputDecoration(labelText: 'Fim', border: OutlineInputBorder()),
                  ),
                ),
              ],
            ),
            SwitchListTile(
              contentPadding: EdgeInsets.zero,
              title: const Text('Ativo (aparece pro cliente agendar)'),
              value: _active,
              onChanged: (v) => setState(() => _active = v),
            ),
            const Divider(height: 24),
            Text('Comissão', style: Theme.of(context).textTheme.titleSmall),
            const SizedBox(height: 4),
            Text(
              'Deixe em branco pra não alterar. Trocar aqui não muda repasses já fechados.',
              style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
            ),
            const SizedBox(height: 8),
            if (_loadingCommission)
              const Center(child: Padding(padding: EdgeInsets.all(8), child: CircularProgressIndicator(strokeWidth: 2)))
            else
              Row(
                children: [
                  Expanded(
                    child: DropdownButtonFormField<String>(
                      initialValue: _commissionType,
                      decoration: const InputDecoration(border: OutlineInputBorder(), isDense: true),
                      items: const [
                        DropdownMenuItem(value: 'percentage', child: Text('Percentual (%)')),
                        DropdownMenuItem(value: 'fixed', child: Text('Valor fixo (R\$)')),
                      ],
                      onChanged: (v) => setState(() => _commissionType = v ?? 'percentage'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: TextField(
                      controller: _commissionController,
                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                      decoration: InputDecoration(
                        border: const OutlineInputBorder(),
                        isDense: true,
                        hintText: _commissionType == 'percentage' ? 'Ex: 40' : 'Ex: 20,00',
                      ),
                    ),
                  ),
                ],
              ),
            const SizedBox(height: 16),
            FilledButton(onPressed: _saving ? null : _salvar, child: Text(_saving ? 'Salvando...' : 'Salvar')),
          ],
        ),
      ),
    );
  }
}
