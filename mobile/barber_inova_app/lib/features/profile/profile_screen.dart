import 'package:flutter/material.dart';
import '../../data/company_service.dart';
import '../../data/supabase_client.dart';

class ProfileScreen extends StatelessWidget {
  final CurrentCompany company;

  const ProfileScreen({super.key, required this.company});

  @override
  Widget build(BuildContext context) {
    final user = supabase.auth.currentUser;
    return Scaffold(
      appBar: AppBar(title: const Text('Perfil')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          const CircleAvatar(radius: 32, child: Icon(Icons.person, size: 32)),
          const SizedBox(height: 12),
          Center(child: Text(user?.email ?? '', style: const TextStyle(fontWeight: FontWeight.w600))),
          const SizedBox(height: 4),
          Center(child: Text('${company.name} · ${company.roleEmpresa}', style: const TextStyle(color: Colors.grey))),
          const SizedBox(height: 32),
          ListTile(
            leading: const Icon(Icons.logout),
            title: const Text('Sair'),
            onTap: () => supabase.auth.signOut(),
          ),
        ],
      ),
    );
  }
}
