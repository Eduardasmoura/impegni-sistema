import 'package:flutter/material.dart';
import '../../data/supabase_client.dart';

/// Cadastro rápido de cliente + agendamento manual, direto da agenda do dia
/// — o caso de uso mais comum no balcão (cliente chegou ou ligou agora).
class NovoAgendamentoSheet extends StatefulWidget {
  final String companyId;
  final String dia; // yyyy-MM-dd

  const NovoAgendamentoSheet({super.key, required this.companyId, required this.dia});

  @override
  State<NovoAgendamentoSheet> createState() => _NovoAgendamentoSheetState();
}

class _NovoAgendamentoSheetState extends State<NovoAgendamentoSheet> {
  final _nameController = TextEditingController();
  final _phoneController = TextEditingController();
  final _timeController = TextEditingController(text: '09:00');

  List<Map<String, dynamic>> _services = [];
  List<Map<String, dynamic>> _professionals = [];
  String? _serviceId;
  String? _professionalId;
  bool _loadingOptions = true;
  bool _saving = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadOptions();
  }

  @override
  void dispose() {
    _nameController.dispose();
    _phoneController.dispose();
    _timeController.dispose();
    super.dispose();
  }

  Future<void> _loadOptions() async {
    final services = await supabase
        .from('services')
        .select('id, name, price, duration_min')
        .eq('company_id', widget.companyId)
        .eq('active', true)
        .order('name');
    final professionals = await supabase
        .from('professionals')
        .select('id, name')
        .eq('company_id', widget.companyId)
        .eq('active', true)
        .order('name');
    if (!mounted) return;
    setState(() {
      _services = List<Map<String, dynamic>>.from(services);
      _professionals = List<Map<String, dynamic>>.from(professionals);
      _loadingOptions = false;
    });
  }

  Future<void> _salvar() async {
    if (_nameController.text.isEmpty || _serviceId == null || _professionalId == null) return;
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      final servico = _services.firstWhere((s) => s['id'] == _serviceId);

      // Reaproveita o cadastro do cliente pelo telefone, se já existir.
      String clientId;
      final existentes = await supabase
          .from('clients')
          .select('id')
          .eq('company_id', widget.companyId)
          .eq('phone', _phoneController.text)
          .limit(1);
      if (existentes.isNotEmpty) {
        clientId = existentes.first['id'] as String;
      } else {
        final novoCliente = await supabase
            .from('clients')
            .insert({
              'company_id': widget.companyId,
              'name': _nameController.text,
              'phone': _phoneController.text.isEmpty ? null : _phoneController.text,
            })
            .select()
            .single();
        clientId = novoCliente['id'] as String;
      }

      final scheduledAt = DateTime.parse('${widget.dia}T${_timeController.text}:00').toIso8601String();
      await supabase.from('appointments').insert({
        'company_id': widget.companyId,
        'client_id': clientId,
        'professional_id': _professionalId,
        'service_id': _serviceId,
        'scheduled_at': scheduledAt,
        'duration_min': servico['duration_min'],
        'price': servico['price'],
        'origin': 'mobile',
        'created_by': supabase.auth.currentUser?.id,
      });

      if (mounted) Navigator.of(context).pop(true);
    } catch (e) {
      setState(() => _error = 'Não foi possível agendar. Confira os dados e tente de novo.');
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(
        left: 16,
        right: 16,
        top: 16,
        bottom: MediaQuery.of(context).viewInsets.bottom + 16,
      ),
      child: _loadingOptions
          ? const SizedBox(height: 160, child: Center(child: CircularProgressIndicator()))
          : SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text('Novo agendamento — ${widget.dia}', style: Theme.of(context).textTheme.titleMedium),
                  const SizedBox(height: 16),
                  if (_error != null) ...[
                    Text(_error!, style: const TextStyle(color: Colors.red)),
                    const SizedBox(height: 8),
                  ],
                  TextField(
                    controller: _nameController,
                    decoration: const InputDecoration(labelText: 'Nome do cliente', border: OutlineInputBorder()),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _phoneController,
                    keyboardType: TextInputType.phone,
                    decoration: const InputDecoration(labelText: 'Telefone', border: OutlineInputBorder()),
                  ),
                  const SizedBox(height: 12),
                  DropdownButtonFormField<String>(
                    initialValue: _serviceId,
                    decoration: const InputDecoration(labelText: 'Serviço', border: OutlineInputBorder()),
                    items: _services
                        .map((s) => DropdownMenuItem(value: s['id'] as String, child: Text('${s['name']} · R\$${s['price']}')))
                        .toList(),
                    onChanged: (value) => setState(() => _serviceId = value),
                  ),
                  const SizedBox(height: 12),
                  DropdownButtonFormField<String>(
                    initialValue: _professionalId,
                    decoration: const InputDecoration(labelText: 'Profissional', border: OutlineInputBorder()),
                    items: _professionals
                        .map((p) => DropdownMenuItem(value: p['id'] as String, child: Text(p['name'] as String)))
                        .toList(),
                    onChanged: (value) => setState(() => _professionalId = value),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _timeController,
                    decoration: const InputDecoration(labelText: 'Horário (HH:mm)', border: OutlineInputBorder()),
                    onTap: () async {
                      final escolhido = await showTimePicker(context: context, initialTime: TimeOfDay.now());
                      if (escolhido != null) {
                        _timeController.text =
                            '${escolhido.hour.toString().padLeft(2, '0')}:${escolhido.minute.toString().padLeft(2, '0')}';
                      }
                    },
                  ),
                  const SizedBox(height: 20),
                  FilledButton(
                    onPressed: _saving ? null : _salvar,
                    child: _saving ? const Text('Agendando...') : const Text('Confirmar agendamento'),
                  ),
                ],
              ),
            ),
    );
  }
}
