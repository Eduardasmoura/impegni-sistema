import 'package:flutter/material.dart';
import '../../data/supabase_client.dart';
import 'finance_summary_screen.dart' show categoriasDespesa;

/// Registrar despesa — mesmos campos de `expenses` que o Web já usa
/// (`financeiro-view.tsx`), em bottom sheet (padrão já usado em todo o app
/// pra formulários curtos).
class ExpenseFormSheet extends StatefulWidget {
  final String companyId;

  const ExpenseFormSheet({super.key, required this.companyId});

  @override
  State<ExpenseFormSheet> createState() => _ExpenseFormSheetState();
}

class _ExpenseFormSheetState extends State<ExpenseFormSheet> {
  final _descricaoController = TextEditingController();
  final _valorController = TextEditingController();
  final _notasController = TextEditingController();
  String _categoria = 'outros';
  DateTime _data = DateTime.now();
  bool _recorrente = false;
  bool _saving = false;
  String? _error;

  @override
  void dispose() {
    _descricaoController.dispose();
    _valorController.dispose();
    _notasController.dispose();
    super.dispose();
  }

  Future<void> _salvar() async {
    final valor = double.tryParse(_valorController.text.replaceAll(',', '.'));
    if (_descricaoController.text.trim().isEmpty || valor == null) {
      setState(() => _error = 'Preencha descrição e valor.');
      return;
    }
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      await supabase.from('expenses').insert({
        'company_id': widget.companyId,
        'description': _descricaoController.text.trim(),
        'amount': valor,
        'category': _categoria,
        'expense_date': _data.toIso8601String().substring(0, 10),
        'recurring': _recorrente,
        'notes': _notasController.text.trim().isEmpty ? null : _notasController.text.trim(),
      });
      if (mounted) Navigator.of(context).pop(true);
    } catch (e) {
      setState(() => _error = 'Não foi possível registrar a despesa.');
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
            Text('Registrar despesa', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 16),
            if (_error != null) ...[
              Text(_error!, style: const TextStyle(color: Colors.red)),
              const SizedBox(height: 8),
            ],
            TextField(controller: _descricaoController, decoration: const InputDecoration(labelText: 'Descrição', border: OutlineInputBorder())),
            const SizedBox(height: 12),
            TextField(
              controller: _valorController,
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              decoration: const InputDecoration(labelText: 'Valor (R\$)', border: OutlineInputBorder()),
            ),
            const SizedBox(height: 12),
            DropdownButtonFormField<String>(
              initialValue: _categoria,
              decoration: const InputDecoration(labelText: 'Categoria', border: OutlineInputBorder()),
              items: categoriasDespesa.map((c) => DropdownMenuItem(value: c.$1, child: Text(c.$2))).toList(),
              onChanged: (v) => setState(() => _categoria = v ?? 'outros'),
            ),
            const SizedBox(height: 12),
            InkWell(
              onTap: () async {
                final escolhida = await showDatePicker(context: context, initialDate: _data, firstDate: DateTime(2020), lastDate: DateTime.now().add(const Duration(days: 365)));
                if (escolhida != null) setState(() => _data = escolhida);
              },
              child: InputDecorator(
                decoration: const InputDecoration(labelText: 'Data', border: OutlineInputBorder()),
                child: Text('${_data.day.toString().padLeft(2, '0')}/${_data.month.toString().padLeft(2, '0')}/${_data.year}'),
              ),
            ),
            const SizedBox(height: 12),
            TextField(controller: _notasController, maxLines: 2, decoration: const InputDecoration(labelText: 'Observações (opcional)', border: OutlineInputBorder())),
            const SizedBox(height: 4),
            CheckboxListTile(
              value: _recorrente,
              onChanged: (v) => setState(() => _recorrente = v ?? false),
              title: const Text('Despesa recorrente'),
              controlAffinity: ListTileControlAffinity.leading,
              contentPadding: EdgeInsets.zero,
            ),
            const SizedBox(height: 12),
            FilledButton(onPressed: _saving ? null : _salvar, child: Text(_saving ? 'Salvando...' : 'Salvar despesa')),
          ],
        ),
      ),
    );
  }
}
