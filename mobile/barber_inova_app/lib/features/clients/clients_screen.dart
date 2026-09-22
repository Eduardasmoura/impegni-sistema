import 'dart:async';
import 'package:flutter/material.dart';
import '../../app/app_drawer.dart';
import '../../data/company_service.dart';
import '../../data/supabase_client.dart';
import 'anamnese_ficha_sheet.dart';
import 'client_form_sheet.dart';
import 'cliente_detalhe_screen.dart';

/// Lista de clientes com busca — mesma funcionalidade de
/// `apps/web-professional/.../clientes/clientes-view.tsx`, adaptada pro
/// padrão mobile (busca embutida no topo, cadastro/edição em bottom sheet
/// em vez de dialog).
///
/// FASE 7 (performance): antes buscava TODOS os clientes da empresa numa
/// query só — empresa grande carregava lento e cliente novo/salão com anos
/// de histórico só piorava. Agora pagina com `.range()` (30 por vez,
/// carrega mais ao chegar perto do fim da lista) e a busca também virou
/// server-side (`.ilike`), senão paginar e filtrar em memória ao mesmo
/// tempo teria feito busca só "achar" resultados já carregados.
class ClientsScreen extends StatefulWidget {
  final CurrentCompany company;

  const ClientsScreen({super.key, required this.company});

  @override
  State<ClientsScreen> createState() => _ClientsScreenState();
}

const _pageSize = 30;

class _ClientsScreenState extends State<ClientsScreen> {
  bool _loading = true;
  bool _loadingMore = false;
  bool _hasMore = true;
  List<Map<String, dynamic>> _clients = [];
  String _busca = '';
  Timer? _debounce;
  final _scrollController = ScrollController();

  @override
  void initState() {
    super.initState();
    _load(reset: true);
    _scrollController.addListener(_onScroll);
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _scrollController.removeListener(_onScroll);
    _scrollController.dispose();
    super.dispose();
  }

  void _onScroll() {
    if (!_hasMore || _loading || _loadingMore) return;
    if (_scrollController.position.pixels >= _scrollController.position.maxScrollExtent - 200) {
      _load(reset: false);
    }
  }

  Future<void> _load({required bool reset}) async {
    if (reset) {
      setState(() {
        _loading = true;
        _clients = [];
        _hasMore = true;
      });
    } else {
      setState(() => _loadingMore = true);
    }

    var query = supabase.from('clients').select('id, name, phone, email, notes, user_id').eq('company_id', widget.company.id);
    final termo = _busca.trim();
    if (termo.isNotEmpty) {
      // `.or()` do PostgREST usa vírgula como separador de condição — tira
      // vírgula/parênteses do termo digitado pra não quebrar a sintaxe do
      // filtro (nome/telefone de cliente não costuma ter esses caracteres).
      final termoSeguro = termo.replaceAll(RegExp(r'[,()]'), '');
      query = query.or('name.ilike.%$termoSeguro%,phone.ilike.%$termoSeguro%');
    }

    final offset = reset ? 0 : _clients.length;
    final rows = await query.order('name', ascending: true).range(offset, offset + _pageSize - 1);
    if (!mounted) return;
    final lista = List<Map<String, dynamic>>.from(rows);
    setState(() {
      _clients = reset ? lista : [..._clients, ...lista];
      _hasMore = lista.length == _pageSize;
      _loading = false;
      _loadingMore = false;
    });
  }

  void _onBuscaChange(String v) {
    setState(() => _busca = v);
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 400), () => _load(reset: true));
  }

  Future<void> _abrirFormulario({Map<String, dynamic>? cliente}) async {
    final salvou = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      builder: (context) => ClientFormSheet(companyId: widget.company.id, cliente: cliente),
    );
    if (salvou == true) _load(reset: true);
  }

  Future<void> _abrirDetalhe(Map<String, dynamic> cliente) async {
    final mudou = await Navigator.of(context).push<bool>(
      MaterialPageRoute(builder: (_) => ClienteDetalheScreen(companyId: widget.company.id, cliente: cliente)),
    );
    if (mudou == true) _load(reset: true);
  }

  void _abrirAnamnese(Map<String, dynamic> cliente) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (context) => AnamneseFichaSheet(companyId: widget.company.id, clientId: cliente['id'] as String, clientName: cliente['name'] as String),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      drawer: const AppDrawer(),
      appBar: AppBar(
        title: const Text('Clientes'),
        // "Segmentação" saiu daqui — agora é item do menu lateral (mesma
        // rota do Web, `/clientes/segmentos`), não duplica mais a entrada.
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(56),
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
            child: TextField(
              onChanged: _onBuscaChange,
              style: const TextStyle(color: Colors.white),
              decoration: InputDecoration(
                hintText: 'Buscar por nome ou telefone',
                hintStyle: const TextStyle(color: Colors.white70),
                prefixIcon: const Icon(Icons.search, color: Colors.white70),
                filled: true,
                fillColor: Colors.white.withValues(alpha: 0.12),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide.none),
                contentPadding: const EdgeInsets.symmetric(vertical: 0),
                isDense: true,
              ),
            ),
          ),
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _abrirFormulario(),
        icon: const Icon(Icons.add),
        label: const Text('Novo'),
      ),
      // FASE 7: SafeArea (só embaixo — AppBar já cobre o topo) pra o
      // último card da lista não ficar colado no home indicator.
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : SafeArea(
              top: false,
              child: RefreshIndicator(
                onRefresh: () => _load(reset: true),
                child: _clients.isEmpty
                  ? ListView(
                      children: [
                        const SizedBox(height: 120),
                        Center(
                          child: Text(
                            _busca.trim().isEmpty ? 'Nenhum cliente cadastrado.' : 'Nenhum cliente encontrado.',
                            style: const TextStyle(color: Colors.grey),
                          ),
                        ),
                      ],
                    )
                  : ListView.separated(
                      controller: _scrollController,
                      padding: const EdgeInsets.all(12),
                      itemCount: _clients.length + (_hasMore ? 1 : 0),
                      separatorBuilder: (_, __) => const SizedBox(height: 8),
                      itemBuilder: (context, index) {
                        if (index >= _clients.length) {
                          return const Padding(
                            padding: EdgeInsets.symmetric(vertical: 16),
                            child: Center(child: SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2))),
                          );
                        }
                        final c = _clients[index];
                        final nome = c['name'] as String? ?? '';
                        final temContaPropria = c['user_id'] != null;
                        return Card(
                          child: ListTile(
                            leading: CircleAvatar(child: Text(nome.isNotEmpty ? nome[0].toUpperCase() : '?')),
                            title: Row(
                              children: [
                                Flexible(child: Text(nome, overflow: TextOverflow.ellipsis)),
                                if (temContaPropria) const Padding(padding: EdgeInsets.only(left: 4), child: Icon(Icons.verified_user, size: 13)),
                              ],
                            ),
                            subtitle: Text((c['phone'] as String?)?.isNotEmpty == true ? c['phone'] as String : 'Sem telefone'),
                            trailing: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                if (widget.company.anamnesisEnabled)
                                  IconButton(
                                    icon: const Icon(Icons.assignment_outlined, size: 20),
                                    tooltip: 'Anamnese',
                                    onPressed: () => _abrirAnamnese(c),
                                  ),
                                const Icon(Icons.chevron_right, size: 20),
                              ],
                            ),
                            onTap: () => _abrirDetalhe(c),
                          ),
                        );
                      },
                    ),
            ),
          ),
    );
  }
}
