import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../data/supabase_client.dart';
import 'company_provider.dart';

/// Menu lateral — mesmos grupos, rótulos e ordem de `GRUPOS` em
/// `apps/web-professional/src/components/sidebar-nav.tsx`, pra Web e
/// Mobile ficarem idênticos pro profissional. Cada item é uma rota de
/// verdade (`context.go`), não um push empilhado — fechar o Drawer e
/// trocar de tela é a mesma semântica de clicar num link da sidebar Web.
///
/// Cada tela de nível superior instancia `const AppDrawer()` no próprio
/// `Scaffold` (sem passar a empresa por parâmetro) — resolve sozinha via
/// `companyProvider`, a mesma fonte única que `CompanyScope` já usa pra
/// tudo mais. Como toda tela que chega a mostrar um Drawer só existe
/// depois que `CompanyScope` já carregou a empresa, o provider aqui já
/// está com dado em cache — não gera um piscar de loading.
class _Item {
  final String href;
  final String label;
  final IconData icon;

  const _Item(this.href, this.label, this.icon);
}

class _Grupo {
  final String label;
  final List<_Item> itens;

  const _Grupo(this.label, this.itens);
}

const _grupos = [
  _Grupo('Principal', [
    _Item('/dashboard', 'Dashboard', Icons.space_dashboard_outlined),
    _Item('/agenda', 'Agenda', Icons.calendar_today_outlined),
    _Item('/agenda/bloqueios', 'Bloqueios, folgas e férias', Icons.event_busy_outlined),
    _Item('/agenda/espera', 'Lista de espera', Icons.hourglass_bottom),
    _Item('/clientes', 'Clientes', Icons.people_outline),
    _Item('/clientes/segmentos', 'Segmentação', Icons.person_search_outlined),
    _Item('/mais/servicos', 'Serviços', Icons.content_cut_outlined),
  ]),
  _Grupo('Operação', [
    _Item('/mais/estoque', 'Estoque', Icons.inventory_2_outlined),
    _Item('/financeiro', 'Financeiro', Icons.attach_money_outlined),
  ]),
  _Grupo('Marketing', [
    _Item('/mais/avaliacoes', 'Avaliações', Icons.star_outline),
    _Item('/mais/cupons', 'Cupons', Icons.sell_outlined),
    _Item('/mais/marketing', 'Campanhas', Icons.campaign_outlined),
  ]),
  _Grupo('Negócio', [
    _Item('/mais/equipe', 'Equipe', Icons.groups_outlined),
    _Item('/mais/negocio', 'Meu negócio', Icons.store_outlined),
  ]),
  _Grupo('Conta', [
    _Item('/mais/configuracoes', 'Configurações', Icons.settings_outlined),
    _Item('/mais/perfil', 'Minha conta', Icons.person_outline),
  ]),
];

class AppDrawer extends ConsumerWidget {
  const AppDrawer({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final companyAsync = ref.watch(companyProvider);
    final company = companyAsync.valueOrNull;
    final localizacaoAtual = GoRouterState.of(context).uri.toString();
    // Mesma regra da sidebar Web: entre todos os itens cujo href bate com a
    // rota atual (prefixo), só o mais específico (href mais longo) fica
    // ativo — evita "/agenda" e "/agenda/bloqueios" acesos ao mesmo tempo.
    final todosHrefs = _grupos.expand((g) => g.itens.map((i) => i.href)).toList();
    final hrefAtivo = (todosHrefs.where((href) => localizacaoAtual == href || localizacaoAtual.startsWith('$href/')).toList()
          ..sort((a, b) => b.length.compareTo(a.length)))
        .firstOrNull;

    final user = supabase.auth.currentUser;

    return Drawer(
      child: SafeArea(
        child: Column(
          children: [
            DrawerHeader(
              decoration: BoxDecoration(color: Theme.of(context).colorScheme.primary),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  Icon(Icons.content_cut, color: Theme.of(context).colorScheme.onPrimary, size: 28),
                  const SizedBox(height: 8),
                  Text(
                    company?.name ?? '',
                    style: TextStyle(color: Theme.of(context).colorScheme.onPrimary, fontWeight: FontWeight.bold, fontSize: 16),
                    overflow: TextOverflow.ellipsis,
                  ),
                  if (user?.email != null)
                    Text(
                      user!.email!,
                      style: TextStyle(color: Theme.of(context).colorScheme.onPrimary.withValues(alpha: 0.8), fontSize: 12),
                      overflow: TextOverflow.ellipsis,
                    ),
                ],
              ),
            ),
            Expanded(
              child: ListView(
                padding: EdgeInsets.zero,
                children: [
                  for (final grupo in _grupos) ...[
                    Padding(
                      padding: const EdgeInsets.fromLTRB(16, 14, 16, 4),
                      child: Text(
                        grupo.label.toUpperCase(),
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                          letterSpacing: 0.5,
                          color: Theme.of(context).colorScheme.primary,
                        ),
                      ),
                    ),
                    for (final item in grupo.itens)
                      ListTile(
                        dense: true,
                        leading: Icon(item.icon, size: 20),
                        title: Text(item.label, style: const TextStyle(fontSize: 14)),
                        selected: item.href == hrefAtivo,
                        selectedTileColor: Theme.of(context).colorScheme.primary.withValues(alpha: 0.1),
                        onTap: () {
                          Navigator.of(context).pop();
                          context.go(item.href);
                        },
                      ),
                  ],
                ],
              ),
            ),
            const Divider(height: 1),
            ListTile(
              leading: const Icon(Icons.logout, color: Colors.red),
              title: const Text('Sair', style: TextStyle(color: Colors.red)),
              onTap: () {
                Navigator.of(context).pop();
                supabase.auth.signOut();
              },
            ),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );
  }
}
