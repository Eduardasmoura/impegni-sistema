import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../app/app_drawer.dart';

/// Hub de Configurações — mesmo papel de
/// `apps/web-professional/.../configuracoes/configuracoes-view.tsx`: só
/// navegação, sem duplicar conteúdo de nenhuma das telas que já existem.
class SettingsHubScreen extends StatelessWidget {
  const SettingsHubScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final itens = [
      (Icons.store_outlined, 'Negócio', 'Identidade visual, capa, cores, horários, link público', '/mais/negocio'),
      (Icons.assignment_outlined, 'Anamnese', 'Perguntas da ficha preenchida com o cliente', '/mais/anamnese'),
      (Icons.person_outline, 'Conta', 'Nome, foto, telefone, e-mail e senha', '/mais/perfil'),
      (Icons.notifications_outlined, 'Notificações', 'Lembretes automáticos por WhatsApp', '/mais/notificacoes'),
      (Icons.shield_outlined, 'Segurança', 'Trocar senha e sair da conta', '/mais/seguranca'),
    ];
    return Scaffold(
      drawer: const AppDrawer(),
      appBar: AppBar(title: const Text('Configurações')),
      body: ListView(
        children: itens.map((item) {
          final (icon, titulo, subtitulo, rota) = item;
          return ListTile(
            leading: Icon(icon),
            title: Text(titulo),
            subtitle: Text(subtitulo, style: const TextStyle(fontSize: 12)),
            trailing: const Icon(Icons.chevron_right, size: 20),
            onTap: () => context.push(rota),
          );
        }).toList(),
      ),
    );
  }
}
