import 'dart:async';

import 'supabase_client.dart';

class CurrentCompany {
  final String id;
  final String name;
  final String roleEmpresa;
  final String themeKey; // 'dark_blue' | 'soft_purple' (vem de segments.theme_key)
  // Paleta customizável (Meu negócio > cores) — hex ou null (empresa nunca
  // customizou, usa o tema padrão do segmento). Mesmos 3 campos de
  // `companies.color_primary/secondary/accent` que o web já salva.
  final String? colorPrimary;
  final String? colorSecondary;
  final String? colorAccent;
  // companies.anamnesis_enabled — mesmo flag que o web usa pra mostrar ou
  // não a funcionalidade (o formulário em si mora em anamnesis_forms/fields,
  // configurável em Configurações > Anamnese no web).
  final bool anamnesisEnabled;

  CurrentCompany({
    required this.id,
    required this.name,
    required this.roleEmpresa,
    required this.themeKey,
    this.colorPrimary,
    this.colorSecondary,
    this.colorAccent,
    this.anamnesisEnabled = false,
  });
}

/// A empresa (tenant) do profissional logado, mesma lógica usada no app web
/// (`apps/web-professional/src/lib/company.ts`) — primeira empresa encontrada
/// em `company_members`. Se o usuário ainda não criou nenhuma empresa (fez
/// isso pelo onboarding do painel web), retorna null e a tela chamadora deve
/// orientar a completar o cadastro no web antes de usar o app.
Future<CurrentCompany?> fetchCurrentCompany() async {
  final userId = supabase.auth.currentUser?.id;
  if (userId == null) return null;

  // Sem timeout aqui, uma rede ruim/instável (Wi-Fi capturando portal,
  // DNS travado etc.) deixava esse `await` pendurado pra sempre — a tela de
  // carregamento (spinner num Scaffold branco) nunca saía do lugar, dando a
  // impressão de "app não abre". O cliente HTTP do Supabase não tem timeout
  // próprio, então cabe pra quem chama. `CompanyScope` já sabia mostrar erro
  // (só nunca disparava, porque nada nunca lançava exceção).
  final membership = await supabase
      .from('company_members')
      .select('role_empresa, companies(id, name, color_primary, color_secondary, color_accent, anamnesis_enabled, segments(theme_key))')
      .eq('user_id', userId)
      .eq('active', true)
      .limit(1)
      .maybeSingle()
      .timeout(const Duration(seconds: 15));

  if (membership == null || membership['companies'] == null) return null;

  final company = membership['companies'] as Map<String, dynamic>;
  final segment = company['segments'] as Map<String, dynamic>?;
  return CurrentCompany(
    id: company['id'] as String,
    name: company['name'] as String,
    roleEmpresa: membership['role_empresa'] as String,
    themeKey: (segment?['theme_key'] as String?) ?? 'dark_blue',
    colorPrimary: company['color_primary'] as String?,
    colorSecondary: company['color_secondary'] as String?,
    colorAccent: company['color_accent'] as String?,
    anamnesisEnabled: company['anamnesis_enabled'] as bool? ?? false,
  );
}
