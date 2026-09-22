import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../data/supabase_client.dart';
import 'anamnesis_form_resolver.dart';

final _dateTimeFmt = DateFormat('dd/MM HH:mm');

/// Ficha de anamnese de um cliente — formulário dinâmico a partir de
/// `anamnesis_fields` (configurado no web, Configurações > Anamnese) +
/// histórico de preenchimentos. Mesma funcionalidade de
/// `anamnese-ficha-dialog.tsx` do web-professional; cada envio cria uma
/// linha nova (RLS não permite UPDATE), o histórico nunca é sobrescrito.
class AnamneseFichaSheet extends StatefulWidget {
  final String companyId;
  final String clientId;
  final String clientName;

  const AnamneseFichaSheet({super.key, required this.companyId, required this.clientId, required this.clientName});

  @override
  State<AnamneseFichaSheet> createState() => _AnamneseFichaSheetState();
}

class _AnamneseFichaSheetState extends State<AnamneseFichaSheet> {
  bool _loading = true;
  // Uma ficha por segmento (Cílios, Unhas...): a empresa pode ter várias
  // ativas. A ficha usada vem da escolha manual, do serviço do atendimento
  // ou da única ficha ativa — nunca ao acaso (ver anamnesis_form_resolver.dart).
  List<Map<String, dynamic>> _formularios = [];
  List<Map<String, dynamic>> _servicos = [];
  String? _servicoIdProximo; // serviço do próximo atendimento do cliente
  String? _servicoEscolhido; // null = não mexeu; '' = "nenhum" de propósito
  String? _formIdManual;
  List<Map<String, dynamic>> _campos = [];
  List<Map<String, dynamic>> _historico = [];
  final Map<String, dynamic> _respostas = {};
  bool _mostrarHistorico = false;
  bool _salvando = false;

  @override
  void initState() {
    super.initState();
    _carregar();
  }

  String get _servicoId => _servicoEscolhido ?? _servicoIdProximo ?? '';

  Map<String, dynamic>? get _servico {
    for (final sv in _servicos) {
      if (sv['id'] == _servicoId) return sv;
    }
    return null;
  }

  Map<String, dynamic>? get _formulario => resolveAnamnesisForm(
        companyId: widget.companyId,
        forms: _formularios,
        manualFormId: _formIdManual,
        serviceFormId: _servico?['anamnesis_form_id'] as String?,
      );

  Future<void> _carregar() async {
    setState(() => _loading = true);
    final formularios = List<Map<String, dynamic>>.from(
      await supabase.from('anamnesis_forms').select('*, segments(name)').eq('company_id', widget.companyId).eq('active', true).order('created_at', ascending: true),
    );
    final servicos = List<Map<String, dynamic>>.from(
      await supabase.from('services').select('id, name, anamnesis_form_id').eq('company_id', widget.companyId).eq('active', true).order('name', ascending: true),
    );
    final hoje = DateTime.now();
    final proximo = await supabase
        .from('appointments')
        .select('service_id')
        .eq('client_id', widget.clientId)
        .inFilter('status', ['scheduled', 'in_progress'])
        .gte('scheduled_at', DateTime(hoje.year, hoje.month, hoje.day).toUtc().toIso8601String())
        .order('scheduled_at', ascending: true)
        .limit(1)
        .maybeSingle();
    if (!mounted) return;
    setState(() {
      _formularios = formularios;
      _servicos = servicos;
      _servicoIdProximo = proximo?['service_id'] as String?;
      _loading = false;
    });
    await _carregarCampos();
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
    setState(() {
      _campos = campos;
      _respostas.clear();
    });
  }

  Future<void> _carregarHistorico() async {
    final rows = await supabase
        .from('anamnesis_responses')
        .select('*, anamnesis_response_answers(value, field_id, field_label_snapshot, field_type_snapshot)')
        .eq('client_id', widget.clientId)
        .order('created_at', ascending: false);
    if (!mounted) return;
    setState(() => _historico = List<Map<String, dynamic>>.from(rows));
  }

  String _valorTexto(dynamic valor, String tipo) {
    if (valor == null) return '—';
    if (tipo == 'boolean') return valor == true ? 'Sim' : 'Não';
    if (valor is List) return valor.join(', ');
    return valor.toString();
  }

  Future<void> _salvar() async {
    final formulario = _formulario;
    if (formulario == null) return;
    final faltando = _campos.firstWhere(
      (c) => (c['required'] as bool? ?? false) && (_respostas[c['id']] == null || _respostas[c['id']] == ''),
      orElse: () => {},
    );
    if (faltando.isNotEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('"${faltando['label']}" é obrigatória')));
      return;
    }
    setState(() => _salvando = true);
    try {
      // Grava resposta + respostas individuais numa transação só, com a
      // obrigatoriedade validada de novo no servidor (migration 066) — a
      // checagem acima é só feedback imediato, não é a segurança de verdade.
      final answers = _respostas.entries
          .where((e) => e.value != null && e.value != '')
          .map((e) => {'field_id': e.key, 'value': e.value})
          .toList();
      await supabase.rpc('submit_anamnesis_response', params: {
        'p_client_id': widget.clientId,
        'p_answers': answers,
        'p_form_id': formulario['id'],
        if (_servicoId.isNotEmpty) 'p_service_id': _servicoId,
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Ficha salva')));
        Navigator.of(context).pop();
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Erro ao salvar')));
    } finally {
      if (mounted) setState(() => _salvando = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return DraggableScrollableSheet(
      initialChildSize: 0.85,
      maxChildSize: 0.95,
      expand: false,
      builder: (context, scrollController) => Padding(
        padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
        child: _loading
            ? const Center(child: CircularProgressIndicator())
            : ListView(
                controller: scrollController,
                padding: const EdgeInsets.all(16),
                children: [
                  Text('Anamnese — ${widget.clientName}', style: Theme.of(context).textTheme.titleMedium),
                  const SizedBox(height: 12),
                  if (_formularios.isEmpty)
                    const Padding(padding: EdgeInsets.symmetric(vertical: 24), child: Text('Formulário de anamnese desativado.', textAlign: TextAlign.center))
                  else ...[
                    if (_servicos.isNotEmpty && _formularios.length > 1) ...[
                      DropdownButtonFormField<String>(
                        key: ValueKey('servico-$_servicoId'),
                        initialValue: _servicoId.isEmpty ? '' : _servicoId,
                        decoration: const InputDecoration(labelText: 'Serviço do atendimento', border: OutlineInputBorder(), isDense: true),
                        items: [
                          const DropdownMenuItem(value: '', child: Text('Nenhum / outro')),
                          ..._servicos.map((sv) => DropdownMenuItem(value: sv['id'] as String, child: Text(sv['name'] as String))),
                        ],
                        onChanged: (v) {
                          setState(() {
                            _servicoEscolhido = v ?? '';
                            _formIdManual = null;
                          });
                          _carregarCampos();
                        },
                      ),
                      const SizedBox(height: 12),
                    ],
                    if (_formularios.length > 1) ...[
                      Wrap(
                        spacing: 8,
                        children: [
                          for (final f in _formularios)
                            ChoiceChip(
                              label: Text(anamnesisFormLabel(f)),
                              selected: _formulario?['id'] == f['id'],
                              onSelected: (_) {
                                setState(() => _formIdManual = f['id'] as String);
                                _carregarCampos();
                              },
                            ),
                        ],
                      ),
                      const SizedBox(height: 12),
                    ],
                  ],
                  if (_formularios.isEmpty)
                    const SizedBox.shrink()
                  else if (_formulario == null)
                    const Padding(padding: EdgeInsets.symmetric(vertical: 24), child: Text('Selecione a ficha a preencher (o serviço escolhido não tem ficha vinculada).', textAlign: TextAlign.center))
                  else if (_campos.isEmpty)
                    const Padding(padding: EdgeInsets.symmetric(vertical: 24), child: Text('Nenhuma pergunta configurada ainda.', textAlign: TextAlign.center))
                  else ...[
                    for (final campo in _campos) _campoWidget(campo),
                    const SizedBox(height: 8),
                    FilledButton(onPressed: _salvando ? null : _salvar, child: Text(_salvando ? 'Salvando...' : 'Salvar ficha')),
                  ],
                  const SizedBox(height: 12),
                  TextButton.icon(
                    onPressed: () {
                      setState(() => _mostrarHistorico = !_mostrarHistorico);
                      if (_mostrarHistorico) _carregarHistorico();
                    },
                    icon: const Icon(Icons.history, size: 16),
                    label: Text(_mostrarHistorico ? 'Ocultar histórico' : 'Ver histórico'),
                  ),
                  if (_mostrarHistorico)
                    if (_historico.isEmpty)
                      const Padding(padding: EdgeInsets.all(8), child: Text('Nenhuma ficha anterior.', style: TextStyle(color: Colors.grey)))
                    else
                      for (final r in _historico)
                        Card(
                          child: Padding(
                            padding: const EdgeInsets.all(10),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(_dateTimeFmt.format(DateTime.parse(r['created_at'] as String)), style: TextStyle(fontSize: 11, color: Colors.grey.shade600)),
                                for (final a in (r['anamnesis_response_answers'] as List))
                                  Builder(builder: (context) {
                                    // rótulo/tipo congelados no envio — mudar a ficha depois não reescreve o histórico
                                    final info = anamnesisAnswerLabel(Map<String, dynamic>.from(a as Map), _campos);
                                    if (info == null) return const SizedBox.shrink();
                                    return Text('${info.label}: ${_valorTexto(a['value'], info.tipo)}', style: const TextStyle(fontSize: 13));
                                  }),
                              ],
                            ),
                          ),
                        ),
                ],
              ),
      ),
    );
  }

  Widget _campoWidget(Map<String, dynamic> campo) {
    final id = campo['id'] as String;
    final label = campo['label'] as String;
    final required = campo['required'] as bool? ?? false;
    final tipo = campo['field_type'] as String;
    final texto = required ? '$label *' : label;

    Widget input;
    switch (tipo) {
      case 'textarea':
        input = TextField(maxLines: 3, decoration: const InputDecoration(border: OutlineInputBorder(), isDense: true), onChanged: (v) => _respostas[id] = v);
        break;
      case 'number':
        input = TextField(keyboardType: TextInputType.number, decoration: const InputDecoration(border: OutlineInputBorder(), isDense: true), onChanged: (v) => _respostas[id] = v);
        break;
      case 'date':
        input = TextField(
          readOnly: true,
          decoration: const InputDecoration(border: OutlineInputBorder(), isDense: true, suffixIcon: Icon(Icons.calendar_today, size: 16)),
          onTap: () async {
            final data = await showDatePicker(context: context, firstDate: DateTime(2000), lastDate: DateTime(2100), initialDate: DateTime.now());
            if (data != null) setState(() => _respostas[id] = data.toIso8601String().substring(0, 10));
          },
          controller: TextEditingController(text: _respostas[id] as String? ?? ''),
        );
        break;
      case 'boolean':
        input = StatefulBuilder(
          builder: (context, setLocal) => SwitchListTile(
            contentPadding: EdgeInsets.zero,
            value: _respostas[id] == true,
            title: Text(_respostas[id] == true ? 'Sim' : 'Não'),
            onChanged: (v) => setLocal(() { _respostas[id] = v; }),
          ),
        );
        break;
      case 'single_choice':
        final opcoes = (campo['options'] as List?)?.cast<String>() ?? [];
        input = StatefulBuilder(
          builder: (context, setLocal) => DropdownButtonFormField<String>(
            initialValue: _respostas[id] as String?,
            decoration: const InputDecoration(border: OutlineInputBorder(), isDense: true),
            items: opcoes.map((o) => DropdownMenuItem(value: o, child: Text(o))).toList(),
            onChanged: (v) => setLocal(() { _respostas[id] = v; }),
          ),
        );
        break;
      case 'multiple_choice':
        final opcoes = (campo['options'] as List?)?.cast<String>() ?? [];
        input = StatefulBuilder(
          builder: (context, setLocal) => Wrap(
            spacing: 8,
            children: opcoes.map((o) {
              final atual = (_respostas[id] as List<String>?) ?? <String>[];
              final marcado = atual.contains(o);
              return FilterChip(
                label: Text(o),
                selected: marcado,
                onSelected: (v) => setLocal(() {
                  final nova = List<String>.from(atual);
                  if (v) {
                    nova.add(o);
                  } else {
                    nova.remove(o);
                  }
                  _respostas[id] = nova;
                }),
              );
            }).toList(),
          ),
        );
        break;
      default:
        input = TextField(decoration: const InputDecoration(border: OutlineInputBorder(), isDense: true), onChanged: (v) => _respostas[id] = v);
    }

    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(texto, style: const TextStyle(fontWeight: FontWeight.w500)),
          const SizedBox(height: 4),
          input,
        ],
      ),
    );
  }
}
