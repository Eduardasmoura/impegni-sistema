import 'package:flutter/material.dart';
import '../../app/app_drawer.dart';
import '../../data/company_service.dart';
import '../clients/client_segments_screen.dart';
import '../coupons/coupons_screen.dart';
import '../reviews/reviews_screen.dart';
import 'birthdays_recovery_screen.dart';

/// Hub "Marketing" — agrupa em "Mais" tudo que antes estava solto (Cupons,
/// Avaliações) mais o que a FASE 7 trouxe (Aniversariantes/Recuperação) e um
/// atalho pra Segmentação de clientes (tela já existe em
/// `features/clients/client_segments_screen.dart`, item 3 desta fase — não
/// duplicada aqui, só linkada). Equivalente ao que no Web fica espalhado
/// entre `marketing-view.tsx`, `cupons-view.tsx` e a aba Avaliações.
class MarketingHubScreen extends StatelessWidget {
  final CurrentCompany company;

  const MarketingHubScreen({super.key, required this.company});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      drawer: const AppDrawer(),
      appBar: AppBar(title: const Text('Marketing')),
      body: ListView(
        padding: const EdgeInsets.symmetric(vertical: 8),
        children: [
          _Tile(
            icon: Icons.cake_outlined,
            label: 'Aniversariantes e recuperação',
            subtitle: 'Clientes fazendo aniversário e que sumiram',
            onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => BirthdaysRecoveryScreen(companyId: company.id))),
          ),
          _Tile(
            icon: Icons.groups_2_outlined,
            label: 'Segmentação de clientes',
            subtitle: 'Inativos, recorrentes, novos e não retornaram',
            onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => ClientSegmentsScreen(companyId: company.id))),
          ),
          _Tile(
            icon: Icons.sell_outlined,
            label: 'Cupons',
            subtitle: 'Criar, editar e ativar cupons de desconto',
            onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => CouponsScreen(company: company))),
          ),
          _Tile(
            icon: Icons.star_outline,
            label: 'Avaliações',
            subtitle: 'Ver e responder avaliações de clientes',
            onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => ReviewsScreen(company: company))),
          ),
        ],
      ),
    );
  }
}

class _Tile extends StatelessWidget {
  final IconData icon;
  final String label;
  final String subtitle;
  final VoidCallback onTap;

  const _Tile({required this.icon, required this.label, required this.subtitle, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return ListTile(
      leading: CircleAvatar(child: Icon(icon)),
      title: Text(label),
      subtitle: Text(subtitle),
      trailing: const Icon(Icons.chevron_right, size: 20),
      onTap: onTap,
    );
  }
}
