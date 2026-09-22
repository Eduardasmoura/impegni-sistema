import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../data/company_service.dart';
import '../features/access/access_blocked_screen.dart';
import 'access_provider.dart';
import 'biometric_gate.dart';
import 'theme.dart';

/// Casca do app autenticado — só tema por empresa + biometria + checagem de
/// acesso/trial, igual antes. O menu lateral (`Drawer`) NÃO mora aqui: cada
/// tela de nível superior já é o dono do próprio `Scaffold`/`AppBar` (com
/// título e ações específicas — o filtro do Dashboard, a busca de
/// Clientes etc.), então o `drawer:` foi pra dentro de cada uma delas
/// (`AppDrawer`, `lib/app/app_drawer.dart`, que resolve a empresa sozinha
/// via `companyProvider` — não precisa receber por parâmetro). Colocar o
/// Drawer aqui, num Scaffold próprio deste shell, empilharia uma segunda
/// AppBar por cima da AppBar de cada tela — por isso este widget só entrega
/// `child` direto, sem Scaffold próprio (mesma ideia de antes, quando este
/// shell só existia pra desenhar a bottom nav ao redor da tela ativa —
/// agora não há mais chrome nenhum pra desenhar aqui).
class MainShell extends ConsumerWidget {
  final CurrentCompany company;
  final Widget child;

  const MainShell({super.key, required this.company, required this.child});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final accessAsync = ref.watch(accessStatusProvider);

    return Theme(
      // O tema muda por empresa: paleta customizada (Meu negócio > cores) se
      // ela configurou, senão o padrão do segmento (barbearia vs. studio/
      // estética) — ver `themeForCompany`. Aplicado mesmo na tela de
      // bloqueio, pra manter a identidade visual da empresa mesmo ali.
      data: themeForCompany(company),
      // Biometria envolve tudo (inclusive a tela de bloqueio de acesso
      // abaixo) — trava o app inteiro, não só uma tela.
      child: BiometricGate(
        child: accessAsync.when(
          loading: () => const Scaffold(body: Center(child: CircularProgressIndicator())),
          error: (e, _) => child, // erro ao checar acesso não deve travar quem já tinha acesso — mesma filosofia "falha aberta" da RPC
          data: (access) {
            if (access != null && !access.allowed) {
              return AccessBlockedScreen(
                access: access,
                companyId: company.id,
                companyName: company.name,
                roleEmpresa: company.roleEmpresa,
              );
            }
            return child;
          },
        ),
      ),
    );
  }
}
