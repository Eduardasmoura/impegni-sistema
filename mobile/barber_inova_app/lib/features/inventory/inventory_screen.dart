import 'package:flutter/material.dart';
import '../../data/company_service.dart';
import '../../data/supabase_client.dart';

/// Consulta de estoque + baixa/reposição rápida — versão simplificada do
/// Estoque do painel web (sem cadastro de produto novo, só ajuste de
/// quantidade no dia a dia).
class InventoryScreen extends StatefulWidget {
  final CurrentCompany company;

  const InventoryScreen({super.key, required this.company});

  @override
  State<InventoryScreen> createState() => _InventoryScreenState();
}

class _InventoryScreenState extends State<InventoryScreen> {
  bool _loading = true;
  List<Map<String, dynamic>> _products = [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    final rows = await supabase
        .from('products')
        .select('id, name, unit, stock_qty, min_stock_qty')
        .eq('company_id', widget.company.id)
        .order('name');
    if (!mounted) return;
    setState(() {
      _products = List<Map<String, dynamic>>.from(rows);
      _loading = false;
    });
  }

  Future<void> _ajustar(String id, int delta) async {
    final produto = _products.firstWhere((p) => p['id'] == id);
    final novaQuantidade = ((produto['stock_qty'] as num).toInt() + delta).clamp(0, 999999);
    setState(() => produto['stock_qty'] = novaQuantidade);
    await supabase.from('products').update({'stock_qty': novaQuantidade}).eq('id', id);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Estoque')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _load,
              child: _products.isEmpty
                  ? ListView(
                      children: const [
                        SizedBox(height: 120),
                        Center(child: Text('Nenhum produto cadastrado.', style: TextStyle(color: Colors.grey))),
                      ],
                    )
                  : ListView.separated(
                      padding: const EdgeInsets.all(12),
                      itemCount: _products.length,
                      separatorBuilder: (_, __) => const SizedBox(height: 8),
                      itemBuilder: (context, index) {
                        final p = _products[index];
                        final estoque = (p['stock_qty'] as num).toInt();
                        final minimo = (p['min_stock_qty'] as num?)?.toInt() ?? 0;
                        final baixo = estoque <= minimo;
                        return Card(
                          child: ListTile(
                            title: Text(p['name'] as String),
                            subtitle: Text(
                              '$estoque ${p['unit']}',
                              style: TextStyle(color: baixo ? Colors.orange.shade800 : null, fontWeight: baixo ? FontWeight.bold : null),
                            ),
                            trailing: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                IconButton(icon: const Icon(Icons.remove_circle_outline), onPressed: () => _ajustar(p['id'] as String, -1)),
                                IconButton(icon: const Icon(Icons.add_circle_outline), onPressed: () => _ajustar(p['id'] as String, 1)),
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
