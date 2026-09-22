import 'package:flutter/material.dart';
import '../../data/supabase_client.dart';

/// Criar/editar cliente — mesmo padrão de bottom sheet de
/// `novo_agendamento_sheet.dart` (poucos campos, sheet em vez de tela cheia,
/// ver "Ajustes de adaptação" do plano de paridade). `cliente` vem
/// preenchido quando é edição, null quando é cadastro novo.
class ClientFormSheet extends StatefulWidget {
  final String companyId;
  final Map<String, dynamic>? cliente;

  const ClientFormSheet({super.key, required this.companyId, this.cliente});

  @override
  State<ClientFormSheet> createState() => _ClientFormSheetState();
}

class _ClientFormSheetState extends State<ClientFormSheet> {
  late final _nameController = TextEditingController(text: widget.cliente?['name'] as String? ?? '');
  late final _phoneController = TextEditingController(text: widget.cliente?['phone'] as String? ?? '');
  late final _emailController = TextEditingController(text: widget.cliente?['email'] as String? ?? '');
  late final _notesController = TextEditingController(text: widget.cliente?['notes'] as String? ?? '');
  bool _saving = false;
  String? _error;

  bool get _editando => widget.cliente != null;

  @override
  void dispose() {
    _nameController.dispose();
    _phoneController.dispose();
    _emailController.dispose();
    _notesController.dispose();
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
      'phone': _phoneController.text.trim().isEmpty ? null : _phoneController.text.trim(),
      'email': _emailController.text.trim().isEmpty ? null : _emailController.text.trim(),
      'notes': _notesController.text.trim().isEmpty ? null : _notesController.text.trim(),
    };
    try {
      if (_editando) {
        await supabase.from('clients').update(payload).eq('id', widget.cliente!['id'] as String);
      } else {
        await supabase.from('clients').insert({'company_id': widget.companyId, ...payload});
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
            Text(_editando ? 'Editar cliente' : 'Novo cliente', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 16),
            if (_error != null) ...[
              Text(_error!, style: const TextStyle(color: Colors.red)),
              const SizedBox(height: 8),
            ],
            TextField(
              controller: _nameController,
              decoration: const InputDecoration(labelText: 'Nome', border: OutlineInputBorder()),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _phoneController,
              keyboardType: TextInputType.phone,
              decoration: const InputDecoration(labelText: 'Telefone', border: OutlineInputBorder()),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _emailController,
              keyboardType: TextInputType.emailAddress,
              decoration: const InputDecoration(labelText: 'E-mail', border: OutlineInputBorder()),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _notesController,
              maxLines: 2,
              decoration: const InputDecoration(labelText: 'Observações', border: OutlineInputBorder()),
            ),
            const SizedBox(height: 20),
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
