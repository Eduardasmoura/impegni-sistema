import 'package:go_router/go_router.dart';
import '../data/supabase_client.dart';
import '../features/auth/login_screen.dart';
import 'go_router_refresh_stream.dart';
import 'main_shell.dart';

/// Duas rotas só: /login (sem sessão) e / (app autenticado, com abas). A
/// navegação entre as abas é feita dentro do MainShell, não pelo router.
final router = GoRouter(
  initialLocation: '/',
  refreshListenable: GoRouterRefreshStream(supabase.auth.onAuthStateChange),
  redirect: (context, state) {
    final loggedIn = supabase.auth.currentSession != null;
    final loggingIn = state.matchedLocation == '/login';

    if (!loggedIn && !loggingIn) return '/login';
    if (loggedIn && loggingIn) return '/';
    return null;
  },
  routes: [
    GoRoute(path: '/login', builder: (context, state) => const LoginScreen()),
    GoRoute(path: '/', builder: (context, state) => const MainShell()),
  ],
);
