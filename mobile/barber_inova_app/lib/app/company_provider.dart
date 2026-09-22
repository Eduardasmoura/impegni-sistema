import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../data/company_service.dart';
import 'session.dart';

/// A empresa do profissional logado, como provider — antes disso só existia
/// como `fetchCurrentCompany()` chamado direto no `initState` do antigo
/// `MainShell`. Virou provider porque agora várias telas em rotas
/// diferentes (não só a casca) precisam do mesmo dado: um `FutureProvider`
/// do Riverpod já cacheia o resultado (uma chamada só, todo mundo que
/// assiste recebe o mesmo valor) — o mesmo papel que `cache()` do React faz
/// pro `getCurrentCompany()` do app web (`lib/company.ts`).
///
/// Depende de `currentUserProvider` (ver `session.dart`) só pra reconsultar
/// quando o usuário muda (login/logout) — não pelo valor em si.
final companyProvider = FutureProvider((ref) {
  ref.watch(currentUserProvider);
  return fetchCurrentCompany();
});
