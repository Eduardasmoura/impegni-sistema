import 'package:flutter/material.dart';
import '../../app/app_drawer.dart';
import '../../data/company_service.dart';
import '../../data/supabase_client.dart';

/// Cupons — versão simples do mobile (código, nome, desconto, ativo). O web
/// (`apps/web-professional/.../cupons/cupons-view.tsx`) tem campos
/// avançados (serviços/profissionais aplicáveis, limites de uso, validade)
/// — mantidos só lá de propósito, pra essa tela ficar rápida de usar no
/// celular. FASE 7 fechou a lacuna real que faltava: editar, excluir e
/// ativar/desativar (antes só criava e listava).
class CouponsScreen extends StatefulWidget {
  final CurrentCompany company;

  const CouponsScreen({super.key, required this.company});

  @override
  State<CouponsScreen> createState() => _CouponsScreenState();
}

class _CouponsScreenState extends State<CouponsScreen> {
  bool _loading = true;
  List<Map<String, dynamic>> _cupons = [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    final rows = await supabase.from('coupons').select('*').eq('company_id', widget.company.id).order('created_at', ascending: false);
    if (!mounted) return;
    setState(() {
      _cupons = List<Map<String, dynamic>>.from(rows);
      _loading = false;
    });
  }

  Future<void> _abrirFormulario({Map<String, dynamic>? cupom}) async {
    final codeController = TextEditingController(text: cupom?['code'] as String? ?? '');
    final nameController = TextEditingController(text: cupom?['name'] as String? ?? '');
    final discountController = TextEditingController(text: cupom != null && cupom['discount_percent'] != null ? '${cupom['discount_percent']}' : '');
    String? erro;
    final salvou = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      builder: (context) => StatefulBuilder(
        builder: (context, setSheetState) => Padding(
          padding: EdgeInsets.only(left: 16, right: 16, top: 16, bottom: MediaQuery.of(context).viewInsets.bottom + 16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(cupom == null ? 'Novo cupom' : 'Editar cupom', style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: 12),
              if (erro != null) ...[Text(erro!, style: const TextStyle(color: Colors.red)), const SizedBox(height: 8)],
              TextField(
                controller: codeController,
                textCapitalization: TextCapitalization.characters,
                decoration: const InputDecoration(labelText: 'Código', hintText: 'Ex: VERAO10', border: OutlineInputBorder()),
              ),
              const SizedBox(height: 12),
              TextField(controller: nameController, decoration: const InputDecoration(labelText: 'Nome', border: OutlineInputBorder())),
              const SizedBox(height: 12),
              TextField(
                controller: discountController,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(labelText: 'Desconto (%)', border: OutlineInputBorder()),
              ),
              const SizedBox(height: 16),
              FilledButton(
                onPressed: () async {
                  if (codeController.text.trim().isEmpty || nameController.text.trim().isEmpty || discountController.text.trim().isEmpty) return;
                  final payload = {
                    'company_id': widget.company.id,
                    'code': codeController.text.trim().toUpperCase(),
                    'name': nameController.text.trim(),
                    'discount_percent': double.tryParse(discountController.text) ?? 0,
                    if (cupom == null) 'active': true,
                  };
                  try {
                    if (cupom == null) {
                      await supabase.from('coupons').insert(payload);
                    } else {
                      await supabase.from('coupons').update(payload).eq('id', cupom['id']);
                    }
                    if (context.mounted) Navigator.of(context).pop(true);
                  } catch (e) {
                    setSheetState(() => erro = e.toString().contains('coupons_company_code') ? 'Já existe um cupom com esse código.' : 'Não foi possível salvar.');
                  }
                },
                child: Text(cupom == null ? 'Criar cupom' : 'Salvar'),
              ),
            ],
          ),
        ),
      ),
    );
    if (salvou == true) _load();
  }

  Future<void> _alternarAtivo(Map<String, dynamic> cupom) async {
    await supabase.from('coupons').update({'active': !(cupom['active'] as bool? ?? true)}).eq('id', cupom['id']);
    _load();
  }

  Future<void> _excluir(Map<String, dynamic> cupom) async {
    final confirmar = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Excluir cupom?'),
        content: Text('"${cupom['code']}" deixa de funcionar imediatamente. Essa ação não pode ser desfeita.'),
        actions: [
          TextButton(onPressed: () => Navigator.of(context).pop(false), child: const Text('Cancelar')),
          FilledButton(onPressed: () => Navigator.of(context).pop(true), child: const Text('Excluir')),
        ],
      ),
    );
    if (confirmar != true) return;
    await supabase.from('coupons').delete().eq('id', cupom['id']);
    _load();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      drawer: const AppDrawer(),
      appBar: AppBar(title: const Text('Cupons')),
      floatingActionButton: FloatingActionButton.extended(onPressed: () => _abrirFormulario(), icon: const Icon(Icons.add), label: const Text('Novo')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _load,
              child: _cupons.isEmpty
                  ? ListView(children: const [SizedBox(height: 120), Center(child: Text('Nenhum cupom criado ainda.', style: TextStyle(color: Colors.grey)))])
                  : ListView.separated(
                      padding: const EdgeInsets.all(12),
                      itemCount: _cupons.length,
                      separatorBuilder: (_, __) => const SizedBox(height: 8),
                      itemBuilder: (context, index) {
                        final c = _cupons[index];
                        final ativo = c['active'] as bool? ?? true;
                        final percent = c['discount_percent'];
                        final amount = c['discount_amount'];
                        return Card(
                          child: ListTile(
                            leading: const Icon(Icons.sell_outlined),
                            title: Text(c['code'] as String, style: const TextStyle(fontWeight: FontWeight.bold)),
                            subtitle: Text(c['name'] as String),
                            trailing: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Column(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  crossAxisAlignment: CrossAxisAlignment.end,
                                  children: [
                                    Text(percent != null ? '$percent%' : 'R\$ $amount', style: const TextStyle(fontWeight: FontWeight.bold)),
                                    Text(ativo ? 'Ativo' : 'Inativo', style: TextStyle(fontSize: 11, color: ativo ? Colors.green : Colors.grey)),
                                  ],
                                ),
                                PopupMenuButton<String>(
                                  onSelected: (v) {
                                    if (v == 'editar') _abrirFormulario(cupom: c);
                                    if (v == 'alternar') _alternarAtivo(c);
                                    if (v == 'excluir') _excluir(c);
                                  },
                                  itemBuilder: (context) => [
                                    const PopupMenuItem(value: 'editar', child: Text('Editar')),
                                    PopupMenuItem(value: 'alternar', child: Text(ativo ? 'Desativar' : 'Ativar')),
                                    const PopupMenuItem(value: 'excluir', child: Text('Excluir')),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        );
                      },
                    ),
            ),
    );
  }
}
