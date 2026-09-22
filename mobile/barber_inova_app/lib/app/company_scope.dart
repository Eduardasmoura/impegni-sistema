import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../data/company_service.dart';
import '../features/company/no_company_screen.dart';
import 'company_provider.dart';

/// Resolve `companyProvider` (loading / sem empresa / erro / pronto) uma vez
/// só e entrega a `CurrentCompany` já carregada pro `builder` — evita
/// repetir esses 3 estados em cada tela nova que precisa da empresa (hoje
/// isso já ficava duplicado dentro do antigo `MainShell`). Cada rota que
/// precisa de `CurrentCompany` (a maioria) usa isto no lugar de receber a
/// empresa por parâmetro direto do router.
class CompanyScope extends ConsumerWidget {
  final Widget Function(BuildContext context, CurrentCompany company) builder;

  const CompanyScope({super.key, required this.builder});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(companyProvider);
    return async.when(
      data: (company) => company == null ? const NoCompanyScreen() : builder(context, company),
      // Sem AppBar aqui (tela de carregamento/erro antes de saber qual
      // empresa é) — SafeArea explícito pra não ficar atrás do notch.
      loading: () => const Scaffold(body: SafeArea(child: Center(child: CircularProgressIndicator()))),
      error: (error, _) => Scaffold(
        body: SafeArea(
          child: Center(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    error is TimeoutException
                        ? 'A conexão demorou demais. Confira sua internet e tente de novo.'
                        : 'Não foi possível carregar sua empresa.\n$error',
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 16),
                  FilledButton(onPressed: () => ref.invalidate(companyProvider), child: const Text('Tentar de novo')),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
