import 'supabase_client.dart';

class CurrentCompany {
  final String id;
  final String name;
  final String roleEmpresa;

  CurrentCompany({required this.id, required this.name, required this.roleEmpresa});
}

/// A empresa (tenant) do profissional logado, mesma lógica usada no app web
/// (`apps/web-professional/src/lib/company.ts`) — primeira empresa encontrada
/// em `company_members`. Se o usuário ainda não criou nenhuma empresa (fez
/// isso pelo onboarding do painel web), retorna null e a tela chamadora deve
/// orientar a completar o cadastro no web antes de usar o app.
Future<CurrentCompany?> fetchCurrentCompany() async {
  final userId = supabase.auth.currentUser?.id;
  if (userId == null) return null;

  final membership = await supabase
      .from('company_members')
      .select('role_empresa, companies(id, name)')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle();

  if (membership == null || membership['companies'] == null) return null;

  final company = membership['companies'] as Map<String, dynamic>;
  return CurrentCompany(
    id: company['id'] as String,
    name: company['name'] as String,
    roleEmpresa: membership['role_empresa'] as String,
  );
}
