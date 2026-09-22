import 'package:flutter/material.dart';
import '../../data/supabase_client.dart';
import '../clients/anamnesis_form_resolver.dart';

/// Criar/editar serviço — versão simplificada do formulário web (sem
/// descrição/foto por enquanto, mesmo espírito de "versão simplificada"
/// já usado no Estoque mobile). `servico` preenchido = edição.
class ServiceFormSheet extends StatefulWidget {
  final String companyId;
  final Map<String, dynamic>? servico;

  const ServiceFormSheet({super.key, required this.companyId, this.servico});

  @override
  State<ServiceFormSheet> createState() => _ServiceFormSheetState();
}

class _ServiceFormSheetState extends State<ServiceFormSheet> {
  late final _nameController = TextEditingController(text: widget.servico?['name'] as String? ?? '');
  late final _priceController = TextEditingController(text: widget.servico?['price']?.toString() ?? '');
  late final _durationController = TextEditingController(text: widget.servico?['duration_min']?.toString() ?? '30');
  late bool _active = widget.servico?['active'] as bool? ?? true;
  bool _saving = false;
  String? _error;
  // Ficha de anamnese usada por este serviço (só fichas da própria empresa —
  // RLS + FK composta no banco recusam qualquer outra). '' = nenhuma.
  late String _fichaId = widget.servico?['anamnesis_form_id'] as String? ?? '';
  List<Map<String, dynamic>> _fichas = [];

  @override
  void initState() {
    super.initState();
    _carregarFichas();
  }

  Future<void> _carregarFichas() async {
    try {
      final rows = await supabase
          .from('anamnesis_forms')
          .select('id, title, active, company_id, segments(name)')
          .eq('company_id', widget.companyId)
          .order('created_at', ascending: true);
      if (!mounted) return;
      setState(() => _fichas = List<Map<String, dynamic>>.from(rows));
    } catch (_) {
      // sem acesso ao recurso: o campo simplesmente não aparece
    }
  }

  bool get _editando => widget.servico != null;

  @override
  void dispose() {
    _nameController.dispose();
    _priceController.dispose();
    _durationController.dispose();
    super.dispose();
  }

  Future<void> _salvar() async {
    final preco = double.tryParse(_priceController.text.replaceAll(',', '.'));
    final duracao = int.tryParse(_durationController.text);
    if (_nameController.text.trim().isEmpty || preco == null || duracao == null) {
      setState(() => _error = 'Preencha nome, preço e duração corretamente.');
      return;
    }
    setState(() {
      _saving = true;
      _error = null;
    });
    final payload = {
      'name': _nameController.text.trim(),
      'price': preco,
      'duration_min': duracao,
      'active': _active,
      // só toca no vínculo quando o campo está visível (evita apagar um vínculo existente sem querer)
      if (_fichas.isNotEmpty) 'anamnesis_form_id': _fichaId.isEmpty ? null : _fichaId,
    };
    try {
      if (_editando) {
        await supabase.from('services').update(payload).eq('id', widget.servico!['id'] as String);
      } else {
        await supabase.from('services').insert({'company_id': widget.companyId, ...payload});
      }
      if (mounted) Navigator.of(context).pop(true);
    } catch (e) {
      setState(() => _error = 'Não foi possível salvar. Tente de novo.');
    } finally {
      if (mounted) setState(() => _saving = false);
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
            Text(_editando ? 'Editar serviço' : 'Novo serviço', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 16),
            if (_error != null) ...[
              Text(_error!, style: const TextStyle(color: Colors.red)),
              const SizedBox(height: 8),
            ],
            TextField(
              controller: _nameController,
              decoration: const InputDecoration(labelText: 'Nome do serviço', border: OutlineInputBorder()),
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _priceController,
                    keyboardType: const TextInputType.numberWithOptions(decimal: true),
                    decoration: const InputDecoration(labelText: 'Preço (R\$)', border: OutlineInputBorder()),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: TextField(
                    controller: _durationController,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(labelText: 'Duração (min)', border: OutlineInputBorder()),
                  ),
                ),
              ],
            ),
            if (_fichas.isNotEmpty) ...[
              const SizedBox(height: 12),
              DropdownButtonFormField<String>(
                initialValue: _fichaId,
                decoration: const InputDecoration(
                  labelText: 'Ficha de anamnese',
                  helperText: 'Ao atender este serviço, essa ficha é escolhida automaticamente.',
                  border: OutlineInputBorder(),
                ),
                items: [
                  const DropdownMenuItem(value: '', child: Text('Nenhuma')),
                  for (final f in _fichas.where((f) => f['active'] == true || f['id'] == _fichaId))
                    DropdownMenuItem(value: f['id'] as String, child: Text('${anamnesisFormLabel(f)}${f['active'] == true ? '' : ' (inativa)'}')),
                ],
                onChanged: (v) => setState(() => _fichaId = v ?? ''),
              ),
            ],
            const SizedBox(height: 4),
            SwitchListTile(
              contentPadding: EdgeInsets.zero,
              title: const Text('Ativo (aparece pro cliente agendar)'),
              value: _active,
              onChanged: (v) => setState(() => _active = v),
            ),
            const SizedBox(height: 16),
            FilledButton(
              onPressed: _saving ? null : _salvar,
              child: Text(_saving ? 'Salvando...' : 'Salvar'),
            ),
          ],
        ),
      ),
    );
  }
}
