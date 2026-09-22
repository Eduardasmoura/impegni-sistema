import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../app/app_drawer.dart';
import '../../app/plan_limits_provider.dart';
import '../../data/company_service.dart';
import '../../data/supabase_client.dart';

/// Equivalente mobile do menu de perfil do web (avatar+nome+plano no canto
/// superior direito, ver `apps/web-professional/src/components/top-nav.tsx`)
/// — aqui vira a 5ª aba, porque bottom nav não tem "canto superior direito".
/// Reúne tudo que não cabe nas 4 abas principais: negócio, equipe, conta,
/// assinatura. Cada item que ainda não existe como tela mobile aponta pra
/// um placeholder (`ComingSoonScreen`) até a fase correspondente do plano
/// de paridade construir a tela de verdade.
class MoreScreen extends ConsumerWidget {
  final CurrentCompany company;

  const MoreScreen({super.key, required this.company});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = supabase.auth.currentUser;
    // Mesma regra do web: "Equipe" só aparece se o plano permitir mais de 1
    // profissional (ver `plan_limits_provider.dart`).
    final mostrarEquipe = ref.watch(planLimitsProvider).maybeWhen(data: planAllowsTeam, orElse: () => true);
    return Scaffold(
      drawer: const AppDrawer(),
      appBar: AppBar(title: const Text('Mais')),
      body: ListView(
        children: [
          ListTile(
            leading: const CircleAvatar(child: Icon(Icons.person_outline)),
            title: Text(user?.email ?? ''),
            subtitle: Text('${company.name} · ${company.roleEmpresa}'),
          ),
          const Divider(),
          _Section(title: 'Negócio', tiles: [
            const _Tile(icon: Icons.store_outlined, label: 'Meu negócio', route: '/mais/negocio'),
            const _Tile(icon: Icons.content_cut_outlined, label: 'Serviços', route: '/mais/servicos'),
            if (mostrarEquipe) const _Tile(icon: Icons.groups_outlined, label: 'Equipe', route: '/mais/equipe'),
            const _Tile(icon: Icons.inventory_2_outlined, label: 'Estoque', route: '/mais/estoque'),
            // FASE 7: substitui as 3 entradas soltas de Avaliações/Cupons/
            // Repasse (Repasse virou aba de Financeiro) por um hub único —
            // ver `features/marketing/marketing_hub_screen.dart`.
            const _Tile(icon: Icons.campaign_outlined, label: 'Marketing', route: '/mais/marketing'),
          ]),
          const _Section(title: 'Conta', tiles: [
            _Tile(icon: Icons.person_outline, label: 'Meu perfil', route: '/mais/perfil'),
            _Tile(icon: Icons.credit_card_outlined, label: 'Meu plano', route: '/mais/meu-plano'),
            _Tile(icon: Icons.receipt_long_outlined, label: 'Pagamentos', route: '/mais/pagamentos'),
            _Tile(icon: Icons.settings_outlined, label: 'Configurações', route: '/mais/configuracoes'),
            _Tile(icon: Icons.notifications_outlined, label: 'Notificações', route: '/mais/notificacoes'),
            _Tile(icon: Icons.shield_outlined, label: 'Segurança', route: '/mais/seguranca'),
          ]),
          const Divider(),
          ListTile(
            leading: const Icon(Icons.help_outline),
            title: const Text('Ajuda e suporte'),
            subtitle: const Text('atendimento.inovabi@gmail.com'),
            onTap: () async {
              await Clipboard.setData(const ClipboardData(text: 'atendimento.inovabi@gmail.com'));
              if (context.mounted) {
                ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('E-mail copiado')));
              }
            },
          ),
          ListTile(
            leading: const Icon(Icons.logout, color: Colors.red),
            title: const Text('Sair', style: TextStyle(color: Colors.red)),
            onTap: () => supabase.auth.signOut(),
          ),
          const SizedBox(height: 24),
        ],
      ),
    );
  }
}

class _Section extends StatelessWidget {
  final String title;
  final List<_Tile> tiles;

  const _Section({required this.title, required this.tiles});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 4),
          child: Text(title, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Theme.of(context).colorScheme.primary)),
        ),
        ...tiles,
      ],
    );
  }
}

class _Tile extends StatelessWidget {
  final IconData icon;
  final String label;
  final String route;

  const _Tile({required this.icon, required this.label, required this.route});

  @override
  Widget build(BuildContext context) {
    return ListTile(
      leading: Icon(icon),
      title: Text(label),
      trailing: const Icon(Icons.chevron_right, size: 20),
      onTap: () => context.push(route),
    );
  }
}
