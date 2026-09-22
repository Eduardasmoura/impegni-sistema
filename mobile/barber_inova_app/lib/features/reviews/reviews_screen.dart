import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../app/app_drawer.dart';
import '../../data/company_service.dart';
import '../../data/supabase_client.dart';

final _dateFmt = DateFormat('dd/MM/yyyy');

/// Avaliações recebidas pela empresa — ver + responder. Mesma funcionalidade
/// de `apps/web-professional/.../avaliacoes/avaliacoes-view.tsx`.
class ReviewsScreen extends StatefulWidget {
  final CurrentCompany company;

  const ReviewsScreen({super.key, required this.company});

  @override
  State<ReviewsScreen> createState() => _ReviewsScreenState();
}

class _ReviewsScreenState extends State<ReviewsScreen> {
  bool _loading = true;
  List<Map<String, dynamic>> _reviews = [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    final rows = await supabase
        .from('reviews')
        .select('id, rating, comment, status, response, created_at, clients(name), professionals(name), services(name)')
        .eq('company_id', widget.company.id)
        .order('created_at', ascending: false);
    if (!mounted) return;
    setState(() {
      _reviews = List<Map<String, dynamic>>.from(rows);
      _loading = false;
    });
  }

  Future<void> _responder(Map<String, dynamic> review) async {
    final controller = TextEditingController();
    final texto = await showModalBottomSheet<String>(
      context: context,
      isScrollControlled: true,
      builder: (context) => Padding(
        padding: EdgeInsets.only(left: 16, right: 16, top: 16, bottom: MediaQuery.of(context).viewInsets.bottom + 16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text('Responder avaliação', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 12),
            TextField(controller: controller, maxLines: 3, decoration: const InputDecoration(border: OutlineInputBorder(), hintText: 'Sua resposta')),
            const SizedBox(height: 12),
            FilledButton(onPressed: () => Navigator.of(context).pop(controller.text.trim()), child: const Text('Enviar')),
          ],
        ),
      ),
    );
    if (texto == null || texto.isEmpty) return;
    await supabase.from('reviews').update({'response': texto, 'responded_at': DateTime.now().toIso8601String()}).eq('id', review['id'] as String);
    _load();
  }

  @override
  Widget build(BuildContext context) {
    final media = _reviews.isEmpty ? 0.0 : _reviews.map((r) => r['rating'] as int).reduce((a, b) => a + b) / _reviews.length;
    return Scaffold(
      drawer: const AppDrawer(),
      appBar: AppBar(
        title: const Text('Avaliações'),
        actions: [
          if (_reviews.isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(right: 16),
              child: Center(
                child: Row(children: [
                  const Icon(Icons.star, size: 16, color: Colors.amber),
                  const SizedBox(width: 4),
                  Text('${media.toStringAsFixed(1)} (${_reviews.length})'),
                ]),
              ),
            ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _load,
              child: _reviews.isEmpty
                  ? ListView(children: const [SizedBox(height: 120), Center(child: Text('Nenhuma avaliação ainda.', style: TextStyle(color: Colors.grey)))])
                  : ListView.separated(
                      padding: const EdgeInsets.all(12),
                      itemCount: _reviews.length,
                      separatorBuilder: (_, __) => const SizedBox(height: 8),
                      itemBuilder: (context, index) {
                        final r = _reviews[index];
                        final rating = r['rating'] as int;
                        final cliente = (r['clients'] as Map?)?['name'] as String? ?? 'Cliente';
                        final servico = (r['services'] as Map?)?['name'] as String?;
                        final profissional = (r['professionals'] as Map?)?['name'] as String?;
                        final resposta = r['response'] as String?;
                        return Card(
                          child: Padding(
                            padding: const EdgeInsets.all(12),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(children: List.generate(5, (i) => Icon(Icons.star, size: 14, color: i < rating ? Colors.amber : Colors.grey.shade300))),
                                const SizedBox(height: 4),
                                Text('$cliente · $servico', style: const TextStyle(fontWeight: FontWeight.w600)),
                                Text('$profissional · ${_dateFmt.format(DateTime.parse(r['created_at'] as String))}', style: TextStyle(fontSize: 12, color: Colors.grey.shade600)),
                                if ((r['comment'] as String?)?.isNotEmpty == true) ...[
                                  const SizedBox(height: 8),
                                  Text(r['comment'] as String),
                                ],
                                if (resposta != null) ...[
                                  const SizedBox(height: 8),
                                  Container(
                                    padding: const EdgeInsets.only(left: 8),
                                    decoration: BoxDecoration(border: Border(left: BorderSide(color: Theme.of(context).colorScheme.primary, width: 2))),
                                    child: Text(resposta, style: TextStyle(fontSize: 13, color: Colors.grey.shade700)),
                                  ),
                                ] else ...[
                                  const SizedBox(height: 8),
                                  Align(
                                    alignment: Alignment.centerRight,
                                    child: TextButton.icon(onPressed: () => _responder(r), icon: const Icon(Icons.reply, size: 16), label: const Text('Responder')),
                                  ),
                                ],
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
