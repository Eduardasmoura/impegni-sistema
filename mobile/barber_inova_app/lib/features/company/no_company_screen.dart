import 'package:flutter/material.dart';
import '../../data/supabase_client.dart';

/// Mostrada quando o usuário logado ainda não tem nenhuma empresa em
/// `company_members` — o cadastro da empresa (onboarding) só existe no app
/// web-professional por enquanto, então só orientamos a completar por lá.
class NoCompanyScreen extends StatelessWidget {
  const NoCompanyScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Sem empresa'),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () => supabase.auth.signOut(),
          ),
        ],
      ),
      body: const Center(
        child: Padding(
          padding: EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.business_outlined, size: 48, color: Colors.grey),
              SizedBox(height: 16),
              Text(
                'Sua conta ainda não está vinculada a nenhuma empresa.\n'
                'Complete o cadastro no painel web para liberar o app.',
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
