import 'package:flutter/material.dart';
import '../app/app_drawer.dart';

/// Placeholder honesto pras telas que ainda existem só no painel web —
/// mostra o que falta em vez de fingir a funcionalidade ou deixar a aba
/// quebrada. Cada uma some daqui assim que a fase correspondente do plano
/// de paridade constrói a tela de verdade (ver plano "Paridade Web ↔
/// Mobile").
class ComingSoonScreen extends StatelessWidget {
  final String title;
  final IconData icon;
  final String? description;

  const ComingSoonScreen({super.key, required this.title, this.icon = Icons.construction_outlined, this.description});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      drawer: const AppDrawer(),
      appBar: AppBar(title: Text(title)),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon, size: 48, color: Colors.grey),
              const SizedBox(height: 16),
              Text('$title chega em breve no app', style: Theme.of(context).textTheme.titleMedium, textAlign: TextAlign.center),
              if (description != null) ...[
                const SizedBox(height: 8),
                Text(description!, style: const TextStyle(color: Colors.grey), textAlign: TextAlign.center),
              ],
              const SizedBox(height: 4),
              const Text('Por enquanto, use o painel web.', style: TextStyle(color: Colors.grey), textAlign: TextAlign.center),
            ],
          ),
        ),
      ),
    );
  }
}
