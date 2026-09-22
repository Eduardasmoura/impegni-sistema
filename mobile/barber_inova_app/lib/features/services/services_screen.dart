import 'package:flutter/material.dart';
import '../../app/app_drawer.dart';
import '../../data/company_service.dart';
import '../../data/supabase_client.dart';
import 'service_form_sheet.dart';

/// CRUD de serviços — versão simplificada de
/// `apps/web-professional/.../servicos/servicos-view.tsx` (sem
/// categoria/descrição/foto por enquanto).
class ServicesScreen extends StatefulWidget {
  final CurrentCompany company;

  const ServicesScreen({super.key, required this.company});

  @override
  State<ServicesScreen> createState() => _ServicesScreenState();
}

class _ServicesScreenState extends State<ServicesScreen> {
  bool _loading = true;
  List<Map<String, dynamic>> _services = [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    final rows = await supabase
        .from('services')
        .select('id, name, price, duration_min, active, anamnesis_form_id')
        .eq('company_id', widget.company.id)
        .order('name', ascending: true);
    if (!mounted) return;
    setState(() {
      _services = List<Map<String, dynamic>>.from(rows);
      _loading = false;
    });
  }

  Future<void> _abrirFormulario({Map<String, dynamic>? servico}) async {
    final salvou = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      builder: (context) => ServiceFormSheet(companyId: widget.company.id, servico: servico),
    );
    if (salvou == true) _load();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      drawer: const AppDrawer(),
      appBar: AppBar(title: const Text('Serviços')),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _abrirFormulario(),
        icon: const Icon(Icons.add),
        label: const Text('Novo'),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _load,
              child: _services.isEmpty
                  ? ListView(
                      children: const [
                        SizedBox(height: 120),
                        Center(child: Text('Nenhum serviço cadastrado.', style: TextStyle(color: Colors.grey))),
                      ],
                    )
                  : ListView.separated(
                      padding: const EdgeInsets.all(12),
                      itemCount: _services.length,
                      separatorBuilder: (_, __) => const SizedBox(height: 8),
                      itemBuilder: (context, index) {
                        final s = _services[index];
                        final ativo = s['active'] as bool? ?? true;
                        return Card(
                          child: ListTile(
                            leading: const Icon(Icons.content_cut),
                            title: Text(
                              s['name'] as String? ?? '',
                              style: ativo ? null : const TextStyle(color: Colors.grey, decoration: TextDecoration.lineThrough),
                            ),
                            subtitle: Text('R\$ ${s['price']} · ${s['duration_min']} min${ativo ? '' : ' · inativo'}'),
                            trailing: const Icon(Icons.chevron_right, size: 20),
                            onTap: () => _abrirFormulario(servico: s),
                          ),
                        );
                      },
                    ),
            ),
    );
  }
}
