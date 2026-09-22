import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'package:intl/intl.dart';
import 'package:supabase_flutter/supabase_flutter.dart' show FileOptions, UserAttributes;
import '../../app/app_drawer.dart';
import '../../data/company_service.dart';
import '../../data/supabase_client.dart';
import '../../shared/password_change_card.dart';

/// Meu perfil — mesmos campos de
/// `apps/web-professional/.../perfil/perfil-view.tsx` (avatar, nome,
/// telefone, e-mail, senha). Reconstruída nesta fase — antes só tinha
/// e-mail + Sair. Trocar senha usa `PasswordChangeCard`, compartilhado com
/// a tela Segurança (mesmo espírito do `PasswordForm` único do web).
class ProfileScreen extends StatefulWidget {
  final CurrentCompany company;

  const ProfileScreen({super.key, required this.company});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  final _nameController = TextEditingController();
  final _phoneController = TextEditingController();
  final _emailController = TextEditingController();

  bool _loading = true;
  bool _saving = false;
  bool _uploadingAvatar = false;
  String? _avatarUrl;
  String? _createdAt;
  String? _originalEmail;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _nameController.dispose();
    _phoneController.dispose();
    _emailController.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    final user = supabase.auth.currentUser;
    final profile = await supabase.from('profiles').select('full_name, phone, avatar_url, created_at').eq('id', user!.id).maybeSingle();
    if (!mounted) return;
    setState(() {
      _nameController.text = profile?['full_name'] as String? ?? '';
      _phoneController.text = profile?['phone'] as String? ?? '';
      _emailController.text = user.email ?? '';
      _originalEmail = user.email;
      _avatarUrl = profile?['avatar_url'] as String?;
      _createdAt = profile?['created_at'] as String? ?? user.createdAt;
      _loading = false;
    });
  }

  Future<void> _trocarFoto() async {
    final picked = await ImagePicker().pickImage(source: ImageSource.gallery, maxWidth: 1200, imageQuality: 82);
    if (picked == null) return;
    setState(() => _uploadingAvatar = true);
    try {
      final userId = supabase.auth.currentUser!.id;
      final bytes = await picked.readAsBytes();
      final ext = picked.name.split('.').last;
      final path = '$userId/${DateTime.now().millisecondsSinceEpoch}.$ext';
      await supabase.storage.from('avatars').uploadBinary(path, bytes, fileOptions: const FileOptions(upsert: true));
      final url = supabase.storage.from('avatars').getPublicUrl(path);
      // Persiste já aqui, não só em _salvar() — sem isso o arquivo ia pro
      // Storage mas fechar a tela antes de tocar em "Salvar" perdia a troca
      // de foto (BUG: auditoria pré-lançamento; mesma correção aplicada nos
      // apps web-professional e web-client).
      await supabase.from('profiles').update({'avatar_url': url}).eq('id', userId);
      if (!mounted) return;
      setState(() => _avatarUrl = url);
    } catch (_) {
      if (mounted) _mostrarErro('Não foi possível enviar a foto.');
    } finally {
      if (mounted) setState(() => _uploadingAvatar = false);
    }
  }

  Future<void> _salvar() async {
    setState(() => _saving = true);
    try {
      final userId = supabase.auth.currentUser!.id;
      await supabase.from('profiles').update({
        'full_name': _nameController.text.trim(),
        'phone': _phoneController.text.trim().isEmpty ? null : _phoneController.text.trim(),
        'avatar_url': _avatarUrl,
      }).eq('id', userId);

      var mensagem = 'Perfil atualizado!';
      if (_emailController.text.trim() != _originalEmail) {
        await supabase.auth.updateUser(UserAttributes(email: _emailController.text.trim()));
        mensagem += ' Enviamos um link de confirmação para o novo e-mail.';
      }
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(mensagem)));
    } catch (e) {
      if (mounted) _mostrarErro('Não foi possível salvar. Tente de novo.');
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  void _mostrarErro(String mensagem) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(mensagem), backgroundColor: Colors.red));
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return Scaffold(drawer: const AppDrawer(), appBar: AppBar(title: const Text('Meu perfil')), body: const Center(child: CircularProgressIndicator()));
    }
    return Scaffold(
      drawer: const AppDrawer(),
      appBar: AppBar(title: const Text('Meu perfil')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Center(
            child: GestureDetector(
              onTap: _uploadingAvatar ? null : _trocarFoto,
              child: Stack(
                children: [
                  CircleAvatar(
                    radius: 40,
                    backgroundImage: _avatarUrl != null ? NetworkImage(_avatarUrl!) : null,
                    child: _avatarUrl == null ? const Icon(Icons.person, size: 36) : null,
                  ),
                  Positioned(
                    right: 0,
                    bottom: 0,
                    child: CircleAvatar(
                      radius: 14,
                      backgroundColor: Theme.of(context).colorScheme.primary,
                      child: _uploadingAvatar
                          ? const Padding(padding: EdgeInsets.all(3), child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                          : const Icon(Icons.camera_alt, size: 14, color: Colors.white),
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 24),
          TextField(controller: _nameController, decoration: const InputDecoration(labelText: 'Nome completo', border: OutlineInputBorder())),
          const SizedBox(height: 12),
          TextField(
            controller: _phoneController,
            keyboardType: TextInputType.phone,
            decoration: const InputDecoration(labelText: 'Telefone / WhatsApp', border: OutlineInputBorder()),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _emailController,
            keyboardType: TextInputType.emailAddress,
            decoration: const InputDecoration(labelText: 'Email', border: OutlineInputBorder()),
          ),
          if (_createdAt != null) ...[
            const SizedBox(height: 12),
            Text(
              'Conta criada em ${DateFormat('dd/MM/yyyy').format(DateTime.parse(_createdAt!).toLocal())}',
              style: const TextStyle(fontSize: 12, color: Colors.grey),
            ),
          ],
          const SizedBox(height: 16),
          FilledButton.icon(
            onPressed: _saving ? null : _salvar,
            icon: const Icon(Icons.save_outlined),
            label: Text(_saving ? 'Salvando...' : 'Salvar alterações'),
          ),
          const SizedBox(height: 32),
          const Divider(),
          const SizedBox(height: 8),
          const PasswordChangeCard(),
          const SizedBox(height: 24),
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
