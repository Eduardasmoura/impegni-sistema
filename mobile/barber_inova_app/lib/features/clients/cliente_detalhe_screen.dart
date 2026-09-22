import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../data/supabase_client.dart';
import 'client_form_sheet.dart';

final _currency = NumberFormat.currency(locale: 'pt_BR', symbol: 'R\$');
final _data = DateFormat('dd/MM/yyyy');
final _dataHora = DateFormat('dd/MM HH:mm');

const _statusLabel = {
  'scheduled': 'Agendado',
  'in_progress': 'Em andamento',
  'completed': 'Finalizado',
  'canceled': 'Cancelado',
  'no_show': 'Não compareceu',
};
const _metodoLabel = {'pix': 'Pix', 'card': 'Cartão', 'cash': 'Dinheiro', 'package': 'Pacote', 'online': 'Online'};

/// Detalhe do cliente — equivalente mobile de
/// `cliente-detalhe-dialog.tsx` (Fase 5, ausente no mobile até esta fase):
/// aba Histórico (linha do tempo de atendimentos + pagamento + avaliação) e
/// aba Pacotes (comprar/ver saldo). Ganha também excluir cliente, que
/// faltava no mobile (paridade com `equipe-view.tsx`/`clientes-view.tsx`
/// do Web, que já tinham essa ação).
class ClienteDetalheScreen extends StatefulWidget {
  final String companyId;
  final Map<String, dynamic> cliente;

  const ClienteDetalheScreen({super.key, required this.companyId, required this.cliente});

  @override
  State<ClienteDetalheScreen> createState() => _ClienteDetalheScreenState();
}

class _ClienteDetalheScreenState extends State<ClienteDetalheScreen> {
  late Map<String, dynamic> _cliente = widget.cliente;
  bool _excluindo = false;

  Future<void> _editar() async {
    final salvou = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      builder: (_) => ClientFormSheet(companyId: widget.companyId, cliente: _cliente),
    );
    if (salvou == true && mounted) {
      final atualizado = await supabase.from('clients').select('id, name, phone, email, notes, user_id').eq('id', _cliente['id']).single();
      if (mounted) setState(() => _cliente = atualizado);
    }
  }

  Future<void> _excluir() async {
    final confirmar = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Excluir cliente?'),
        content: Text('"${_cliente['name']}" será removido do seu cadastro. Essa ação não pode ser desfeita.'),
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
    setState(() => _excluindo = true);
    try {
      await supabase.from('clients').delete().eq('id', _cliente['id']);
      if (mounted) Navigator.of(context).pop(true);
    } catch (e) {
      if (mounted) {
        setState(() => _excluindo = false);
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Não foi possível excluir o cliente.')));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final temContaPropria = _cliente['user_id'] != null;
    return DefaultTabController(
      length: 2,
      child: Scaffold(
        appBar: AppBar(
          title: Row(
            children: [
              Flexible(child: Text(_cliente['name'] as String? ?? '', overflow: TextOverflow.ellipsis)),
              if (temContaPropria) const Padding(padding: EdgeInsets.only(left: 6), child: Icon(Icons.verified_user, size: 16)),
            ],
          ),
          actions: [
            IconButton(icon: const Icon(Icons.edit_outlined), tooltip: 'Editar', onPressed: _editar),
            IconButton(
              icon: _excluindo ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2)) : const Icon(Icons.delete_outline),
              tooltip: 'Excluir',
              onPressed: _excluindo ? null : _excluir,
            ),
          ],
          bottom: const TabBar(tabs: [Tab(text: 'Histórico'), Tab(text: 'Pacotes')]),
        ),
        body: TabBarView(
          children: [
            _HistoricoTab(companyId: widget.companyId, clientId: _cliente['id'] as String, notes: _cliente['notes'] as String?),
            _PacotesTab(companyId: widget.companyId, clientId: _cliente['id'] as String),
          ],
        ),
      ),
    );
  }
}

class _HistoricoTab extends StatefulWidget {
  final String companyId;
  final String clientId;
  final String? notes;

  const _HistoricoTab({required this.companyId, required this.clientId, this.notes});

  @override
  State<_HistoricoTab> createState() => _HistoricoTabState();
}

class _HistoricoTabState extends State<_HistoricoTab> {
  bool _loading = true;
  List<Map<String, dynamic>> _atendimentos = [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    final rows = await supabase
        .from('appointments')
        .select('id, scheduled_at, status, price, services(name), professionals(name), payments(amount, status, method), reviews(rating, comment, response)')
        .eq('company_id', widget.companyId)
        .eq('client_id', widget.clientId)
        .order('scheduled_at', ascending: false);
    if (!mounted) return;
    setState(() {
      _atendimentos = List<Map<String, dynamic>>.from(rows);
      _loading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const Center(child: CircularProgressIndicator());
    return RefreshIndicator(
      onRefresh: _load,
      child: ListView(
        padding: const EdgeInsets.all(12),
        children: [
          if (widget.notes != null && widget.notes!.isNotEmpty)
            Card(
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Text.rich(TextSpan(children: [
                  const TextSpan(text: 'Observações: ', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                  TextSpan(text: widget.notes, style: const TextStyle(fontSize: 12)),
                ])),
              ),
            ),
          if (_atendimentos.isEmpty)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 60),
              child: Center(child: Text('Nenhum atendimento registrado ainda.', style: TextStyle(color: Colors.grey))),
            )
          else
            ..._atendimentos.map((a) {
              final servico = (a['services']?['name'] as String?) ?? 'Serviço removido';
              final profissional = a['professionals']?['name'] as String?;
              final status = a['status'] as String;
              final scheduledAt = DateTime.parse(a['scheduled_at'] as String).toLocal();
              final price = (a['price'] as num?)?.toDouble() ?? 0;
              final pagamentos = List<Map<String, dynamic>>.from(a['payments'] as List? ?? []);
              final pagamento = pagamentos.isNotEmpty ? pagamentos.first : null;
              final avaliacoes = List<Map<String, dynamic>>.from(a['reviews'] as List? ?? []);
              final avaliacao = avaliacoes.isNotEmpty ? avaliacoes.first : null;

              return Card(
                margin: const EdgeInsets.only(bottom: 8),
                child: Padding(
                  padding: const EdgeInsets.all(12),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(servico, style: const TextStyle(fontWeight: FontWeight.w600)),
                                Text(
                                  '${_dataHora.format(scheduledAt)}${profissional != null ? ' · $profissional' : ''}',
                                  style: const TextStyle(fontSize: 11, color: Colors.grey),
                                ),
                              ],
                            ),
                          ),
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.end,
                            children: [
                              Text(_currency.format(price), style: const TextStyle(fontWeight: FontWeight.bold)),
                              Container(
                                margin: const EdgeInsets.only(top: 2),
                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                decoration: BoxDecoration(
                                  color: status == 'completed' ? Colors.green.withValues(alpha: 0.15) : Colors.grey.withValues(alpha: 0.15),
                                  borderRadius: BorderRadius.circular(20),
                                ),
                                child: Text(_statusLabel[status] ?? status, style: const TextStyle(fontSize: 10)),
                              ),
                            ],
                          ),
                        ],
                      ),
                      if (pagamento != null)
                        Padding(
                          padding: const EdgeInsets.only(top: 6),
                          child: Text(
                            'Pagamento: ${_metodoLabel[pagamento['method']] ?? pagamento['method'] ?? '—'} · ${pagamento['status'] == 'paid' ? 'pago' : pagamento['status']}',
                            style: const TextStyle(fontSize: 11, color: Colors.grey),
                          ),
                        ),
                      if (avaliacao != null) ...[
                        const Divider(height: 16),
                        Row(
                          children: List.generate(
                            5,
                            (i) => Icon(
                              i < (avaliacao['rating'] as int? ?? 0) ? Icons.star : Icons.star_border,
                              size: 14,
                              color: Colors.amber,
                            ),
                          ),
                        ),
                        if (avaliacao['comment'] != null)
                          Padding(padding: const EdgeInsets.only(top: 4), child: Text('"${avaliacao['comment']}"', style: const TextStyle(fontSize: 11, fontStyle: FontStyle.italic))),
                      ],
                    ],
                  ),
                ),
              );
            }),
        ],
      ),
    );
  }
}

class _PacotesTab extends StatefulWidget {
  final String companyId;
  final String clientId;

  const _PacotesTab({required this.companyId, required this.clientId});

  @override
  State<_PacotesTab> createState() => _PacotesTabState();
}

class _PacotesTabState extends State<_PacotesTab> {
  bool _loading = true;
  List<Map<String, dynamic>> _pacotes = [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    final rows = await supabase
        .from('client_packages')
        .select('id, total_sessions, used_sessions, purchased_at, expires_at, price_paid, services(name)')
        .eq('client_id', widget.clientId)
        .order('purchased_at', ascending: false);
    if (!mounted) return;
    setState(() {
      _pacotes = List<Map<String, dynamic>>.from(rows);
      _loading = false;
    });
  }

  Future<void> _registrarPacote() async {
    final salvou = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      builder: (_) => _NovoPacoteSheet(companyId: widget.companyId, clientId: widget.clientId),
    );
    if (salvou == true) _load();
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const Center(child: CircularProgressIndicator());
    return Scaffold(
      floatingActionButton: FloatingActionButton.extended(onPressed: _registrarPacote, icon: const Icon(Icons.add), label: const Text('Registrar pacote')),
      body: RefreshIndicator(
        onRefresh: _load,
        child: _pacotes.isEmpty
            ? ListView(
                children: const [
                  SizedBox(height: 100),
                  Center(child: Text('Nenhum pacote registrado pra este cliente.', style: TextStyle(color: Colors.grey))),
                ],
              )
            : ListView.separated(
                padding: const EdgeInsets.fromLTRB(12, 12, 12, 90),
                itemCount: _pacotes.length,
                separatorBuilder: (_, __) => const SizedBox(height: 8),
                itemBuilder: (context, index) {
                  final p = _pacotes[index];
                  final total = p['total_sessions'] as int;
                  final usado = p['used_sessions'] as int;
                  final restante = total - usado;
                  final expiresAt = p['expires_at'] as String?;
                  final expirado = expiresAt != null && DateTime.parse(expiresAt).isBefore(DateTime.now());
                  final esgotado = restante <= 0;

                  return Card(
                    child: Padding(
                      padding: const EdgeInsets.all(12),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text((p['services']?['name'] as String?) ?? 'Serviço removido', style: const TextStyle(fontWeight: FontWeight.w600)),
                                    Text(
                                      'Comprado em ${_data.format(DateTime.parse(p['purchased_at'] as String))} · ${_currency.format((p['price_paid'] as num).toDouble())}',
                                      style: const TextStyle(fontSize: 11, color: Colors.grey),
                                    ),
                                    if (expiresAt != null) Text('Válido até ${_data.format(DateTime.parse(expiresAt))}', style: const TextStyle(fontSize: 11, color: Colors.grey)),
                                  ],
                                ),
                              ),
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.end,
                                children: [
                                  Text('$restante / $total', style: const TextStyle(fontWeight: FontWeight.bold)),
                                  if (expirado || esgotado)
                                    Container(
                                      margin: const EdgeInsets.only(top: 2),
                                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                      decoration: BoxDecoration(color: Colors.red.withValues(alpha: 0.15), borderRadius: BorderRadius.circular(20)),
                                      child: Text(expirado ? 'Expirado' : 'Esgotado', style: const TextStyle(fontSize: 10, color: Colors.red)),
                                    ),
                                ],
                              ),
                            ],
                          ),
                          const SizedBox(height: 8),
                          ClipRRect(
                            borderRadius: BorderRadius.circular(4),
                            child: LinearProgressIndicator(value: total == 0 ? 0 : usado / total, minHeight: 6),
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

class _NovoPacoteSheet extends StatefulWidget {
  final String companyId;
  final String clientId;

  const _NovoPacoteSheet({required this.companyId, required this.clientId});

  @override
  State<_NovoPacoteSheet> createState() => _NovoPacoteSheetState();
}

class _NovoPacoteSheetState extends State<_NovoPacoteSheet> {
  final _sessoesController = TextEditingController(text: '5');
  final _valorController = TextEditingController();
  final _validadeController = TextEditingController();
  List<Map<String, dynamic>> _services = [];
  String? _serviceId;
  bool _loadingServices = true;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _loadServices();
  }

  @override
  void dispose() {
    _sessoesController.dispose();
    _valorController.dispose();
    _validadeController.dispose();
    super.dispose();
  }

  Future<void> _loadServices() async {
    final rows = await supabase.from('services').select('id, name').eq('company_id', widget.companyId).eq('active', true).order('name', ascending: true);
    if (!mounted) return;
    setState(() {
      _services = List<Map<String, dynamic>>.from(rows);
      _loadingServices = false;
    });
  }

  Future<void> _salvar() async {
    final sessoes = int.tryParse(_sessoesController.text);
    final valor = double.tryParse(_valorController.text.replaceAll(',', '.'));
    if (_serviceId == null || sessoes == null || sessoes <= 0 || valor == null) return;
    setState(() => _saving = true);
    final validadeDias = int.tryParse(_validadeController.text);
    try {
      await supabase.from('client_packages').insert({
        'company_id': widget.companyId,
        'client_id': widget.clientId,
        'service_id': _serviceId,
        'total_sessions': sessoes,
        'price_paid': valor,
        if (validadeDias != null) 'expires_at': DateTime.now().add(Duration(days: validadeDias)).toIso8601String(),
      });
      if (mounted) Navigator.of(context).pop(true);
    } catch (e) {
      if (mounted) {
        setState(() => _saving = false);
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Não foi possível registrar o pacote.')));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(left: 16, right: 16, top: 16, bottom: MediaQuery.of(context).viewInsets.bottom + 16),
      child: _loadingServices
          ? const SizedBox(height: 160, child: Center(child: CircularProgressIndicator()))
          : SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text('Registrar pacote', style: Theme.of(context).textTheme.titleMedium),
                  const SizedBox(height: 16),
                  DropdownButtonFormField<String>(
                    initialValue: _serviceId,
                    decoration: const InputDecoration(labelText: 'Serviço', border: OutlineInputBorder()),
                    items: _services.map((s) => DropdownMenuItem(value: s['id'] as String, child: Text(s['name'] as String))).toList(),
                    onChanged: (v) => setState(() => _serviceId = v),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _sessoesController,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(labelText: 'Quantidade de sessões', border: OutlineInputBorder()),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _valorController,
                    keyboardType: const TextInputType.numberWithOptions(decimal: true),
                    decoration: const InputDecoration(labelText: 'Valor pago (R\$)', border: OutlineInputBorder()),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _validadeController,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(labelText: 'Validade em dias (opcional)', border: OutlineInputBorder()),
                  ),
                  const SizedBox(height: 20),
                  FilledButton(
                    onPressed: _saving ? null : _salvar,
                    child: _saving ? const Text('Salvando...') : const Text('Registrar'),
                  ),
                ],
              ),
            ),
    );
  }
}
