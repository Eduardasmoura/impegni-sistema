import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../app/app_drawer.dart';
import '../../data/supabase_client.dart';
import '../../shared/password_change_card.dart';
import 'biometric_service.dart';

/// Segurança — mesmo conteúdo de
/// `apps/web-professional/.../seguranca/seguranca-view.tsx` (trocar senha +
/// atalho Sair) mais um item que só existe no mobile: desbloqueio por
/// biometria/PIN do aparelho (FASE 7, sem equivalente Web — não tem
/// hardware biométrico num navegador de desktop).
class SecurityScreen extends StatefulWidget {
  const SecurityScreen({super.key});

  @override
  State<SecurityScreen> createState() => _SecurityScreenState();
}

class _SecurityScreenState extends State<SecurityScreen> {
  bool _carregandoBiometria = true;
  bool _suportado = false;
  bool _ativado = false;

  @override
  void initState() {
    super.initState();
    _carregarBiometria();
  }

  Future<void> _carregarBiometria() async {
    final suportado = await BiometricService.isSupported();
    final ativado = suportado ? await BiometricService.isEnabled() : false;
    if (!mounted) return;
    setState(() {
      _suportado = suportado;
      _ativado = ativado;
      _carregandoBiometria = false;
    });
  }

  Future<void> _alternarBiometria(bool valor) async {
    final aplicou = await BiometricService.setEnabled(valor);
    if (!mounted) return;
    setState(() => _ativado = aplicou ? valor : _ativado);
    if (!aplicou && valor && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Não foi possível confirmar sua identidade — tente novamente.')));
    }
  }

  @override
  Widget build(BuildContext context) {
    final email = supabase.auth.currentUser?.email ?? '';
    return Scaffold(
      drawer: const AppDrawer(),
      appBar: AppBar(title: const Text('Segurança')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text('Conta conectada como $email.', style: const TextStyle(color: Colors.grey, fontSize: 13)),
          const SizedBox(height: 20),
          const PasswordChangeCard(),
          const SizedBox(height: 24),
          if (!_carregandoBiometria && _suportado) ...[
            Card(
              child: SwitchListTile(
                secondary: const Icon(Icons.fingerprint),
                title: const Text('Desbloqueio por biometria'),
                subtitle: const Text('Pede Face ID/impressão digital (ou PIN do aparelho) toda vez que abrir o app'),
                value: _ativado,
                onChanged: _alternarBiometria,
              ),
            ),
            const SizedBox(height: 8),
          ],
          const Divider(),
          const SizedBox(height: 8),
          ListTile(
            leading: const Icon(Icons.logout, color: Colors.red),
            title: const Text('Sair', style: TextStyle(color: Colors.red)),
            onTap: () {
              supabase.auth.signOut();
              if (context.canPop()) context.pop();
            },
          ),
        ],
      ),
    );
  }
}
