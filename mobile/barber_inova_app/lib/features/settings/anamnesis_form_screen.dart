import 'package:flutter/material.dart';
import '../../app/app_drawer.dart';
import '../../data/supabase_client.dart';
import '../clients/anamnesis_form_resolver.dart';
import 'package:supabase_flutter/supabase_flutter.dart' show PostgrestException;

const _tipos = [
  (value: 'text', label: 'Texto curto'),
  (value: 'textarea', label: 'Texto longo'),
  (value: 'number', label: 'Número'),
  (value: 'date', label: 'Data'),
  (value: 'boolean', label: 'Sim / Não'),
  (value: 'single_choice', label: 'Seleção única'),
  (value: 'multiple_choice', label: 'Múltipla escolha'),
];
final _tipoLabel = {for (final t in _tipos) t.value: t.label};

/// Construtor do formulário de anamnese — porta direta de
/// `apps/web-professional/.../anamnese/anamnese-view.tsx`. Antes só existia
/// no Web; o Mobile só tinha `anamnese_ficha_sheet.dart` (preenche a ficha
/// de um cliente com as perguntas já configuradas, nunca cria/edita
/// pergunta). Mesmas tabelas (`anamnesis_forms`, `anamnesis_fields`),
/// nenhuma mudança de backend. Reordenar é por botão pra cima/baixo em vez
/// de arrastar — mesma simplificação já usada em outras telas deste app.
class AnamnesisFormScreen extends StatefulWidget {
  final String companyId;

  const AnamnesisFormScreen({super.key, required this.companyId});

  @override
  State<AnamnesisFormScreen> createState() => _AnamnesisFormScreenState();
}

class _AnamnesisFormScreenState extends State<AnamnesisFormScreen> {
  bool _loading = true;
  // Uma ficha por segmento de atuação: a empresa pode ter várias. A tela edita
  // a ficha selecionada (nunca assume que existe só uma).
  List<Map<String, dynamic>> _formularios = [];
  String? _formIdSel;
  List<Map<String, dynamic>> _campos = [];
  Map<String, dynamic>? get _formulario {
    for (final f in _formularios) {
      if (f['id'] == _formIdSel) return f;
    }
    for (final f in _formularios) {
      if (f['active'] == true) return f;
    }
    return _formularios.isEmpty ? null : _formularios.first;
  }
  // Plano Basic (migration 093) tem anamnese, mas travada num template
  // padrão — só quem tem `anamnesis_customizable` pode criar/editar/
  // reordenar/excluir pergunta (aplicado de verdade por trigger no banco,
  // `enforce_anamnesis_customization`; isto aqui só decide o que a UI
  // mostra). Fail-open se não conseguir resolver o plano — quem decide de
  // verdade é sempre o banco.
  bool _canCustomize = true;

  @override
  void initState() {
    super.initState();
    _carregar();
  }

  Future<bool> _resolverCustomizacao() async {
    try {
      final sub = await supabase
          .from('subscriptions')
          .select('plan_id')
          .eq('company_id', widget.companyId)
          .order('created_at', ascending: false)
          .limit(1)
          .maybeSingle();
      if (sub == null) return true;
      final feature = await supabase
          .from('plan_features')
          .select('enabled')
          .eq('plan_id', sub['plan_id'] as String)
          .eq('feature_key', 'anamnesis_customizable')
          .maybeSingle();
      if (feature == null) return true;
      return feature['enabled'] as bool? ?? true;
    } catch (_) {
      return true;
    }
  }

  Future<List<Map<String, dynamic>>> _buscarFormularios() async {
    return List<Map<String, dynamic>>.from(
      await supabase.from('anamnesis_forms').select('*, segments(name)').eq('company_id', widget.companyId).order('created_at', ascending: true),
    );
  }

  Future<void> _carregar() async {
    setState(() => _loading = true);
    final canCustomize = await _resolverCustomizacao();
    var formularios = await _buscarFormularios();
    // Nenhuma ficha ainda: cria uma automaticamente (mesmo fluxo do Web). Se o
    // plano não é customizável, o próprio banco semeia o template padrão.
    if (formularios.isEmpty) {
      try {
        await supabase.from('anamnesis_forms').insert({'company_id': widget.companyId, 'title': 'Anamnese'});
      } catch (_) {
        // criada por chamada concorrente — só recarrega
      }
      formularios = await _buscarFormularios();
    }
    if (!mounted) return;
    setState(() {
      _formularios = formularios;
      _canCustomize = canCustomize;
    });
    await _carregarCampos();
    if (mounted) setState(() => _loading = false);
  }

  Future<void> _carregarCampos() async {
    final f = _formulario;
    final campos = f == null
        ? <Map<String, dynamic>>[]
        : List<Map<String, dynamic>>.from(
            await supabase
                .from('anamnesis_fields')
                .select('*')
                .eq('form_id', f['id'] as String)
                .isFilter('archived_at', null)
                .order('sort_order', ascending: true),
          );
    if (!mounted) return;
    setState(() => _campos = campos);
  }

  Future<void> _alternarAtivo(bool v) async {
    if (_formulario == null) return;
    await supabase.from('anamnesis_forms').update({'active': v}).eq('id', _formulario!['id']);
    setState(() => _formularios = [
          for (final f in _formularios) f['id'] == _formulario!['id'] ? {...f, 'active': v} : f,
        ]);
  }

  Future<void> _abrirFormulario({Map<String, dynamic>? campo}) async {
    if (_formulario == null) return;
    final salvou = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      builder: (_) => _PerguntaFormSheet(formId: _formulario!['id'] as String, campo: campo, ordemAtual: _campos.length),
    );
    if (salvou == true) _carregarCampos();
  }

  Future<void> _excluir(Map<String, dynamic> campo) async {
    final confirmar = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Excluir pergunta?'),
        content: Text('"${campo['label']}" some do formulário. Respostas já preenchidas por clientes continuam guardadas no histórico.'),
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
    try {
      await supabase.from('anamnesis_fields').delete().eq('id', campo['id']);
    } on PostgrestException catch (e) {
      // Pergunta com respostas não pode ser apagada (o banco bloqueia pra nunca
      // destruir histórico): vira "arquivada" — sai da ficha, respostas ficam.
      if (e.code == 'P0001' && e.message.contains('respostas')) {
        await supabase.from('anamnesis_fields').update({'archived_at': DateTime.now().toUtc().toIso8601String()}).eq('id', campo['id']);
        if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Pergunta arquivada — o histórico foi preservado.')));
      } else {
        rethrow;
      }
    }
    _carregarCampos();
  }

  Future<void> _mover(Map<String, dynamic> campo, int direcao) async {
    final idx = _campos.indexWhere((c) => c['id'] == campo['id']);
    final vizinhoIdx = idx + direcao;
    if (vizinhoIdx < 0 || vizinhoIdx >= _campos.length) return;
    final vizinho = _campos[vizinhoIdx];
    await Future.wait([
      supabase.from('anamnesis_fields').update({'sort_order': vizinho['sort_order']}).eq('id', campo['id']),
      supabase.from('anamnesis_fields').update({'sort_order': campo['sort_order']}).eq('id', vizinho['id']),
    ]);
    _carregarCampos();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      drawer: const AppDrawer(),
      appBar: AppBar(
        title: const Text('Anamnese'),
        actions: [
          if (_formulario != null)
            Padding(
              padding: const EdgeInsets.only(right: 8),
              child: Row(
                children: [
                  const Text('Ativo', style: TextStyle(fontSize: 13)),
                  Switch(value: _formulario!['active'] as bool? ?? false, onChanged: _alternarAtivo),
                ],
              ),
            ),
        ],
      ),
      floatingActionButton: _canCustomize
          ? FloatingActionButton.extended(
              onPressed: () => _abrirFormulario(),
              icon: const Icon(Icons.add),
              label: const Text('Pergunta'),
            )
          : null,
      body: SafeArea(
        top: false,
        child: _loading
            ? const Center(child: CircularProgressIndicator())
            : Column(
                children: [
                  if (!_canCustomize)
                    Container(
                      width: double.infinity,
                      margin: const EdgeInsets.fromLTRB(12, 12, 12, 0),
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: Theme.of(context).colorScheme.surfaceContainerHighest,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Icon(Icons.lock_outline, size: 18, color: Theme.of(context).colorScheme.onSurfaceVariant),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              'Seu plano usa a ficha de anamnese padrão — as perguntas abaixo não podem ser alteradas. Faça upgrade para personalizar.',
                              style: TextStyle(fontSize: 12.5, color: Theme.of(context).colorScheme.onSurfaceVariant),
                            ),
                          ),
                        ],
                      ),
                    ),
                  if (_formularios.length > 1)
                    Padding(
                      padding: const EdgeInsets.fromLTRB(12, 12, 12, 0),
                      child: Align(
                        alignment: Alignment.centerLeft,
                        child: Wrap(
                          spacing: 8,
                          children: [
                            for (final f in _formularios)
                              ChoiceChip(
                                label: Text('${anamnesisFormLabel(f)}${f['active'] == true ? '' : ' · inativa'}'),
                                selected: _formulario?['id'] == f['id'],
                                onSelected: (_) {
                                  setState(() => _formIdSel = f['id'] as String);
                                  _carregarCampos();
                                },
                              ),
                          ],
                        ),
                      ),
                    ),
                  Expanded(
                    child: RefreshIndicator(
                      onRefresh: _carregar,
                      child: _campos.isEmpty
                          ? ListView(
                              children: const [
                                SizedBox(height: 120),
                                Center(child: Text('Nenhuma pergunta cadastrada ainda.', style: TextStyle(color: Colors.grey))),
                              ],
                            )
                          : ListView.separated(
                              padding: const EdgeInsets.all(12),
                              itemCount: _campos.length,
                              separatorBuilder: (_, __) => const SizedBox(height: 8),
                              itemBuilder: (context, index) {
                                final c = _campos[index];
                                final obrigatoria = c['required'] as bool? ?? false;
                                return Card(
                                  child: ListTile(
                                    title: Text('${c['label']}${obrigatoria ? ' *' : ''}'),
                                    subtitle: Text(_tipoLabel[c['field_type']] ?? c['field_type'] as String),
                                    trailing: _canCustomize
                                        ? Row(
                                            mainAxisSize: MainAxisSize.min,
                                            children: [
                                              IconButton(
                                                icon: const Icon(Icons.arrow_upward, size: 18),
                                                onPressed: index == 0 ? null : () => _mover(c, -1),
                                                tooltip: 'Mover pra cima',
                                              ),
                                              IconButton(
                                                icon: const Icon(Icons.arrow_downward, size: 18),
                                                onPressed: index == _campos.length - 1 ? null : () => _mover(c, 1),
                                                tooltip: 'Mover pra baixo',
                                              ),
                                              IconButton(
                                                icon: const Icon(Icons.edit_outlined, size: 18),
                                                onPressed: () => _abrirFormulario(campo: c),
                                                tooltip: 'Editar',
                                              ),
                                              IconButton(
                                                icon: Icon(Icons.delete_outline, size: 18, color: Theme.of(context).colorScheme.error),
                                                onPressed: () => _excluir(c),
                                                tooltip: 'Excluir',
                                              ),
                                            ],
                                          )
                                        : null,
                                  ),
                                );
                              },
                            ),
                    ),
                  ),
                ],
              ),
      ),
    );
  }
}

class _PerguntaFormSheet extends StatefulWidget {
  final String formId;
  final Map<String, dynamic>? campo;
  final int ordemAtual;

  const _PerguntaFormSheet({required this.formId, this.campo, required this.ordemAtual});

  @override
  State<_PerguntaFormSheet> createState() => _PerguntaFormSheetState();
}

class _PerguntaFormSheetState extends State<_PerguntaFormSheet> {
  late final _labelController = TextEditingController(text: widget.campo?['label'] as String? ?? '');
  late final _optionsController = TextEditingController(
    text: widget.campo?['options'] is List ? (widget.campo!['options'] as List).join(', ') : '',
  );
  late String _tipo = widget.campo?['field_type'] as String? ?? 'text';
  late bool _obrigatoria = widget.campo?['required'] as bool? ?? false;
  bool _salvando = false;
  String? _erro;

  bool get _editando => widget.campo != null;
  bool get _precisaOpcoes => _tipo == 'single_choice' || _tipo == 'multiple_choice';

  @override
  void dispose() {
    _labelController.dispose();
    _optionsController.dispose();
    super.dispose();
  }

  Future<void> _salvar() async {
    if (_labelController.text.trim().isEmpty) return;
    List<String>? options;
    if (_precisaOpcoes) {
      options = _optionsController.text.split(',').map((o) => o.trim()).where((o) => o.isNotEmpty).toList();
      if (options.length < 2) {
        setState(() => _erro = 'Informe pelo menos 2 opções, separadas por vírgula');
        return;
      }
    }
    setState(() {
      _salvando = true;
      _erro = null;
    });
    final payload = {
      'label': _labelController.text.trim(),
      'field_type': _tipo,
      'required': _obrigatoria,
      'options': options,
    };
    try {
      if (_editando) {
        await supabase.from('anamnesis_fields').update(payload).eq('id', widget.campo!['id']);
      } else {
        await supabase.from('anamnesis_fields').insert({'form_id': widget.formId, 'sort_order': widget.ordemAtual, ...payload});
      }
      if (mounted) Navigator.of(context).pop(true);
    } catch (e) {
      setState(() => _erro = 'Não foi possível salvar. Tente de novo.');
    } finally {
      if (mounted) setState(() => _salvando = false);
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
            Text(_editando ? 'Editar pergunta' : 'Nova pergunta', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 16),
            if (_erro != null) ...[Text(_erro!, style: const TextStyle(color: Colors.red)), const SizedBox(height: 8)],
            TextField(
              controller: _labelController,
              decoration: const InputDecoration(labelText: 'Pergunta', hintText: 'Ex: Possui alguma alergia?', border: OutlineInputBorder()),
            ),
            const SizedBox(height: 12),
            DropdownButtonFormField<String>(
              initialValue: _tipo,
              decoration: const InputDecoration(labelText: 'Tipo de resposta', border: OutlineInputBorder()),
              items: _tipos.map((t) => DropdownMenuItem(value: t.value, child: Text(t.label))).toList(),
              onChanged: (v) => setState(() => _tipo = v ?? 'text'),
            ),
            if (_precisaOpcoes) ...[
              const SizedBox(height: 12),
              TextField(
                controller: _optionsController,
                maxLines: 2,
                decoration: const InputDecoration(labelText: 'Opções (separadas por vírgula)', hintText: 'Ex: Seco, Oleoso, Misto', border: OutlineInputBorder()),
              ),
            ],
            const SizedBox(height: 4),
            SwitchListTile(
              contentPadding: EdgeInsets.zero,
              title: const Text('Obrigatória'),
              value: _obrigatoria,
              onChanged: (v) => setState(() => _obrigatoria = v),
            ),
            const SizedBox(height: 12),
            FilledButton(
              onPressed: _salvando ? null : _salvar,
              child: Text(_salvando ? 'Salvando...' : _editando ? 'Salvar' : 'Adicionar'),
            ),
          ],
        ),
      ),
    );
  }
}
