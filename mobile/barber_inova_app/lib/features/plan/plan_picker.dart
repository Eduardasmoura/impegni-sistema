import 'dart:async';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:supabase_flutter/supabase_flutter.dart' show FunctionException;
import 'package:url_launcher/url_launcher.dart';
import '../../data/supabase_client.dart';

// Réplica funcional do `PlanPicker` do painel web
// (`apps/web-professional/src/components/plan-picker.tsx`) — mesmos dados
// (tabelas `plans`/`plan_features`/`companies`/`subscriptions`, sem
// duplicar planos em nenhuma constante Dart), mesma Edge Function
// (`change-subscription-plan`, chamada aqui pela primeira vez do lado do
// app — antes só o painel web contratava plano), mesmas regras de preço/
// plano sempre revalidadas no servidor. Só a apresentação é nativa de
// mobile (stack vertical em vez de grid, `url_launcher` abrindo o
// navegador do aparelho em vez de `window.open`, sem hover).

// "loyalty_program" continua um check/x simples. "anamnesis" ganhou
// tratamento próprio (`_anamneseNivel` abaixo) — os dois planos têm o
// recurso hoje (migration 093), só muda se dá pra customizar as
// perguntas ou não.
const _featureLabel = {'loyalty_program': 'Programa de fidelidade'};
const _comparisonFeatureKeys = ['loyalty_program'];

// "sms_reminders" existe na tabela `plan_features` mas não é um recurso
// que o produto entrega de verdade (mesmo motivo documentado no
// PlanPicker web) — por isso nunca aparece aqui. Estoque/Financeiro/
// Comissão nunca tiveram checagem de plano em lugar nenhum do código —
// universais nos dois planos.
const _universalFeatures = [
  'Agenda online',
  'Gestão de estoque',
  'Gestão financeira',
  'Controle de comissão',
  'Cadastro de clientes',
  'Cadastro de serviços',
  'Página pública de agendamento',
  'Relatórios',
  'Notificações',
];

const _highlightPlanName = 'Premium';
const _planTagline = {
  'Básico': 'Pra quem está começando',
  'Premium': 'Pra negócios em crescimento',
};

// Mesma lógica de `anamneseLabel`/`anamneseNivel` do PlanPicker web —
// "padrão" (Básico, template fixo) ou "personalizável" (Premium, igual
// já era antes), aplicado de verdade por trigger no banco
// (`enforce_anamnesis_customization`). `null` = plano sem anamnese.
String? _anamneseNivel(List<Map<String, dynamic>> planFeatures) {
  final has = planFeatures.firstWhere((f) => f['feature_key'] == 'anamnesis', orElse: () => const {})['enabled'] == true;
  if (!has) return null;
  final custom = planFeatures.firstWhere((f) => f['feature_key'] == 'anamnesis_customizable', orElse: () => const {})['enabled'] == true;
  return custom ? 'personalizável' : 'padrão';
}

final _valueFmt = NumberFormat.currency(locale: 'pt_BR', symbol: '', decimalDigits: 2);

String _limitLabel(int? n) => n == null ? 'Ilimitado' : '$n';
String _onlyDigits(String v) => v.replaceAll(RegExp(r'\D'), '');

enum _LoadState { loading, error, loaded }

enum _ViewKind { cards, summary, awaitingPayment, success }

/// Widget único usado tanto na tela de bloqueio (trial vencido/pagamento
/// atrasado/assinatura cancelada) quanto em "Meu plano" (troca de plano) —
/// mesmo princípio do lado web: uma fonte de verdade pra escolha/
/// contratação de plano, não duas.
class PlanPicker extends StatefulWidget {
  final String companyId;
  final String context; // "blocked" | "upgrade"

  const PlanPicker({super.key, required this.companyId, this.context = 'upgrade'});

  @override
  State<PlanPicker> createState() => _PlanPickerState();
}

class _PlanPickerState extends State<PlanPicker> {
  _LoadState _loadState = _LoadState.loading;
  List<Map<String, dynamic>> _plans = [];
  List<Map<String, dynamic>> _allFeatures = [];
  Map<String, dynamic>? _company;
  Map<String, dynamic>? _subscription;

  _ViewKind _view = _ViewKind.cards;
  Map<String, dynamic>? _selectedPlan;
  final _docController = TextEditingController();
  bool _submitting = false;
  String? _errorMsg;
  List<String>? _exceededList;
  String? _documentError;
  String? _invoiceUrl;
  Timer? _pollTimer;
  int _pollAttempts = 0;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _pollTimer?.cancel();
    _docController.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() => _loadState = _LoadState.loading);
    try {
      final results = await Future.wait<dynamic>([
        supabase.from('plans').select('*').eq('active', true).order('price_cents'),
        supabase.from('plan_features').select('*'),
        supabase.from('companies').select('*').eq('id', widget.companyId).single(),
        supabase.from('subscriptions').select('*').eq('company_id', widget.companyId).order('created_at', ascending: false).limit(1).maybeSingle(),
      ]).timeout(const Duration(seconds: 15));
      if (!mounted) return;
      setState(() {
        _plans = List<Map<String, dynamic>>.from(results[0] as List);
        _allFeatures = List<Map<String, dynamic>>.from(results[1] as List);
        _company = results[2] as Map<String, dynamic>;
        _subscription = results[3] as Map<String, dynamic>?;
        _docController.text = (_company?['document'] as String?) ?? '';
        _loadState = _LoadState.loaded;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() => _loadState = _LoadState.error);
    }
  }

  String? get _currentPlanId => _subscription?['plan_id'] as String?;
  String? get _subscriptionStatus => _subscription?['status'] as String?;
  String? get _promoEndsAt => _subscription?['promo_ends_at'] as String?;

  // Mesma regra de elegibilidade do `change-subscription-plan` (só pra
  // exibição — o servidor sempre recalcula e decide de verdade): segue na
  // janela original (6 meses do 1º pagamento) se ainda não passou, ou
  // entra na promoção agora se nunca esteve nela e está contratando de
  // verdade (não é troca de plano de quem já paga).
  int _precoEfetivoCents(Map<String, dynamic> plan) {
    final promoAtivo = plan['promo_active'] == true;
    final promoPriceCents = plan['promo_price_cents'] as int?;
    if (!promoAtivo || promoPriceCents == null) return plan['price_cents'] as int;
    final promoEndsAt = _promoEndsAt;
    final aindaNaJanela = promoEndsAt != null && DateTime.parse(promoEndsAt).isAfter(DateTime.now());
    final nuncaTevePromo = promoEndsAt == null;
    final contratandoDeNovo = _subscriptionStatus != 'active';
    if (aindaNaJanela || (nuncaTevePromo && contratandoDeNovo)) return promoPriceCents;
    return plan['price_cents'] as int;
  }

  void _abrirResumo(Map<String, dynamic> plan) {
    setState(() {
      _selectedPlan = plan;
      _errorMsg = null;
      _exceededList = null;
      _documentError = null;
      _view = _ViewKind.summary;
    });
  }

  void _startPolling() {
    _pollTimer?.cancel();
    _pollAttempts = 0;
    _pollTimer = Timer.periodic(const Duration(seconds: 6), (t) async {
      _pollAttempts++;
      if (_pollAttempts > 20) {
        t.cancel();
        return;
      }
      // Reconsulta só a assinatura (mais leve que recarregar tudo) — quando
      // o webhook do Asaas já tiver confirmado o pagamento, o status muda
      // pra "active" e a tela avança sozinha.
      try {
        final sub = await supabase
            .from('subscriptions')
            .select('*')
            .eq('company_id', widget.companyId)
            .order('created_at', ascending: false)
            .limit(1)
            .maybeSingle()
            .timeout(const Duration(seconds: 10));
        if (!mounted) return;
        if (sub != null && sub['status'] == 'active' && sub['plan_id'] == _selectedPlan?['id']) {
          t.cancel();
          setState(() {
            _subscription = sub;
            _view = _ViewKind.success;
          });
        }
      } catch (_) {
        // rede instável — só tenta de novo no próximo tick, sem travar a tela.
      }
    });
  }

  Future<void> _contratar(Map<String, dynamic> plan) async {
    setState(() {
      _errorMsg = null;
      _exceededList = null;
      _documentError = null;
    });

    final precisaDocumento = (_company?['document'] as String?) == null || (_company?['document'] as String?)!.isEmpty;
    String? documentoLimpo;
    if (precisaDocumento) {
      documentoLimpo = _onlyDigits(_docController.text);
      if (documentoLimpo.length != 11 && documentoLimpo.length != 14) {
        setState(() => _documentError = 'Informe um CPF (11 dígitos) ou CNPJ (14 dígitos) válido.');
        return;
      }
    }

    setState(() => _submitting = true);
    try {
      final res = await supabase.functions.invoke(
        'change-subscription-plan',
        body: {'new_plan_id': plan['id'], if (documentoLimpo != null) 'document': documentoLimpo},
      );
      final data = res.data as Map<String, dynamic>?;
      final invoiceUrl = data?['invoice_url'] as String?;
      if (!mounted) return;
      setState(() => _submitting = false);

      if (invoiceUrl != null) {
        setState(() {
          _invoiceUrl = invoiceUrl;
          _view = _ViewKind.awaitingPayment;
        });
        _startPolling();
        await launchUrl(Uri.parse(invoiceUrl), mode: LaunchMode.externalApplication);
      } else {
        // Já tinha assinatura ativa — só sincronizou o valor, sem checkout novo.
        final updatedSub = await supabase
            .from('subscriptions')
            .select('*')
            .eq('company_id', widget.companyId)
            .order('created_at', ascending: false)
            .limit(1)
            .maybeSingle();
        if (!mounted) return;
        setState(() {
          _subscription = updatedSub;
          _view = _ViewKind.success;
        });
      }
    } on FunctionException catch (e) {
      if (!mounted) return;
      setState(() => _submitting = false);
      final details = e.details;
      final body = details is Map ? details : null;
      final reason = body?['reason'] as String?;
      if (reason == 'already_active') {
        setState(() => _errorMsg = 'Você já está neste plano.');
        return;
      }
      if (reason == 'missing_document' || reason == 'invalid_document') {
        setState(() => _documentError = 'Informe um CPF (11 dígitos) ou CNPJ (14 dígitos) válido.');
        return;
      }
      final exceeded = body?['exceeded'];
      if (exceeded is List && exceeded.isNotEmpty) {
        setState(() => _exceededList = exceeded.map((e) => e.toString()).toList());
        return;
      }
      setState(() => _errorMsg = body?['error'] as String? ?? 'Não foi possível concluir a contratação agora. Tente novamente em instantes.');
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _submitting = false;
        _errorMsg = 'Não foi possível concluir a contratação agora. Tente novamente em instantes.';
      });
    }
  }

  Color _muted(BuildContext context) => Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.6);

  @override
  Widget build(BuildContext context) {
    if (_loadState == _LoadState.loading) return _buildSkeleton(context);
    if (_loadState == _LoadState.error || _plans.isEmpty) return _buildErrorState(context);

    switch (_view) {
      case _ViewKind.success:
        return _buildSuccess(context);
      case _ViewKind.awaitingPayment:
        return _buildAwaitingPayment(context);
      case _ViewKind.summary:
        return _buildSummary(context);
      case _ViewKind.cards:
        return _buildCards(context);
    }
  }

  // ---------- Carregando ----------
  Widget _buildSkeleton(BuildContext context) {
    Widget bar(double w, double h) => Container(
          width: w,
          height: h,
          margin: const EdgeInsets.only(bottom: 8),
          decoration: BoxDecoration(color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.08), borderRadius: BorderRadius.circular(6)),
        );
    Widget card() => Card(
          margin: const EdgeInsets.only(bottom: 12),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              bar(100, 20),
              bar(140, 12),
              bar(120, 32),
              const SizedBox(height: 8),
              bar(double.infinity, 12),
              bar(double.infinity, 12),
              bar(double.infinity, 12),
              const SizedBox(height: 8),
              bar(double.infinity, 44),
            ]),
          ),
        );
    return Semantics(
      label: 'Carregando planos',
      child: Column(children: [card(), card(), card()]),
    );
  }

  // ---------- Erro ----------
  Widget _buildErrorState(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          children: [
            Icon(Icons.error_outline, color: Theme.of(context).colorScheme.error, size: 28),
            const SizedBox(height: 8),
            const Text('Não foi possível carregar os planos. Tente novamente.', textAlign: TextAlign.center),
            const SizedBox(height: 12),
            OutlinedButton(onPressed: _load, child: const Text('Tentar novamente')),
          ],
        ),
      ),
    );
  }

  // ---------- Sucesso ----------
  Widget _buildSuccess(BuildContext context) {
    final planName = _selectedPlan?['name'] as String? ?? '';
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          children: [
            Container(
              width: 56,
              height: 56,
              decoration: BoxDecoration(color: Colors.green.withValues(alpha: 0.12), shape: BoxShape.circle),
              child: const Icon(Icons.celebration_outlined, color: Colors.green, size: 28),
            ),
            const SizedBox(height: 12),
            Text('Pagamento confirmado', style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: 4),
            Text(
              widget.context == 'blocked'
                  ? 'Seu plano $planName está ativo — o acesso ao InovaFlow foi liberado.'
                  : 'Agora você está no plano $planName.',
              textAlign: TextAlign.center,
              style: TextStyle(color: _muted(context)),
            ),
            const SizedBox(height: 16),
            FilledButton(onPressed: () => setState(() => _view = _ViewKind.cards), child: const Text('Continuar')),
          ],
        ),
      ),
    );
  }

  // ---------- Aguardando pagamento ----------
  Widget _buildAwaitingPayment(BuildContext context) {
    final planName = _selectedPlan?['name'] as String? ?? '';
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          children: [
            Container(
              width: 56,
              height: 56,
              decoration: BoxDecoration(color: Theme.of(context).colorScheme.primary.withValues(alpha: 0.12), shape: BoxShape.circle),
              child: SizedBox(width: 24, height: 24, child: CircularProgressIndicator(strokeWidth: 2.5, color: Theme.of(context).colorScheme.primary)),
            ),
            const SizedBox(height: 12),
            Text('Aguardando confirmação do pagamento', style: Theme.of(context).textTheme.titleMedium, textAlign: TextAlign.center),
            const SizedBox(height: 6),
            Text(
              'Abrimos a página de pagamento do plano $planName no navegador. Assim que o pagamento for confirmado, a liberação acontece automaticamente aqui.',
              textAlign: TextAlign.center,
              style: TextStyle(color: _muted(context), fontSize: 13),
            ),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                onPressed: () => launchUrl(Uri.parse(_invoiceUrl!), mode: LaunchMode.externalApplication),
                icon: const Icon(Icons.open_in_new, size: 18),
                label: const Text('Abrir página de pagamento novamente'),
              ),
            ),
            const SizedBox(height: 8),
            SizedBox(
              width: double.infinity,
              child: FilledButton(
                onPressed: () async {
                  final sub = await supabase.from('subscriptions').select('*').eq('company_id', widget.companyId).order('created_at', ascending: false).limit(1).maybeSingle();
                  if (!mounted) return;
                  if (sub != null && sub['status'] == 'active' && sub['plan_id'] == _selectedPlan?['id']) {
                    _pollTimer?.cancel();
                    setState(() {
                      _subscription = sub;
                      _view = _ViewKind.success;
                    });
                  }
                },
                child: const Text('Já paguei, verificar'),
              ),
            ),
            TextButton(
              onPressed: () {
                _pollTimer?.cancel();
                setState(() => _view = _ViewKind.cards);
              },
              child: const Text('Cancelar e voltar aos planos'),
            ),
          ],
        ),
      ),
    );
  }

  // ---------- Resumo da contratação ----------
  Widget _buildSummary(BuildContext context) {
    final plan = _selectedPlan!;
    final planFeatures = _allFeatures.where((f) => f['plan_id'] == plan['id']).toList();
    final anamneseNivel = _anamneseNivel(planFeatures);
    final beneficios = [
      ..._universalFeatures,
      if (anamneseNivel != null) 'Ficha de anamnese ($anamneseNivel)',
      ...planFeatures.where((f) => f['enabled'] == true && _comparisonFeatureKeys.contains(f['feature_key'])).map((f) => _featureLabel[f['feature_key']] ?? f['feature_key'] as String),
    ];
    final semDocumento = (_company?['document'] as String?) == null || (_company?['document'] as String?)!.isEmpty;
    final jaAtivoNoPlano = plan['id'] == _currentPlanId && _subscriptionStatus == 'active';

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            TextButton.icon(
              onPressed: () => setState(() => _view = _ViewKind.cards),
              icon: const Icon(Icons.arrow_back, size: 18),
              label: const Text('Voltar'),
              style: TextButton.styleFrom(padding: EdgeInsets.zero, alignment: Alignment.centerLeft),
            ),
            const SizedBox(height: 8),
            Text('Você está contratando', style: TextStyle(fontSize: 12, color: _muted(context))),
            Text(plan['name'] as String, style: Theme.of(context).textTheme.headlineSmall),
            const SizedBox(height: 4),
            _precoEfetivoCents(plan) < (plan['price_cents'] as int)
                ? _planPriceComPromo(context, plan['price_cents'] as int, _precoEfetivoCents(plan), big: true)
                : _planPrice(context, plan['price_cents'] as int, big: true),
            const SizedBox(height: 2),
            Text('Cobrança recorrente mensal, via Asaas. Cancele quando quiser.', style: TextStyle(fontSize: 12, color: _muted(context))),
            const SizedBox(height: 16),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(border: Border.all(color: Theme.of(context).dividerColor), borderRadius: BorderRadius.circular(10)),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('O que está incluso', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: _muted(context))),
                  const SizedBox(height: 8),
                  ...beneficios.map((b) => Padding(
                        padding: const EdgeInsets.symmetric(vertical: 3),
                        child: Row(children: [
                          const Icon(Icons.check, size: 16, color: Colors.green),
                          const SizedBox(width: 8),
                          Expanded(child: Text(b, style: const TextStyle(fontSize: 13))),
                        ]),
                      )),
                ],
              ),
            ),
            if (semDocumento) ...[
              const SizedBox(height: 16),
              const Text('CPF ou CNPJ', style: TextStyle(fontWeight: FontWeight.w600)),
              Text('Necessário pra emitir a cobrança no Asaas.', style: TextStyle(fontSize: 12, color: _muted(context))),
              const SizedBox(height: 6),
              TextField(
                controller: _docController,
                keyboardType: TextInputType.number,
                maxLength: 14,
                decoration: InputDecoration(
                  hintText: 'Somente números',
                  border: const OutlineInputBorder(),
                  errorText: _documentError,
                  counterText: '',
                ),
              ),
            ],
            if (_errorMsg != null || _exceededList != null) ...[
              const SizedBox(height: 12),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Theme.of(context).colorScheme.error.withValues(alpha: 0.06),
                  border: Border.all(color: Theme.of(context).colorScheme.error.withValues(alpha: 0.3)),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Icon(Icons.error_outline, size: 16, color: Theme.of(context).colorScheme.error),
                    const SizedBox(width: 8),
                    Expanded(
                      child: _exceededList != null
                          ? Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text('Seu uso atual excede o limite deste plano:', style: TextStyle(fontWeight: FontWeight.w600, color: Theme.of(context).colorScheme.error, fontSize: 13)),
                                ..._exceededList!.map((e) => Text('• $e', style: TextStyle(color: Theme.of(context).colorScheme.error, fontSize: 13))),
                              ],
                            )
                          : Text(_errorMsg!, style: TextStyle(color: Theme.of(context).colorScheme.error, fontSize: 13)),
                    ),
                  ],
                ),
              ),
            ],
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              height: 48,
              child: FilledButton(
                onPressed: (_submitting || jaAtivoNoPlano) ? null : () => _contratar(plan),
                child: _submitting
                    ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : Text(jaAtivoNoPlano ? 'Você já está neste plano' : 'Continuar para pagamento'),
              ),
            ),
            const SizedBox(height: 8),
            SizedBox(
              width: double.infinity,
              height: 44,
              child: OutlinedButton(onPressed: _submitting ? null : () => setState(() => _view = _ViewKind.cards), child: const Text('Voltar')),
            ),
            const SizedBox(height: 12),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.shield_outlined, size: 14, color: _muted(context)),
                const SizedBox(width: 6),
                Text('Pagamento processado com segurança pelo Asaas.', style: TextStyle(fontSize: 11, color: _muted(context))),
              ],
            ),
          ],
        ),
      ),
    );
  }

  // ---------- Cards + tabela comparativa ----------
  Widget _buildCards(BuildContext context) {
    final ordered = [..._plans]..sort((a, b) => (a['price_cents'] as int).compareTo(b['price_cents'] as int));
    // No mobile o plano em destaque aparece primeiro na pilha (o usuário
    // rola a tela de cima pra baixo, então a recomendação precisa estar no
    // topo — diferente do grid do web, onde a posição central já cumpre
    // esse papel visualmente).
    final destaqueIndex = ordered.indexWhere((p) => p['name'] == _highlightPlanName);
    final stacked = destaqueIndex > 0 ? [ordered[destaqueIndex], ...ordered.where((p) => p['name'] != _highlightPlanName)] : ordered;

    return Column(
      children: [
        ...stacked.map((plan) => _planCard(context, plan)),
        const SizedBox(height: 8),
        _universalFeaturesList(context),
        const SizedBox(height: 16),
        _comparisonTable(context, ordered),
      ],
    );
  }

  Widget _planCard(BuildContext context, Map<String, dynamic> plan) {
    final planFeatures = _allFeatures.where((f) => f['plan_id'] == plan['id']).toList();
    final anamneseNivel = _anamneseNivel(planFeatures);
    final loyalty = planFeatures.firstWhere((f) => f['feature_key'] == 'loyalty_program', orElse: () => const {})['enabled'] == true;
    final destaque = plan['name'] == _highlightPlanName;
    final ativoNoPlano = plan['id'] == _currentPlanId && _subscriptionStatus == 'active';
    final primary = Theme.of(context).colorScheme.primary;

    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          Card(
            margin: EdgeInsets.only(top: destaque ? 10 : 0),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(14),
              side: destaque ? BorderSide(color: primary, width: 1.5) : BorderSide.none,
            ),
            elevation: destaque ? 3 : 1,
            child: Padding(
              padding: EdgeInsets.fromLTRB(18, destaque ? 22 : 18, 18, 18),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (ativoNoPlano)
                    Container(
                      margin: const EdgeInsets.only(bottom: 6),
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                      decoration: BoxDecoration(color: Colors.green.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(999)),
                      child: const Text('Plano atual', style: TextStyle(fontSize: 11, color: Colors.green, fontWeight: FontWeight.w600)),
                    ),
                  Text(plan['name'] as String, style: Theme.of(context).textTheme.titleLarge),
                  Text(_planTagline[plan['name']] ?? '', style: TextStyle(fontSize: 12, color: _muted(context))),
                  const SizedBox(height: 8),
                  _precoEfetivoCents(plan) < (plan['price_cents'] as int)
                      ? _planPriceComPromo(context, plan['price_cents'] as int, _precoEfetivoCents(plan))
                      : _planPrice(context, plan['price_cents'] as int),
                  const SizedBox(height: 12),
                  _featureLine(context, true, '${_limitLabel(plan['max_professionals'] as int?)} ${plan['max_professionals'] == 1 ? 'profissional' : 'profissionais'}'),
                  _featureLine(context, true, '${_limitLabel(plan['max_clients'] as int?)} clientes'),
                  _featureLine(context, true, '${_limitLabel(plan['max_appointments'] as int?)} agendamentos/mês'),
                  _featureLine(context, true, '${_limitLabel(plan['max_users'] as int?)} usuário${plan['max_users'] == 1 ? '' : 's'} da equipe'),
                  _featureLine(context, anamneseNivel != null, anamneseNivel != null ? 'Ficha de anamnese ($anamneseNivel)' : 'Ficha de anamnese'),
                  _featureLine(context, loyalty, 'Programa de fidelidade'),
                  const SizedBox(height: 14),
                  SizedBox(
                    width: double.infinity,
                    height: 48, // alvo de toque ≥44pt
                    child: ativoNoPlano
                        ? const OutlinedButton(onPressed: null, child: Text('Seu plano atual'))
                        : destaque
                            ? FilledButton(onPressed: () => _abrirResumo(plan), child: Text('Escolher ${plan['name']}'))
                            : OutlinedButton(onPressed: () => _abrirResumo(plan), child: Text('Escolher ${plan['name']}')),
                  ),
                ],
              ),
            ),
          ),
          if (destaque)
            Positioned(
              top: 0,
              left: 0,
              right: 0,
              child: Center(
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                  decoration: BoxDecoration(color: primary, borderRadius: BorderRadius.circular(999)),
                  child: Text('Mais escolhido', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Theme.of(context).colorScheme.onPrimary)),
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _featureLine(BuildContext context, bool enabled, String label) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(children: [
        Icon(enabled ? Icons.check : Icons.close, size: 17, color: enabled ? Colors.green : _muted(context)),
        const SizedBox(width: 8),
        Expanded(child: Text(label, style: TextStyle(fontSize: 13, color: enabled ? null : _muted(context)))),
      ]),
    );
  }

  Widget _planPrice(BuildContext context, int cents, {bool big = false}) {
    final value = _valueFmt.format(cents / 100).trim();
    return RichText(
      text: TextSpan(
        style: DefaultTextStyle.of(context).style,
        children: [
          TextSpan(text: 'R\$ ', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w500, color: _muted(context))),
          TextSpan(text: value, style: TextStyle(fontSize: big ? 32 : 26, fontWeight: FontWeight.bold, color: Theme.of(context).colorScheme.onSurface)),
          TextSpan(text: ' /mês', style: TextStyle(fontSize: 13, color: _muted(context))),
        ],
      ),
    );
  }

  // Promoção de lançamento (migration 095): preço normal riscado + preço
  // promocional em destaque + nota da duração. Espelha `PlanPriceComPromo`
  // do PlanPicker web.
  Widget _planPriceComPromo(BuildContext context, int precoNormalCents, int precoPromoCents, {bool big = false}) {
    final normal = 'R\$ ${_valueFmt.format(precoNormalCents / 100).trim()}';
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Text(normal, style: TextStyle(fontSize: 12, color: _muted(context), decoration: TextDecoration.lineThrough)),
            const SizedBox(width: 6),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
              decoration: BoxDecoration(color: Colors.green.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(4)),
              child: const Text('Preço de lançamento', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: Colors.green)),
            ),
          ],
        ),
        const SizedBox(height: 2),
        _planPrice(context, precoPromoCents, big: big),
        const SizedBox(height: 2),
        Text('nos 6 primeiros meses — depois, $normal/mês', style: TextStyle(fontSize: 11, color: _muted(context))),
      ],
    );
  }

  Widget _universalFeaturesList(BuildContext context) {
    return Column(
      children: [
        Text('Incluído em todos os planos', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: _muted(context))),
        const SizedBox(height: 6),
        Wrap(
          alignment: WrapAlignment.center,
          spacing: 12,
          runSpacing: 4,
          children: _universalFeatures
              .map((f) => Row(mainAxisSize: MainAxisSize.min, children: [
                    const Icon(Icons.check, size: 12, color: Colors.green),
                    const SizedBox(width: 3),
                    Text(f, style: TextStyle(fontSize: 11, color: _muted(context))),
                  ]))
              .toList(),
        ),
      ],
    );
  }

  Widget _comparisonTable(BuildContext context, List<Map<String, dynamic>> ordered) {
    Widget cell(String v, {bool bold = false}) => Padding(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
          child: Text(v, style: TextStyle(fontSize: 12, fontWeight: bold ? FontWeight.w600 : FontWeight.normal)),
        );
    Widget iconCell(bool enabled) => Padding(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
          child: Semantics(
            label: enabled ? 'Incluído' : 'Não incluído',
            child: Icon(enabled ? Icons.check : Icons.close, size: 16, color: enabled ? Colors.green : _muted(context)),
          ),
        );

    final rows = <TableRow>[
      TableRow(children: [
        cell('Comparar planos', bold: true),
        ...ordered.map((p) => cell(p['name'] as String, bold: true)),
      ]),
      TableRow(children: [cell('Profissionais'), ...ordered.map((p) => cell(_limitLabel(p['max_professionals'] as int?)))]),
      TableRow(children: [cell('Clientes'), ...ordered.map((p) => cell(_limitLabel(p['max_clients'] as int?)))]),
      TableRow(children: [cell('Agendamentos/mês'), ...ordered.map((p) => cell(_limitLabel(p['max_appointments'] as int?)))]),
      TableRow(children: [cell('Usuários da equipe'), ...ordered.map((p) => cell(_limitLabel(p['max_users'] as int?)))]),
      TableRow(children: [
        cell('Ficha de anamnese'),
        ...ordered.map((p) {
          final nivel = _anamneseNivel(_allFeatures.where((f) => f['plan_id'] == p['id']).toList());
          return nivel != null ? cell(nivel[0].toUpperCase() + nivel.substring(1), bold: true) : iconCell(false);
        }),
      ]),
      for (final key in _comparisonFeatureKeys)
        TableRow(children: [
          cell(_featureLabel[key]!),
          ...ordered.map((p) {
            final enabled = _allFeatures.firstWhere((f) => f['plan_id'] == p['id'] && f['feature_key'] == key, orElse: () => const {})['enabled'] == true;
            return iconCell(enabled);
          }),
        ]),
    ];

    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: ConstrainedBox(
        constraints: BoxConstraints(minWidth: MediaQuery.of(context).size.width - 32),
        child: Table(
          border: TableBorder(horizontalInside: BorderSide(color: Theme.of(context).dividerColor)),
          columnWidths: {0: const FixedColumnWidth(140), for (var i = 1; i <= ordered.length; i++) i: const FixedColumnWidth(100)},
          children: rows,
        ),
      ),
    );
  }
}
