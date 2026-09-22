import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:intl/intl.dart';
import '../../app/app_drawer.dart';
import '../../data/company_service.dart';
import '../../data/supabase_client.dart';
import 'plan_picker.dart';

final _currency = NumberFormat.currency(locale: 'pt_BR', symbol: 'R\$');

const _statusLabel = {
  'trial': 'Período de teste',
  'active': 'Ativa',
  'past_due': 'Pagamento pendente',
  'suspended': 'Suspensa',
  'canceled': 'Cancelada',
  'expired': 'Expirada',
  'deleted': 'Excluída',
};

// "sms_reminders" existe na tabela `plan_features` mas não é um recurso
// que o produto realmente entrega (nenhum canal automático de SMS/
// WhatsApp está implementado — mesmo motivo já documentado no
// `PlanPicker` web) — por isso não tem rótulo aqui e é filtrada antes de
// chegar em "Recursos incluídos", pra não prometer o que o app não tem.
const _featureLabel = {'anamnesis': 'Ficha de anamnese', 'loyalty_program': 'Programa de fidelidade'};

/// Meu plano — mesmos dados de
/// `apps/web-professional/.../meu-plano/meu-plano-view.tsx`: plano/preço/
/// status/contagem regressiva de teste/uso vs. limite/recursos incluídos.
/// Só usa dado real (`subscriptions`+`plans`+`plan_features`) — sem
/// upgrade/downgrade self-service, porque isso também não existe no web
/// (só via Super Admin).
class PlanScreen extends StatefulWidget {
  final CurrentCompany company;

  const PlanScreen({super.key, required this.company});

  @override
  State<PlanScreen> createState() => _PlanScreenState();
}

class _PlanScreenState extends State<PlanScreen> {
  bool _loading = true;
  Map<String, dynamic>? _subscription;
  Map<String, dynamic>? _plan;
  List<Map<String, dynamic>> _features = [];
  Map<String, int> _uso = {};

  List<Map<String, dynamic>> get _visibleFeatures => _features.where((f) => f['feature_key'] != 'sms_reminders').toList();

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final companyId = widget.company.id;
    final subRows = await supabase
        .from('subscriptions')
        .select('*, plans(*)')
        .eq('company_id', companyId)
        .order('created_at', ascending: false)
        .limit(1);
    if (subRows.isEmpty) {
      if (mounted) setState(() => _loading = false);
      return;
    }
    final sub = Map<String, dynamic>.from(subRows.first);
    final plan = Map<String, dynamic>.from(sub['plans'] as Map);
    final inicioMes = DateTime(DateTime.now().year, DateTime.now().month, 1).toUtc().toIso8601String();

    // FASE 7 (performance): 5 consultas independentes (só dependem de
    // `plan`/`companyId`, já resolvidos acima) — paralelo em vez de
    // sequencial. `Future.wait<dynamic>` porque mistura uma query de lista
    // com 4 de `.count()` (tipos de retorno diferentes).
    final resultados = await Future.wait<dynamic>([
      supabase.from('plan_features').select('*').eq('plan_id', plan['id'] as String).order('feature_key', ascending: true),
      supabase.from('company_members').select('id').eq('company_id', companyId).eq('active', true).count(),
      supabase.from('professionals').select('id').eq('company_id', companyId).count(),
      supabase.from('clients').select('id').eq('company_id', companyId).count(),
      supabase.from('appointments').select('id').eq('company_id', companyId).neq('status', 'canceled').gte('scheduled_at', inicioMes).count(),
    ]);
    final features = resultados[0] as List;
    final membros = resultados[1];
    final profissionais = resultados[2];
    final clientes = resultados[3];
    final agendamentos = resultados[4];

    if (!mounted) return;
    setState(() {
      _subscription = sub;
      _plan = plan;
      _features = List<Map<String, dynamic>>.from(features);
      _uso = {
        'users': membros.count as int,
        'professionals': profissionais.count as int,
        'clients': clientes.count as int,
        'appointments': agendamentos.count as int,
      };
      _loading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return Scaffold(drawer: const AppDrawer(), appBar: AppBar(title: const Text('Meu plano')), body: const Center(child: CircularProgressIndicator()));
    }
    if (_subscription == null || _plan == null) {
      return Scaffold(
        drawer: const AppDrawer(),
        appBar: AppBar(title: const Text('Meu plano')),
        body: const Center(
          child: Padding(
            padding: EdgeInsets.all(24),
            child: Text('Só o proprietário ou administrador da empresa pode ver os detalhes do plano.', textAlign: TextAlign.center),
          ),
        ),
      );
    }

    final sub = _subscription!;
    final plan = _plan!;
    final status = sub['status'] as String;
    DateTime? trialEndsAt;
    if (sub['trial_ends_at'] != null) trialEndsAt = DateTime.parse(sub['trial_ends_at'] as String);
    final diasRestantes = trialEndsAt?.difference(DateTime.now()).inDays;

    final limites = [
      ('Usuários', _uso['users']!, plan['max_users'] as int?),
      ('Profissionais', _uso['professionals']!, plan['max_professionals'] as int?),
      ('Clientes', _uso['clients']!, plan['max_clients'] as int?),
      ('Agendamentos (mês)', _uso['appointments']!, plan['max_appointments'] as int?),
    ];

    return Scaffold(
      drawer: const AppDrawer(),
      appBar: AppBar(title: const Text('Meu plano')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(plan['name'] as String, style: Theme.of(context).textTheme.titleLarge),
                      Chip(label: Text(_statusLabel[status] ?? status), visualDensity: VisualDensity.compact),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text.rich(
                    TextSpan(
                      children: [
                        TextSpan(text: _currency.format((plan['price_cents'] as int) / 100), style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold)),
                        TextSpan(text: plan['billing_interval'] == 'yearly' ? ' / ano' : ' / mês', style: const TextStyle(color: Colors.grey)),
                      ],
                    ),
                  ),
                  if (status == 'trial' && diasRestantes != null) ...[
                    const SizedBox(height: 12),
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(color: Colors.orange.shade50, borderRadius: BorderRadius.circular(8)),
                      child: Row(
                        children: [
                          Icon(Icons.access_time, size: 16, color: Colors.orange.shade800),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              diasRestantes > 0 ? 'Período de teste — faltam $diasRestantes dia${diasRestantes == 1 ? '' : 's'}.' : 'Seu período de teste terminou.',
                              style: TextStyle(color: Colors.orange.shade900, fontSize: 12),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                  if (sub['current_period_end'] != null) ...[
                    const SizedBox(height: 8),
                    Text('Próxima cobrança em ${DateFormat('dd/MM/yyyy').format(DateTime.parse(sub['current_period_end'] as String).toLocal())}', style: const TextStyle(fontSize: 12, color: Colors.grey)),
                  ],
                ],
              ),
            ),
          ),
          const SizedBox(height: 12),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Uso do plano', style: Theme.of(context).textTheme.titleSmall),
                  const SizedBox(height: 12),
                  ...limites.map((l) {
                    final (label, atual, max) = l;
                    final pct = max != null ? (atual / max).clamp(0, 1).toDouble() : 0.0;
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 10),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(label, style: const TextStyle(fontSize: 12, color: Colors.grey)),
                              Text('$atual / ${max ?? '∞'}', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                            ],
                          ),
                          if (max != null) ...[
                            const SizedBox(height: 4),
                            ClipRRect(
                              borderRadius: BorderRadius.circular(4),
                              child: LinearProgressIndicator(
                                value: pct,
                                minHeight: 5,
                                backgroundColor: Colors.grey.shade200,
                                color: pct >= 1 ? Colors.red : Theme.of(context).colorScheme.primary,
                              ),
                            ),
                          ],
                        ],
                      ),
                    );
                  }),
                ],
              ),
            ),
          ),
          const SizedBox(height: 12),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Recursos incluídos', style: Theme.of(context).textTheme.titleSmall),
                  const SizedBox(height: 8),
                  if (_visibleFeatures.isEmpty) const Text('Nenhum recurso adicional cadastrado para este plano.', style: TextStyle(color: Colors.grey, fontSize: 13)),
                  ..._visibleFeatures.map((f) {
                    final enabled = f['enabled'] as bool? ?? false;
                    final key = f['feature_key'] as String;
                    return Padding(
                      padding: const EdgeInsets.symmetric(vertical: 4),
                      child: Row(
                        children: [
                          Icon(enabled ? Icons.check : Icons.close, size: 16, color: enabled ? Colors.green : Colors.grey),
                          const SizedBox(width: 8),
                          Expanded(child: Text(_featureLabel[key] ?? key, style: const TextStyle(fontSize: 13))),
                          if (enabled && f['limit_value'] != null) Text('até ${f['limit_value']}', style: const TextStyle(fontSize: 11, color: Colors.grey)),
                        ],
                      ),
                    );
                  }),
                ],
              ),
            ),
          ),
          const SizedBox(height: 12),
          Card(
            child: ListTile(
              title: const Text('Quer mudar de plano, cancelar ou tirar dúvidas?', style: TextStyle(fontSize: 12)),
              trailing: TextButton.icon(
                onPressed: () async {
                  await Clipboard.setData(const ClipboardData(text: 'atendimento.inovabi@gmail.com'));
                  if (context.mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('E-mail copiado')));
                },
                icon: const Icon(Icons.mail_outline, size: 16),
                label: const Text('Fale com o suporte'),
              ),
            ),
          ),
          // Mesmo PlanPicker da tela de bloqueio — troca/contratação de
          // plano self-service, espelhando `meu-plano-view.tsx` do web.
          // Só owner/admin (mesma regra que a Edge Function já aplica).
          if (widget.company.roleEmpresa == 'owner' || widget.company.roleEmpresa == 'admin') ...[
            const SizedBox(height: 28),
            Text('Escolha o plano ideal para o seu negócio', style: Theme.of(context).textTheme.titleLarge, textAlign: TextAlign.center),
            const SizedBox(height: 4),
            Text(
              'Tenha tudo o que precisa para organizar seus atendimentos, clientes e gestão em um só lugar.',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
            ),
            const SizedBox(height: 16),
            PlanPicker(companyId: widget.company.id, context: 'upgrade'),
          ],
        ],
      ),
    );
  }
}
