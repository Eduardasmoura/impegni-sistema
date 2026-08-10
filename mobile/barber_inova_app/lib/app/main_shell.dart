import 'package:flutter/material.dart';
import '../data/company_service.dart';
import '../features/agenda/agenda_screen.dart';
import '../features/company/no_company_screen.dart';
import '../features/finance/finance_summary_screen.dart';
import '../features/inventory/inventory_screen.dart';
import '../features/notifications/push_service.dart';
import '../features/profile/profile_screen.dart';

/// Casca do app já autenticado: resolve a empresa do profissional uma vez e
/// monta a navegação por abas (Agenda / Financeiro / Estoque / Perfil).
class MainShell extends StatefulWidget {
  const MainShell({super.key});

  @override
  State<MainShell> createState() => _MainShellState();
}

class _MainShellState extends State<MainShell> {
  int _tab = 0;
  CurrentCompany? _company;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadCompany();
  }

  Future<void> _loadCompany() async {
    final company = await fetchCurrentCompany();
    if (!mounted) return;
    setState(() {
      _company = company;
      _loading = false;
    });
    if (company != null) {
      // Se o Firebase não foi configurado ainda (sem `firebase_options.dart`,
      // gerado por `flutterfire configure`), isso falha silenciosamente — o
      // resto do app funciona normalmente sem push.
      PushService.init(companyId: company.id).catchError((_) {});
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }
    final company = _company;
    if (company == null) {
      return const NoCompanyScreen();
    }

    final screens = [
      AgendaScreen(company: company),
      FinanceSummaryScreen(company: company),
      InventoryScreen(company: company),
      ProfileScreen(company: company),
    ];

    return Scaffold(
      body: IndexedStack(index: _tab, children: screens),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _tab,
        onDestinationSelected: (index) => setState(() => _tab = index),
        destinations: const [
          NavigationDestination(icon: Icon(Icons.calendar_today_outlined), selectedIcon: Icon(Icons.calendar_today), label: 'Agenda'),
          NavigationDestination(icon: Icon(Icons.attach_money_outlined), selectedIcon: Icon(Icons.attach_money), label: 'Financeiro'),
          NavigationDestination(icon: Icon(Icons.inventory_2_outlined), selectedIcon: Icon(Icons.inventory_2), label: 'Estoque'),
          NavigationDestination(icon: Icon(Icons.person_outline), selectedIcon: Icon(Icons.person), label: 'Perfil'),
        ],
      ),
    );
  }
}
