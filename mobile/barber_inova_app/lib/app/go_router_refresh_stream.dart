import 'dart:async';
import 'package:flutter/foundation.dart';

/// Adapta qualquer Stream (aqui, o onAuthStateChange do Supabase) para o
/// `Listenable` que o go_router espera em `refreshListenable` — assim o
/// router reavalia `redirect` sempre que a sessão muda (login/logout).
class GoRouterRefreshStream extends ChangeNotifier {
  late final StreamSubscription<dynamic> _subscription;

  GoRouterRefreshStream(Stream<dynamic> stream) {
    notifyListeners();
    _subscription = stream.asBroadcastStream().listen((_) => notifyListeners());
  }

  @override
  void dispose() {
    _subscription.cancel();
    super.dispose();
  }
}
