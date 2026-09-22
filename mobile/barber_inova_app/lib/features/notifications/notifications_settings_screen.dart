import 'package:flutter/material.dart';
import '../../app/app_drawer.dart';
import '../../data/company_service.dart';
import '../../data/supabase_client.dart';

/// Notificações — mesmo conteúdo de
/// `apps/web-professional/.../notificacoes/notificacoes-view.tsx`: só o
/// lembrete geral por WhatsApp existe de verdade hoje, então é só isso que
/// aparece aqui (nada de toggles fingindo funcionalidades que não existem).
/// Nome do arquivo evita colisão com `push_service.dart` (registro de
/// token FCM, um assunto totalmente diferente).
class NotificationsSettingsScreen extends StatefulWidget {
  final CurrentCompany company;

  const NotificationsSettingsScreen({super.key, required this.company});

  @override
  State<NotificationsSettingsScreen> createState() => _NotificationsSettingsScreenState();
}

class _NotificationsSettingsScreenState extends State<NotificationsSettingsScreen> {
  bool _loading = true;
  bool _enabled = false;
  bool _saving = false;

  bool get _isManager => widget.company.roleEmpresa == 'owner' || widget.company.roleEmpresa == 'admin';

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final row = await supabase.from('companies').select('whatsapp_reminder_enabled').eq('id', widget.company.id).single();
    if (!mounted) return;
    setState(() {
      _enabled = row['whatsapp_reminder_enabled'] as bool? ?? false;
      _loading = false;
    });
  }

  Future<void> _alternar(bool valor) async {
    setState(() {
      _enabled = valor;
      _saving = true;
    });
    try {
      await supabase.from('companies').update({'whatsapp_reminder_enabled': valor}).eq('id', widget.company.id);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(valor ? 'Lembretes por WhatsApp ativados' : 'Lembretes por WhatsApp desativados')));
      }
    } catch (_) {
      setState(() => _enabled = !valor);
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Não foi possível salvar.'), backgroundColor: Colors.red));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return Scaffold(drawer: const AppDrawer(), appBar: AppBar(title: const Text('Notificações')), body: const Center(child: CircularProgressIndicator()));
    }
    return Scaffold(
      drawer: const AppDrawer(),
      appBar: AppBar(title: const Text('Notificações')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Card(
            child: SwitchListTile(
              secondary: const Icon(Icons.chat_bubble_outline),
              title: const Text('Lembrete automático por WhatsApp'),
              subtitle: const Text('Envia um lembrete pro cliente antes do horário agendado.'),
              value: _enabled,
              onChanged: (_saving || !_isManager) ? null : _alternar,
            ),
          ),
          if (!_isManager) ...[
            const SizedBox(height: 8),
            const Padding(
              padding: EdgeInsets.symmetric(horizontal: 4),
              child: Text('Só o proprietário ou administrador pode alterar esta configuração.', style: TextStyle(fontSize: 12, color: Colors.grey)),
            ),
          ],
          const SizedBox(height: 16),
          const Padding(
            padding: EdgeInsets.symmetric(horizontal: 4),
            child: Text(
              'Lembretes, confirmações e avisos de cancelamento configuráveis separadamente são uma melhoria futura — hoje existe apenas este lembrete geral.',
              style: TextStyle(fontSize: 12, color: Colors.grey),
            ),
          ),
        ],
      ),
    );
  }
}
