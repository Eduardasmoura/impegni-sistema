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

  int get _produtosComEstoqueBaixo => _products.where((p) {
        final estoque = (p['stock_qty'] as num).toInt();
        final minimo = (p['min_stock_qty'] as num?)?.toInt() ?? 0;
        return estoque <= minimo;
      }).length;

  @override
  Widget build(BuildContext context) {
    final baixoEstoque = _produtosComEstoqueBaixo;
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
                      itemCount: _products.length + (baixoEstoque > 0 ? 1 : 0),
                      separatorBuilder: (_, __) => const SizedBox(height: 8),
                      itemBuilder: (context, index) {
                        if (baixoEstoque > 0) {
                          if (index == 0) return _LowStockBanner(count: baixoEstoque);
                          index -= 1;
                        }
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

class _LowStockBanner extends StatelessWidget {
  final int count;

  const _LowStockBanner({required this.count});

  @override
  Widget build(BuildContext context) {
    return Card(
      color: Colors.orange.shade50,
      margin: const EdgeInsets.only(bottom: 4),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Row(
          children: [
            Icon(Icons.warning_amber_rounded, color: Colors.orange.shade800),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                '$count produto${count == 1 ? '' : 's'} precisa${count == 1 ? '' : 'm'} de reposição.',
                style: TextStyle(color: Colors.orange.shade900, fontSize: 13),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
