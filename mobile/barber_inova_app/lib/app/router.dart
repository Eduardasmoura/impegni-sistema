import 'package:go_router/go_router.dart';
import '../data/supabase_client.dart';
import '../features/agenda/agenda_screen.dart';
import '../features/agenda/blocks_screen.dart';
import '../features/agenda/waitlist_screen.dart';
import '../features/auth/login_screen.dart';
import '../features/business/business_screen.dart';
import '../features/clients/client_segments_screen.dart';
import '../features/clients/clients_screen.dart';
import '../features/coupons/coupons_screen.dart';
import '../features/dashboard/dashboard_screen.dart';
import '../features/finance/finance_summary_screen.dart';
import '../features/inventory/inventory_screen.dart';
import '../features/marketing/marketing_hub_screen.dart';
import '../features/more/more_screen.dart';
import '../features/notifications/notifications_settings_screen.dart';
import '../features/payments/subscription_payments_screen.dart';
import '../features/payouts/payouts_screen.dart';
import '../features/plan/plan_screen.dart';
import '../features/profile/profile_screen.dart';
import '../features/reviews/reviews_screen.dart';
import '../features/security/security_screen.dart';
import '../features/services/services_screen.dart';
import '../features/settings/anamnesis_form_screen.dart';
import '../features/settings/settings_hub_screen.dart';
import '../features/team/team_screen.dart';
import 'company_scope.dart';
import 'go_router_refresh_stream.dart';
import 'main_shell.dart';

/// Menu lateral (Drawer) em vez de abas com pilha própria — por isso o
/// wrapper mudou de `StatefulShellRoute.indexedStack` (existia pra
/// gerenciar pilhas independentes por aba) pra um `ShellRoute` simples
/// (builder recebe `child`, não `navigationShell`). Os PATHS não mudaram —
/// só o tipo do nó que os envolve — então nenhum link interno/deep link
/// existente quebra. Cada rota continua resolvendo a empresa atual via
/// `CompanyScope` (fonte única: `companyProvider`) individualmente.
///
/// Deep link de push notification: qualquer rota abaixo já é endereçável
/// direto (`/agenda`, `/mais/estoque` etc.) — `push_service.dart` valida
/// contra uma allow-list antes de navegar.
final router = GoRouter(
  initialLocation: '/agenda',
  refreshListenable: GoRouterRefreshStream(supabase.auth.onAuthStateChange),
  redirect: (context, state) {
    final loggedIn = supabase.auth.currentSession != null;
    final loggingIn = state.matchedLocation == '/login';

    if (!loggedIn && !loggingIn) return '/login';
    if (loggedIn && loggingIn) return '/agenda';
    return null;
  },
  routes: [
    GoRoute(path: '/login', builder: (context, state) => const LoginScreen()),
    ShellRoute(
      builder: (context, state, child) => CompanyScope(builder: (context, company) => MainShell(company: company, child: child)),
      routes: [
        GoRoute(
          path: '/agenda',
          builder: (context, state) => CompanyScope(builder: (context, company) => AgendaScreen(company: company)),
          routes: [
            // Mesmos paths do Web (`/agenda/bloqueios`, `/agenda/espera`) —
            // antes só alcançáveis por ícone dentro da Agenda, agora também
            // rotas próprias pro Drawer.
            GoRoute(
              path: 'bloqueios',
              builder: (context, state) => CompanyScope(builder: (context, company) => BlocksScreen(company: company)),
            ),
            GoRoute(
              path: 'espera',
              builder: (context, state) => CompanyScope(builder: (context, company) => WaitlistScreen(companyId: company.id)),
            ),
          ],
        ),
        GoRoute(
          path: '/dashboard',
          builder: (context, state) => CompanyScope(builder: (context, company) => DashboardScreen(company: company)),
        ),
        GoRoute(
          path: '/clientes',
          builder: (context, state) => CompanyScope(builder: (context, company) => ClientsScreen(company: company)),
          routes: [
            GoRoute(
              path: 'segmentos',
              builder: (context, state) => CompanyScope(builder: (context, company) => ClientSegmentsScreen(companyId: company.id)),
            ),
          ],
        ),
        GoRoute(
          path: '/financeiro',
          builder: (context, state) => CompanyScope(builder: (context, company) => FinanceSummaryScreen(company: company)),
        ),
        GoRoute(
          path: '/mais',
          builder: (context, state) => CompanyScope(builder: (context, company) => MoreScreen(company: company)),
          routes: [
            GoRoute(
              path: 'perfil',
              builder: (context, state) => CompanyScope(builder: (context, company) => ProfileScreen(company: company)),
            ),
            GoRoute(
              path: 'estoque',
              builder: (context, state) => CompanyScope(builder: (context, company) => InventoryScreen(company: company)),
            ),
            GoRoute(
              path: 'negocio',
              builder: (context, state) => CompanyScope(builder: (context, company) => BusinessScreen(company: company)),
            ),
            GoRoute(
              path: 'servicos',
              builder: (context, state) => CompanyScope(builder: (context, company) => ServicesScreen(company: company)),
            ),
            GoRoute(
              path: 'equipe',
              builder: (context, state) => CompanyScope(builder: (context, company) => TeamScreen(company: company)),
            ),
            GoRoute(
              path: 'meu-plano',
              builder: (context, state) => CompanyScope(builder: (context, company) => PlanScreen(company: company)),
            ),
            GoRoute(
              path: 'pagamentos',
              builder: (context, state) => CompanyScope(builder: (context, company) => SubscriptionPaymentsScreen(company: company)),
            ),
            GoRoute(
              path: 'configuracoes',
              builder: (context, state) => const SettingsHubScreen(),
            ),
            GoRoute(
              path: 'anamnese',
              builder: (context, state) => CompanyScope(builder: (context, company) => AnamnesisFormScreen(companyId: company.id)),
            ),
            GoRoute(
              path: 'notificacoes',
              builder: (context, state) => CompanyScope(builder: (context, company) => NotificationsSettingsScreen(company: company)),
            ),
            GoRoute(
              path: 'seguranca',
              builder: (context, state) => const SecurityScreen(),
            ),
            GoRoute(
              path: 'avaliacoes',
              builder: (context, state) => CompanyScope(builder: (context, company) => ReviewsScreen(company: company)),
            ),
            GoRoute(
              path: 'repasse',
              builder: (context, state) => CompanyScope(builder: (context, company) => PayoutsScreen(company: company)),
            ),
            GoRoute(
              path: 'cupons',
              builder: (context, state) => CompanyScope(builder: (context, company) => CouponsScreen(company: company)),
            ),
            GoRoute(
              path: 'marketing',
              builder: (context, state) => CompanyScope(builder: (context, company) => MarketingHubScreen(company: company)),
            ),
          ],
        ),
      ],
    ),
  ],
);
