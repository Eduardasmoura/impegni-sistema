import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../app/app_drawer.dart';
import '../../data/supabase_client.dart';

const _abas = [
  (key: 'waiting', label: 'Na fila'),
  (key: 'notified', label: 'Notificados'),
  (key: 'booked', label: 'Agendados'),
  (key: 'canceled', label: 'Cancelados'),
];

const _periodoLabel = {'morning': 'Manhã', 'afternoon': 'Tarde', 'evening': 'Noite', 'any': 'Qualquer horário'};

/// Lista de espera — equivalente mobile de
/// `apps/web-professional/.../agenda/espera/espera-view.tsx` (Fase 5,
/// ausente no mobile até esta fase). Mesma tabela `waitlist_entries`, mesmas
/// 4 transições de status; "notificar" continua sendo uma ação manual (o
/// app não tem canal automático pro cliente — mesma limitação documentada
/// desde a Fase 5 no Web).
class WaitlistScreen extends StatefulWidget {
  final String companyId;

  const WaitlistScreen({super.key, required this.companyId});

  @override
  State<WaitlistScreen> createState() => _WaitlistScreenState();
}

class _WaitlistScreenState extends State<WaitlistScreen> with SingleTickerProviderStateMixin {
  late final TabController _tabController;
  bool _loading = true;
  List<Map<String, dynamic>> _entradas = [];
  String? _atualizando;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: _abas.length, vsync: this);
    _tabController.addListener(() {
      if (!_tabController.indexIsChanging) _load();
    });
    _load();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    final status = _abas[_tabController.index].key;
    final rows = await supabase
        .from('waitlist_entries')
        .select('id, status, preferred_date, preferred_period, notes, created_at, clients(name, phone), services(name), professionals(name)')
        .eq('company_id', widget.companyId)
        .eq('status', status)
        // Fila de espera é FIFO — quem está esperando há mais tempo aparece
        // primeiro (`.order()` do postgrest-dart é descendente por padrão).
        .order('created_at', ascending: true);
    if (!mounted) return;
    setState(() {
      _entradas = List<Map<String, dynamic>>.from(rows);
      _loading = false;
    });
  }

  Future<void> _mudarStatus(String id, String status, String label) async {
    setState(() => _atualizando = id);
    await supabase.from('waitlist_entries').update({'status': status}).eq('id', id);
    if (!mounted) return;
    setState(() => _atualizando = null);
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(label)));
    _load();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      drawer: const AppDrawer(),
      appBar: AppBar(
        title: const Text('Lista de espera'),
        bottom: TabBar(controller: _tabController, isScrollable: true, tabs: _abas.map((a) => Tab(text: a.label)).toList()),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _entradas.isEmpty
              ? const Center(child: Text('Ninguém aqui no momento.', style: TextStyle(color: Colors.grey)))
              : RefreshIndicator(
                  onRefresh: _load,
                  child: ListView.separated(
                    padding: const EdgeInsets.all(12),
                    itemCount: _entradas.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 8),
                    itemBuilder: (context, index) {
                      final e = _entradas[index];
                      final id = e['id'] as String;
                      final clientName = (e['clients']?['name'] as String?) ?? 'Cliente removido';
                      final clientPhone = e['clients']?['phone'] as String?;
                      final serviceName = (e['services']?['name'] as String?) ?? 'Serviço removido';
                      final professionalName = e['professionals']?['name'] as String?;
                      final preferredDate = e['preferred_date'] as String?;
                      final preferredPeriod = e['preferred_period'] as String?;
                      final createdAt = DateTime.parse(e['created_at'] as String).toLocal();
                      final status = e['status'] as String;
                      final atualizando = _atualizando == id;

                      return Card(
                        child: Padding(
                          padding: const EdgeInsets.all(12),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(clientName, style: const TextStyle(fontWeight: FontWeight.w600)),
                              if (clientPhone != null) Text(clientPhone, style: const TextStyle(fontSize: 12, color: Colors.grey)),
                              Text(
                                professionalName != null ? '$serviceName com $professionalName' : '$serviceName — qualquer profissional',
                                style: const TextStyle(fontSize: 12, color: Colors.grey),
                              ),
                              if (preferredDate != null || preferredPeriod != null)
                                Padding(
                                  padding: const EdgeInsets.only(top: 4),
                                  child: Text(
                                    [
                                      if (preferredDate != null) DateFormat('dd/MM/yyyy').format(DateTime.parse(preferredDate)),
                                      if (preferredPeriod != null) _periodoLabel[preferredPeriod] ?? preferredPeriod,
                                    ].join(' · '),
                                    style: const TextStyle(fontSize: 11, color: Colors.grey),
                                  ),
                                ),
                              Text('Entrou em ${DateFormat('dd/MM/yyyy').format(createdAt)}', style: const TextStyle(fontSize: 10, color: Colors.grey)),
                              if (status == 'waiting' || status == 'notified') ...[
                                const SizedBox(height: 8),
                                Row(
                                  children: [
                                    if (status == 'waiting')
                                      TextButton.icon(
                                        onPressed: atualizando ? null : () => _mudarStatus(id, 'notified', 'Marcado como notificado'),
                                        icon: const Icon(Icons.notifications_outlined, size: 16),
                                        label: const Text('Notificado'),
                                      ),
                                    TextButton.icon(
                                      onPressed: atualizando ? null : () => _mudarStatus(id, 'booked', 'Marcado como agendado'),
                                      icon: const Icon(Icons.check_circle_outline, size: 16),
                                      label: const Text('Agendado'),
                                    ),
                                    IconButton(
                                      onPressed: atualizando ? null : () => _mudarStatus(id, 'canceled', 'Removido da fila'),
                                      icon: const Icon(Icons.cancel_outlined, size: 18, color: Colors.red),
                                      tooltip: 'Remover da fila',
                                    ),
                                  ],
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
