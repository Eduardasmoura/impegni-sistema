import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart' show UserAttributes;
import '../data/supabase_client.dart';

/// Trocar senha — mesma API (`supabase.auth.updateUser`) usada no app web,
/// compartilhada aqui entre Meu perfil e Segurança (mesmo papel do
/// `PasswordForm` do web, reaproveitado nos dois lugares em vez de duplicar
/// o formulário).
class PasswordChangeCard extends StatefulWidget {
  const PasswordChangeCard({super.key});

  @override
  State<PasswordChangeCard> createState() => _PasswordChangeCardState();
}

class _PasswordChangeCardState extends State<PasswordChangeCard> {
  final _passwordController = TextEditingController();
  final _confirmController = TextEditingController();
  bool _saving = false;

  @override
  void dispose() {
    _passwordController.dispose();
    _confirmController.dispose();
    super.dispose();
  }

  Future<void> _trocar() async {
    if (_passwordController.text.length < 6) {
      _erro('Use pelo menos 6 caracteres.');
      return;
    }
    if (_passwordController.text != _confirmController.text) {
      _erro('As senhas não coincidem.');
      return;
    }
    setState(() => _saving = true);
    try {
      await supabase.auth.updateUser(UserAttributes(password: _passwordController.text));
      _passwordController.clear();
      _confirmController.clear();
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Senha alterada com sucesso!')));
    } catch (_) {
      _erro('Não foi possível trocar a senha.');
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  void _erro(String mensagem) {
    if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(mensagem), backgroundColor: Colors.red));
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text('Trocar senha', style: Theme.of(context).textTheme.titleSmall),
        const SizedBox(height: 12),
        TextField(
          controller: _passwordController,
          obscureText: true,
          decoration: const InputDecoration(labelText: 'Nova senha', hintText: 'Mínimo 6 caracteres', border: OutlineInputBorder()),
        ),
        const SizedBox(height: 12),
        TextField(
          controller: _confirmController,
          obscureText: true,
          decoration: const InputDecoration(labelText: 'Confirmar nova senha', border: OutlineInputBorder()),
        ),
        const SizedBox(height: 12),
        OutlinedButton.icon(
          onPressed: _saving ? null : _trocar,
          icon: const Icon(Icons.key_outlined),
          label: Text(_saving ? 'Alterando...' : 'Alterar senha'),
        ),
      ],
    );
  }
}
