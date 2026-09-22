import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../app/app_drawer.dart';
import '../../app/plan_limits_provider.dart';
import '../../data/company_service.dart';
import '../../data/supabase_client.dart';
import '../../shared/coming_soon_screen.dart';
import 'team_form_sheet.dart';
import 'weekly_hours_sheet.dart';

/// Cadastro dos profissionais que atendem — mesma funcionalidade de
/// `apps/web-professional/.../equipe/equipe-view.tsx`. Igual ao web, só
/// aparece pra planos que permitem mais de 1 profissional
/// (`plans.max_professionals`, ver `plan_limits_provider.dart`); quem
/// chegar aqui mesmo assim (link direto, ex.: deep link) recebe o mesmo
/// aviso do web em vez de uma tela quebrada — e o gatilho
/// `enforce_limit_professionals` no banco bloqueia a inserção de qualquer
/// jeito, então isto aqui é só uma segunda camada de UX, não a segurança
/// de verdade.
class TeamScreen extends ConsumerStatefulWidget {
  final CurrentCompany company;

  const TeamScreen({super.key, required this.company});

  @override
  ConsumerState<TeamScreen> createState() => _TeamScreenState();
}

class _TeamScreenState extends ConsumerState<TeamScreen> {
  bool _loading = true;
  List<Map<String, dynamic>> _professionals = [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    final rows = await supabase
        .from('professionals')
        .select('id, name, role_title, start_time, end_time, active')
        .eq('company_id', widget.company.id)
        .order('name', ascending: true);
    if (!mounted) return;
    setState(() {
      _professionals = List<Map<String, dynamic>>.from(rows);
      _loading = false;
    });
  }

  Future<void> _abrirFormulario({Map<String, dynamic>? profissional}) async {
    final salvou = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      builder: (context) => TeamFormSheet(companyId: widget.company.id, profissional: profissional),
    );
    if (salvou == true) _load();
  }

  Future<void> _abrirHorarios(Map<String, dynamic> profissional) async {
    final salvou = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      builder: (context) => WeeklyHoursSheet(companyId: widget.company.id, professional: profissional),
    );
    if (salvou == true) _load();
  }

  @override
  Widget build(BuildContext context) {
    final limitsAsync = ref.watch(planLimitsProvider);
    return limitsAsync.when(
      loading: () => const Scaffold(drawer: AppDrawer(), body: Center(child: CircularProgressIndicator())),
      error: (e, _) => const ComingSoonScreen(icon: Icons.groups_outlined, title: 'Equipe'),
      data: (limits) {
        if (!planAllowsTeam(limits)) {
          return const ComingSoonScreen(
            icon: Icons.groups_outlined,
            title: 'Equipe',
            description: 'Seu plano atual permite só 1 profissional. Fale com o suporte pra contratar mais vagas.',
          );
        }
        return Scaffold(
          drawer: const AppDrawer(),
          appBar: AppBar(title: const Text('Equipe')),
          floatingActionButton: FloatingActionButton.extended(
            onPressed: () => _abrirFormulario(),
            icon: const Icon(Icons.add),
            label: const Text('Novo'),
          ),
          body: _loading
              ? const Center(child: CircularProgressIndicator())
              : RefreshIndicator(
                  onRefresh: _load,
                  child: _professionals.isEmpty
                      ? ListView(
                          children: const [
                            SizedBox(height: 120),
                            Center(child: Text('Nenhum profissional cadastrado.', style: TextStyle(color: Colors.grey))),
                          ],
                        )
                      : ListView.separated(
                          padding: const EdgeInsets.all(12),
                          itemCount: _professionals.length,
                          separatorBuilder: (_, __) => const SizedBox(height: 8),
                          itemBuilder: (context, index) {
                            final p = _professionals[index];
                            final ativo = p['active'] as bool? ?? true;
                            final nome = p['name'] as String? ?? '';
                            final inicio = (p['start_time'] as String?)?.substring(0, 5);
                            final fim = (p['end_time'] as String?)?.substring(0, 5);
                            final horario = (inicio == null || fim == null) ? 'Sem expediente definido' : '$inicio–$fim';
                            return Card(
                              child: ListTile(
                                leading: CircleAvatar(child: Text(nome.isNotEmpty ? nome[0].toUpperCase() : '?')),
                                title: Text(nome, style: ativo ? null : const TextStyle(color: Colors.grey, decoration: TextDecoration.lineThrough)),
                                subtitle: Text('${p['role_title'] ?? '—'} · $horario${ativo ? '' : ' · inativo'}'),
                                trailing: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    IconButton(
                                      icon: const Icon(Icons.schedule_outlined, size: 20),
                                      tooltip: 'Horários por dia da semana',
                                      onPressed: () => _abrirHorarios(p),
                                    ),
                                    const Icon(Icons.chevron_right, size: 20),
                                  ],
                                ),
                                onTap: () => _abrirFormulario(profissional: p),
                              ),
                            );
                          },
                        ),
                ),
        );
      },
    );
  }
}
