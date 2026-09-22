import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:intl/intl.dart';
import '../../app/access_provider.dart';
import '../../data/supabase_client.dart';
import '../plan/plan_picker.dart';

// Réplica funcional/visual da tela de bloqueio do painel web
// (`access-blocked-screen.tsx`) — mesmo texto, mesma hierarquia
// (wordmark → ícone → título → metadados discretos → subtítulo →
// tranquilização → cards de plano), mesma regra de quem vê o
// `PlanPicker` (só owner/admin — a Edge Function recusa qualquer outro
// papel, então mostrar "Escolher plano" pra quem não pode contratar só
// ofereceria uma ação que ia falhar no servidor).
final _reasonCopy = {
  'trial_expired': (
    icon: Icons.access_time,
    title: 'Seu período de teste terminou',
    subtitle: 'Continue usando todos os recursos do InovaFlow escolhendo o plano ideal para o seu negócio.',
    reassurance: 'Seus dados, clientes e agendamentos continuam salvos.',
    showPlans: true,
  ),
  'payment_overdue': (
    icon: Icons.warning_amber_outlined,
    title: 'Seu pagamento está atrasado',
    subtitle: 'Não conseguimos confirmar o pagamento da sua assinatura. Regularize abaixo para voltar a usar o InovaFlow.',
    reassurance: 'Seus dados, clientes e agendamentos continuam salvos.',
    showPlans: true,
  ),
  'subscription_canceled': (
    icon: Icons.cancel_outlined,
    title: 'Sua assinatura não está mais ativa',
    subtitle: 'O acesso fica pausado enquanto não houver uma assinatura ativa. Escolha um plano abaixo para reativar.',
    reassurance: 'Seus dados, clientes e agendamentos continuam salvos.',
    showPlans: true,
  ),
  'subscription_suspended': (
    icon: Icons.block_outlined,
    title: 'Sua assinatura está suspensa',
    subtitle: 'Entre em contato com o suporte para entender o motivo e reativar o acesso.',
    reassurance: null,
    showPlans: false,
  ),
  'company_suspended': (
    icon: Icons.block_outlined,
    title: 'Esta conta está suspensa',
    subtitle: 'Fale com o suporte para regularizar.',
    reassurance: null,
    showPlans: false,
  ),
  'company_deleted': (
    icon: Icons.error_outline,
    title: 'Esta conta não está mais disponível',
    subtitle: 'Fale com o suporte se você acredita que isso é um engano.',
    reassurance: null,
    showPlans: false,
  ),
};

class AccessBlockedScreen extends StatelessWidget {
  final AccessStatus access;
  final String companyId;
  final String companyName;
  final String roleEmpresa;

  const AccessBlockedScreen({
    super.key,
    required this.access,
    required this.companyId,
    required this.companyName,
    required this.roleEmpresa,
  });

  @override
  Widget build(BuildContext context) {
    final copy = _reasonCopy[access.reason] ?? _reasonCopy['subscription_canceled']!;
    final isManager = roleEmpresa == 'owner' || roleEmpresa == 'admin';
    final mostrarEscolhaDePlanos = copy.showPlans && isManager;
    final primary = Theme.of(context).colorScheme.primary;

    return Scaffold(
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(20, 32, 20, 24),
          child: Column(
            children: [
              // Wordmark — mesmo bloco (marca + "InovaFlow") que o resto do
              // app já usa, pra essa tela não parecer um estado de erro
              // solto, e sim uma etapa do próprio produto.
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Container(
                    width: 30,
                    height: 30,
                    decoration: BoxDecoration(color: primary, borderRadius: BorderRadius.circular(8)),
                    child: Icon(Icons.content_cut, size: 16, color: Theme.of(context).colorScheme.onPrimary),
                  ),
                  const SizedBox(width: 8),
                  const Text('InovaFlow', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 15)),
                ],
              ),
              const SizedBox(height: 28),
              Container(
                width: 56,
                height: 56,
                decoration: BoxDecoration(color: Theme.of(context).colorScheme.error.withValues(alpha: 0.1), shape: BoxShape.circle),
                child: Icon(copy.icon, color: Theme.of(context).colorScheme.error, size: 28, semanticLabel: null),
              ),
              const SizedBox(height: 16),
              Text(copy.title, style: Theme.of(context).textTheme.headlineSmall, textAlign: TextAlign.center),
              const SizedBox(height: 10),
              // Metadados discretos — empresa e data separados do texto
              // explicativo, não misturados numa frase corrida.
              Wrap(
                alignment: WrapAlignment.center,
                crossAxisAlignment: WrapCrossAlignment.center,
                spacing: 6,
                children: [
                  Text(companyName, style: TextStyle(fontSize: 12, color: Colors.grey.shade600)),
                  if (access.reason == 'trial_expired' && access.trialEndsAt != null) ...[
                    Text('•', style: TextStyle(fontSize: 12, color: Colors.grey.shade600)),
                    Text('teste terminou em ${DateFormat('dd/MM/yyyy').format(access.trialEndsAt!.toLocal())}', style: TextStyle(fontSize: 12, color: Colors.grey.shade600)),
                  ],
                ],
              ),
              const SizedBox(height: 10),
              Text(
                copy.subtitle + (copy.showPlans && !isManager ? ' Peça para o dono ou administrador da empresa regularizar o acesso.' : ''),
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 13, color: Colors.grey.shade600),
              ),
              if (copy.reassurance != null) ...[
                const SizedBox(height: 4),
                Text(copy.reassurance!, textAlign: TextAlign.center, style: TextStyle(fontSize: 13, color: Colors.grey.shade500)),
              ],
              const SizedBox(height: 24),
              if (mostrarEscolhaDePlanos) PlanPicker(companyId: companyId, context: 'blocked'),
              const SizedBox(height: 8),
              SizedBox(
                width: double.infinity,
                height: 48,
                child: OutlinedButton.icon(
                  onPressed: () async {
                    // mesmo endereço de suporte do resto do app — sem
                    // cliente de email nativo garantido no simulador/
                    // dispositivo de teste, copia pra área de transferência
                    // (mesmo padrão já usado em `plan_screen.dart`).
                    await Clipboard.setData(const ClipboardData(text: 'atendimento.inovabi@gmail.com'));
                    if (context.mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('E-mail do suporte copiado')));
                    }
                  },
                  icon: const Icon(Icons.mail_outline, size: 18),
                  label: const Text('Falar com o suporte'),
                ),
              ),
              const SizedBox(height: 8),
              SizedBox(
                width: double.infinity,
                height: 48,
                child: TextButton.icon(
                  onPressed: () => supabase.auth.signOut(),
                  icon: const Icon(Icons.logout, size: 18),
                  label: const Text('Sair'),
                ),
              ),
              if (!mostrarEscolhaDePlanos) ...[
                const SizedBox(height: 16),
                Text(
                  'Já resolveu o pagamento? A liberação é automática — feche e abra o app de novo em alguns instantes.',
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 11, color: Colors.grey.shade500),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
