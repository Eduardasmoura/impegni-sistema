import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../data/supabase_client.dart';
import 'company_provider.dart';

class PlanLimits {
  final int? maxUsers;
  final int? maxProfessionals;
  final int? maxClients;
  final int? maxAppointments;

  PlanLimits({this.maxUsers, this.maxProfessionals, this.maxClients, this.maxAppointments});
}

/// Mesma RPC `get_company_plan_limits` (migration 044) já usada pelo painel
/// web (`apps/web-professional/src/lib/plan-limits.ts`) — não dá pra
/// compartilhar o código Dart×TypeScript, mas os dois batem na mesma fonte
/// (a função no Postgres), então nunca divergem.
final planLimitsProvider = FutureProvider<PlanLimits?>((ref) async {
  final company = await ref.watch(companyProvider.future);
  if (company == null) return null;

  final rows = await supabase.rpc('get_company_plan_limits', params: {'p_company_id': company.id});
  final list = rows as List;
  if (list.isEmpty) return null;
  final row = list.first as Map<String, dynamic>;
  return PlanLimits(
    maxUsers: row['max_users'] as int?,
    maxProfessionals: row['max_professionals'] as int?,
    maxClients: row['max_clients'] as int?,
    maxAppointments: row['max_appointments'] as int?,
  );
});

/// Mesma regra de `planAllowsTeam()` do web: só esconde "Equipe" quando o
/// plano permite exatamente 1 profissional. Sem dado (edge case) cai pro
/// lado permissivo, mesmo critério do web.
bool planAllowsTeam(PlanLimits? limits) {
  if (limits == null) return true;
  return limits.maxProfessionals == null || limits.maxProfessionals! >= 2;
}
