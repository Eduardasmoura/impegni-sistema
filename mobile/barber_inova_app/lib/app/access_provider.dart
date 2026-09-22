import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../data/supabase_client.dart';
import 'company_provider.dart';

class AccessStatus {
  final bool allowed;
  final String reason;
  final DateTime? trialEndsAt;

  AccessStatus({required this.allowed, required this.reason, this.trialEndsAt});
}

/// Mesma RPC `get_company_access_status` (migration 046) que o web chama —
/// fonte única de verdade sobre bloqueio por trial vencido/assinatura
/// cancelada-suspensa/empresa suspensa (FASE 1 da auditoria). Não dá pra
/// compartilhar código Dart×TypeScript, mas os dois batem na mesma função
/// no Postgres, então nunca divergem sobre quem pode entrar.
final accessStatusProvider = FutureProvider<AccessStatus?>((ref) async {
  final company = await ref.watch(companyProvider.future);
  if (company == null) return null;

  // Mesmo motivo do timeout em `fetchCurrentCompany` — sem isso, rede
  // ruim deixa essa chamada pendurada pra sempre em vez de cair no branch
  // `error` (que já existe e já é "falha aberta", só nunca era acionado).
  final rows = await supabase
      .rpc('get_company_access_status', params: {'p_company_id': company.id})
      .timeout(const Duration(seconds: 15));
  final list = rows as List;
  if (list.isEmpty) return null;
  final row = list.first as Map<String, dynamic>;
  return AccessStatus(
    allowed: row['allowed'] as bool,
    reason: row['reason'] as String,
    trialEndsAt: row['trial_ends_at'] != null ? DateTime.parse(row['trial_ends_at'] as String) : null,
  );
});
