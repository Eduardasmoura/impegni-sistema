import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../app/app_drawer.dart';
import '../../data/supabase_client.dart';

final _data = DateFormat('dd/MM/yyyy');

/// Segmentação de clientes — equivalente mobile de
/// `apps/web-professional/.../clientes/segmentos/segmentos-view.tsx` (Fase
/// 5, ausente no mobile até esta fase). Reaproveita 100% das RPCs que já
/// existiam pro Web — nenhuma query nova.
class ClientSegmentsScreen extends StatefulWidget {
  final String companyId;

  const ClientSegmentsScreen({super.key, required this.companyId});

  @override
  State<ClientSegmentsScreen> createState() => _ClientSegmentsScreenState();
}

class _ClientSegmentsScreenState extends State<ClientSegmentsScreen> with SingleTickerProviderStateMixin {
  late final TabController _tabController = TabController(length: 4, vsync: this);

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      drawer: const AppDrawer(),
      appBar: AppBar(
        title: const Text('Segmentação'),
        bottom: TabBar(
          controller: _tabController,
          isScrollable: true,
          tabs: const [Tab(text: 'Inativos'), Tab(text: 'Recorrentes'), Tab(text: 'Novos'), Tab(text: 'Não retornaram')],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _RpcListaTab(
            rpc: 'get_inactive_client_candidates',
            params: (dias) => {'p_company_id': widget.companyId, 'p_days_inactive': dias},
            diasInicial: 30,
            legenda: 'Sem atendimento concluído há mais de',
            vazio: 'Nenhum cliente inativo nesse período.',
            subtitulo: (c) => 'Último atendimento em ${_dataOu(c['last_appointment_at'])}',
          ),
          _RpcListaTab(
            rpc: 'get_recurring_client_candidates',
            params: (dias) => {'p_company_id': widget.companyId, 'p_min_appointments': 3, 'p_period_days': dias},
            diasInicial: 90,
            legenda: '3+ atendimentos concluídos nos últimos',
            vazio: 'Nenhum cliente recorrente nesse critério.',
            subtitulo: (c) => '${c['appointments_count']}x no período · última em ${_dataOu(c['last_appointment_at'])}',
          ),
          _RpcListaTab(
            rpc: 'get_new_client_candidates',
            params: (dias) => {'p_company_id': widget.companyId, 'p_days': dias},
            diasInicial: 30,
            legenda: 'Primeiro atendimento concluído nos últimos',
            vazio: 'Nenhum cliente novo nesse período.',
            subtitulo: (c) => 'Desde ${_dataOu(c['first_appointment_at'])}',
          ),
          _RpcListaTab(
            rpc: 'get_recovery_candidates',
            params: (dias) => {'p_company_id': widget.companyId, 'p_days_since_last': dias},
            diasInicial: 90,
            legenda: 'Sumiu há mais de',
            vazio: 'Nenhum cliente nesse recorte — bom sinal.',
            subtitulo: (c) => 'Último atendimento em ${_dataOu(c['last_appointment_at'])}',
          ),
        ],
      ),
    );
  }
}

String _dataOu(dynamic v) => v == null ? '—' : _data.format(DateTime.parse(v as String));

const _opcoesDias = [7, 15, 30, 45, 60, 90, 120, 180];

class _RpcListaTab extends StatefulWidget {
  final String rpc;
  final Map<String, dynamic> Function(int dias) params;
  final int diasInicial;
  final String legenda;
  final String vazio;
  final String Function(Map<String, dynamic>) subtitulo;

  const _RpcListaTab({
    required this.rpc,
    required this.params,
    required this.diasInicial,
    required this.legenda,
    required this.vazio,
    required this.subtitulo,
  });

  @override
  State<_RpcListaTab> createState() => _RpcListaTabState();
}

class _RpcListaTabState extends State<_RpcListaTab> {
  late int _dias = widget.diasInicial;
  bool _loading = true;
  List<Map<String, dynamic>> _itens = [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    final rows = await supabase.rpc(widget.rpc, params: widget.params(_dias));
    if (!mounted) return;
    setState(() {
      _itens = List<Map<String, dynamic>>.from(rows);
      _loading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
          child: Row(
            children: [
              Expanded(child: Text(widget.legenda, style: const TextStyle(fontSize: 12, color: Colors.grey))),
              DropdownButton<int>(
                value: _dias,
                items: _opcoesDias.map((d) => DropdownMenuItem(value: d, child: Text('$d dias'))).toList(),
                onChanged: (v) {
                  if (v == null) return;
                  setState(() => _dias = v);
                  _load();
                },
              ),
            ],
          ),
        ),
        Expanded(
          child: _loading
              ? const Center(child: CircularProgressIndicator())
              : _itens.isEmpty
                  ? Center(child: Text(widget.vazio, style: const TextStyle(color: Colors.grey)))
                  : RefreshIndicator(
                      onRefresh: _load,
                      child: ListView.separated(
                        padding: const EdgeInsets.all(12),
                        itemCount: _itens.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 6),
                        itemBuilder: (context, index) {
                          final c = _itens[index];
                          final nome = c['name'] as String? ?? '';
                          return Card(
                            child: ListTile(
                              leading: CircleAvatar(child: Text(nome.isNotEmpty ? nome[0].toUpperCase() : '?')),
                              title: Text(nome),
                              subtitle: Text(
                                [if ((c['phone'] as String?)?.isNotEmpty == true) c['phone'] as String, widget.subtitulo(c)].join(' · '),
                                style: const TextStyle(fontSize: 11),
                              ),
                            ),
                          );
                        },
                      ),
                    ),
        ),
      ],
    );
  }
}
