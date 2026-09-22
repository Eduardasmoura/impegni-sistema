import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../data/supabase_client.dart';

final _data = DateFormat('dd/MM/yyyy');

/// Aniversariantes e Recuperação de clientes — equivalente mobile de
/// `apps/web-professional/.../marketing/marketing-view.tsx` (Fase 5,
/// ausente no mobile até esta fase). Reaproveita as mesmas RPCs e a mesma
/// tabela `campaign_rules` do Web — "ativar campanha" só registra a
/// intenção (o app não tem canal automático pro cliente, mesma limitação
/// documentada desde a Fase 5).
class BirthdaysRecoveryScreen extends StatefulWidget {
  final String companyId;

  const BirthdaysRecoveryScreen({super.key, required this.companyId});

  @override
  State<BirthdaysRecoveryScreen> createState() => _BirthdaysRecoveryScreenState();
}

class _BirthdaysRecoveryScreenState extends State<BirthdaysRecoveryScreen> with SingleTickerProviderStateMixin {
  late final TabController _tabController = TabController(length: 2, vsync: this);

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Aniversariantes e Recuperação'),
        bottom: TabBar(controller: _tabController, tabs: const [Tab(text: 'Aniversariantes'), Tab(text: 'Recuperação')]),
      ),
      body: TabBarView(controller: _tabController, children: [
        _AniversariantesTab(companyId: widget.companyId),
        _RecuperacaoTab(companyId: widget.companyId),
      ]),
    );
  }
}

class _CampanhaCard extends StatefulWidget {
  final String companyId;
  final String type; // 'birthday' | 'recovery'
  final int diasAtual;
  final String placeholder;

  const _CampanhaCard({required this.companyId, required this.type, required this.diasAtual, required this.placeholder});

  @override
  State<_CampanhaCard> createState() => _CampanhaCardState();
}

class _CampanhaCardState extends State<_CampanhaCard> {
  bool _loading = true;
  bool _ativa = false;
  final _mensagemController = TextEditingController();
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _mensagemController.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    final row = await supabase.from('campaign_rules').select('*').eq('company_id', widget.companyId).eq('type', widget.type).maybeSingle();
    if (!mounted) return;
    setState(() {
      _ativa = row?['enabled'] as bool? ?? false;
      _mensagemController.text = row?['message_template'] as String? ?? '';
      _loading = false;
    });
  }

  Future<void> _salvar(bool enabled) async {
    setState(() => _saving = true);
    await supabase.from('campaign_rules').upsert({
      'company_id': widget.companyId,
      'type': widget.type,
      'enabled': enabled,
      'days_threshold': widget.diasAtual,
      'message_template': _mensagemController.text.trim().isEmpty ? null : _mensagemController.text.trim(),
    }, onConflict: 'company_id,type');
    if (!mounted) return;
    setState(() {
      _ativa = enabled;
      _saving = false;
    });
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(enabled ? 'Campanha ativada' : 'Campanha desativada')));
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const Padding(padding: EdgeInsets.all(16), child: Center(child: CircularProgressIndicator()));
    return Card(
      margin: const EdgeInsets.all(12),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(children: [
              const Icon(Icons.campaign_outlined, size: 18),
              const SizedBox(width: 6),
              const Text('Campanha', style: TextStyle(fontWeight: FontWeight.bold)),
              const Spacer(),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(color: (_ativa ? Colors.green : Colors.grey).withValues(alpha: 0.15), borderRadius: BorderRadius.circular(20)),
                child: Text(_ativa ? 'Ativa' : 'Inativa', style: TextStyle(fontSize: 11, color: _ativa ? Colors.green : Colors.grey)),
              ),
            ]),
            const SizedBox(height: 8),
            TextField(
              controller: _mensagemController,
              maxLines: 2,
              decoration: InputDecoration(hintText: widget.placeholder, border: const OutlineInputBorder(), isDense: true),
            ),
            const SizedBox(height: 8),
            Row(children: [
              FilledButton(onPressed: _saving ? null : () => _salvar(true), child: Text(_ativa ? 'Salvar mensagem' : 'Ativar campanha')),
              if (_ativa) ...[
                const SizedBox(width: 8),
                OutlinedButton(onPressed: _saving ? null : () => _salvar(false), child: const Text('Desativar')),
              ],
            ]),
            const SizedBox(height: 8),
            const Text(
              'Ativar a campanha registra a intenção — o app ainda não tem um canal automático pra avisar o cliente. Por enquanto, o contato é manual.',
              style: TextStyle(fontSize: 11, color: Colors.grey),
            ),
          ],
        ),
      ),
    );
  }
}

class _AniversariantesTab extends StatefulWidget {
  final String companyId;

  const _AniversariantesTab({required this.companyId});

  @override
  State<_AniversariantesTab> createState() => _AniversariantesTabState();
}

class _AniversariantesTabState extends State<_AniversariantesTab> {
  bool _esteMes = true;
  bool _loading = true;
  List<Map<String, dynamic>> _itens = [];

  int get _dias {
    if (!_esteMes) return 30;
    final hoje = DateTime.now();
    final ultimoDiaDoMes = DateTime(hoje.year, hoje.month + 1, 0).day;
    return ultimoDiaDoMes - hoje.day + 1;
  }

  DateTime get _inicio => _esteMes ? DateTime(DateTime.now().year, DateTime.now().month, 1) : DateTime.now();

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    final rows = await supabase.rpc('get_birthday_candidates_range', params: {
      'p_company_id': widget.companyId,
      'p_start_date': _inicio.toIso8601String().substring(0, 10),
      'p_days': _dias,
    });
    if (!mounted) return;
    setState(() {
      _itens = List<Map<String, dynamic>>.from(rows);
      _loading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    return ListView(
      children: [
        _CampanhaCard(companyId: widget.companyId, type: 'birthday', diasAtual: _dias, placeholder: 'Ex.: Parabéns, {nome}! Ganhe 10% de desconto esta semana 🎉'),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('${_itens.length} aniversariante(s)', style: const TextStyle(fontWeight: FontWeight.bold)),
              DropdownButton<bool>(
                value: _esteMes,
                items: const [DropdownMenuItem(value: true, child: Text('Este mês')), DropdownMenuItem(value: false, child: Text('Próximos 30 dias'))],
                onChanged: (v) {
                  if (v == null) return;
                  setState(() => _esteMes = v);
                  _load();
                },
              ),
            ],
          ),
        ),
        const SizedBox(height: 8),
        if (_loading)
          const Padding(padding: EdgeInsets.all(24), child: Center(child: CircularProgressIndicator()))
        else if (_itens.isEmpty)
          const Padding(padding: EdgeInsets.all(24), child: Center(child: Text('Nenhum aniversariante nesse período.', style: TextStyle(color: Colors.grey))))
        else
          ..._itens.map((c) {
            final nome = c['name'] as String? ?? '';
            final diasAte = c['days_until'] as int? ?? 0;
            return Card(
              margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
              child: ListTile(
                leading: CircleAvatar(child: Text(nome.isNotEmpty ? nome[0].toUpperCase() : '?')),
                title: Text(nome),
                subtitle: Text((c['phone'] as String?) ?? ''),
                trailing: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(_data.format(DateTime.parse(c['next_birthday'] as String)), style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                    Text(diasAte == 0 ? 'é hoje!' : diasAte == 1 ? 'amanhã' : 'em $diasAte dias', style: const TextStyle(fontSize: 11, color: Colors.grey)),
                  ],
                ),
              ),
            );
          }),
      ],
    );
  }
}

class _RecuperacaoTab extends StatefulWidget {
  final String companyId;

  const _RecuperacaoTab({required this.companyId});

  @override
  State<_RecuperacaoTab> createState() => _RecuperacaoTabState();
}

class _RecuperacaoTabState extends State<_RecuperacaoTab> {
  int _dias = 60;
  bool _loading = true;
  List<Map<String, dynamic>> _itens = [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    final rows = await supabase.rpc('get_recovery_candidates', params: {'p_company_id': widget.companyId, 'p_days_since_last': _dias});
    if (!mounted) return;
    setState(() {
      _itens = List<Map<String, dynamic>>.from(rows);
      _loading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    return ListView(
      children: [
        _CampanhaCard(companyId: widget.companyId, type: 'recovery', diasAtual: _dias, placeholder: 'Ex.: Sentimos sua falta, {nome}! Que tal agendar um horário?'),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(child: Text('${_itens.length} cliente(s) sem retornar', style: const TextStyle(fontWeight: FontWeight.bold))),
              DropdownButton<int>(
                value: _dias,
                items: [30, 45, 60, 90, 120, 180].map((d) => DropdownMenuItem(value: d, child: Text('$d dias'))).toList(),
                onChanged: (v) {
                  if (v == null) return;
                  setState(() => _dias = v);
                  _load();
                },
              ),
            ],
          ),
        ),
        const SizedBox(height: 8),
        if (_loading)
          const Padding(padding: EdgeInsets.all(24), child: Center(child: CircularProgressIndicator()))
        else if (_itens.isEmpty)
          const Padding(padding: EdgeInsets.all(24), child: Center(child: Text('Nenhum cliente sumido — bom sinal.', style: TextStyle(color: Colors.grey))))
        else
          ..._itens.map((c) {
            final nome = c['name'] as String? ?? '';
            return Card(
              margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
              child: ListTile(
                leading: CircleAvatar(child: Text(nome.isNotEmpty ? nome[0].toUpperCase() : '?')),
                title: Text(nome),
                subtitle: Text((c['phone'] as String?) ?? ''),
                trailing: Text(
                  c['last_appointment_at'] != null ? _data.format(DateTime.parse(c['last_appointment_at'] as String)) : '—',
                  style: const TextStyle(fontSize: 12),
                ),
              ),
            );
          }),
      ],
    );
  }
}
