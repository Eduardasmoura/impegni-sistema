import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../data/supabase_client.dart';

/// Stream do estado de autenticação — usado pelo router (redirecionar pra
/// /login quando cai a sessão) e por telas que precisam saber se há usuário.
final authStateProvider = StreamProvider<AuthState>((ref) {
  return supabase.auth.onAuthStateChange;
});

final currentUserProvider = Provider<User?>((ref) {
  final authState = ref.watch(authStateProvider).valueOrNull;
  return authState?.session?.user ?? supabase.auth.currentUser;
});
