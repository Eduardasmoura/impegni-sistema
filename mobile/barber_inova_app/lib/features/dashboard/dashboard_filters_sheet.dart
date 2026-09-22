import 'package:flutter/material.dart';
import '../../shared/period_filter.dart';

const _statusLabel = {
  'scheduled': 'Agendado',
  'in_progress': 'Em andamento',
  'completed': 'Finalizado',
  'canceled': 'Cancelado',
  'no_show': 'Não compareceu',
};
const _metodoLabel = {'pix': 'Pix', 'card': 'Cartão', 'cash': 'Dinheiro', 'package': 'Pacote', 'online': 'Pagamento online'};

class DashboardFilters {
  Periodo periodo;
  DateTime? customStart;
  DateTime? customEnd;
  List<String> professionalIds;
  List<String> serviceIds;
  List<String> status;
  List<String> paymentMethods;
  String? clientId;

  DashboardFilters({
    this.periodo = Periodo.hoje,
    this.customStart,
    this.customEnd,
    List<String>? professionalIds,
    List<String>? serviceIds,
    List<String>? status,
    List<String>? paymentMethods,
    this.clientId,
  })  : professionalIds = professionalIds ?? [],
        serviceIds = serviceIds ?? [],
        status = status ?? [],
        paymentMethods = paymentMethods ?? [];

  DashboardFilters copy() => DashboardFilters(
        periodo: periodo,
        customStart: customStart,
        customEnd: customEnd,
        professionalIds: [...professionalIds],
        serviceIds: [...serviceIds],
        status: [...status],
        paymentMethods: [...paymentMethods],
        clientId: clientId,
      );

  int get avancadosAtivos {
    var n = 0;
    if (professionalIds.isNotEmpty) n++;
    if (serviceIds.isNotEmpty) n++;
    if (status.isNotEmpty) n++;
    if (paymentMethods.isNotEmpty) n++;
    if (clientId != null) n++;
    return n;
  }
}

/// Bottom sheet com os filtros avançados do Dashboard (Section 2 — "não
/// simplesmente copiar a interface desktop": no Web isso é um Dialog com
/// tudo visível de uma vez; aqui é um bottom sheet rolável, do jeito que já
/// é convenção no resto do app pra formulários — ver `client_form_sheet.dart`
/// etc.).
Future<DashboardFilters?> showDashboardFiltersSheet(
  BuildContext context, {
  required DashboardFilters atuais,
  required List<Map<String, dynamic>> professionals,
  required List<Map<String, dynamic>> services,
  required List<Map<String, dynamic>> clients,
}) {
  final rascunho = atuais.copy();
  return showModalBottomSheet<DashboardFilters>(
    context: context,
    isScrollControlled: true,
    builder: (context) {
      return Padding(
        padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
        child: DraggableScrollableSheet(
          initialChildSize: 0.85,
          maxChildSize: 0.95,
          expand: false,
          builder: (context, scrollController) {
            return StatefulBuilder(
              builder: (context, setSheetState) {
                return Column(
                  children: [
                    Padding(
                      padding: const EdgeInsets.fromLTRB(16, 16, 8, 8),
                      child: Row(
                        children: [
                          Text('Filtros', style: Theme.of(context).textTheme.titleMedium),
                          const Spacer(),
                          TextButton(
                            onPressed: () => setSheetState(() {
                              rascunho.professionalIds = [];
                              rascunho.serviceIds = [];
                              rascunho.status = [];
                              rascunho.paymentMethods = [];
                              rascunho.clientId = null;
                            }),
                            child: const Text('Limpar'),
                          ),
                        ],
                      ),
                    ),
                    Expanded(
                      child: ListView(
                        controller: scrollController,
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                        children: [
                          if (professionals.length > 1) ...[
                            Text('Profissional', style: Theme.of(context).textTheme.labelLarge),
                            const SizedBox(height: 8),
                            Wrap(
                              spacing: 8,
                              runSpacing: 8,
                              children: professionals.map((p) {
                                final id = p['id'] as String;
                                final selected = rascunho.professionalIds.contains(id);
                                return FilterChip(
                                  label: Text(p['name'] as String),
                                  selected: selected,
                                  onSelected: (v) => setSheetState(() => v ? rascunho.professionalIds.add(id) : rascunho.professionalIds.remove(id)),
                                );
                              }).toList(),
                            ),
                            const SizedBox(height: 20),
                          ],
                          if (services.isNotEmpty) ...[
                            Text('Serviço', style: Theme.of(context).textTheme.labelLarge),
                            const SizedBox(height: 8),
                            Wrap(
                              spacing: 8,
                              runSpacing: 8,
                              children: services.map((s) {
                                final id = s['id'] as String;
                                final selected = rascunho.serviceIds.contains(id);
                                return FilterChip(
                                  label: Text(s['name'] as String),
                                  selected: selected,
                                  onSelected: (v) => setSheetState(() => v ? rascunho.serviceIds.add(id) : rascunho.serviceIds.remove(id)),
                                );
                              }).toList(),
                            ),
                            const SizedBox(height: 20),
                          ],
                          Text('Status', style: Theme.of(context).textTheme.labelLarge),
                          const SizedBox(height: 8),
                          Wrap(
                            spacing: 8,
                            runSpacing: 8,
                            children: _statusLabel.entries.map((e) {
                              final selected = rascunho.status.contains(e.key);
                              return FilterChip(
                                label: Text(e.value),
                                selected: selected,
                                onSelected: (v) => setSheetState(() => v ? rascunho.status.add(e.key) : rascunho.status.remove(e.key)),
                              );
                            }).toList(),
                          ),
                          const SizedBox(height: 20),
                          Text('Forma de pagamento', style: Theme.of(context).textTheme.labelLarge),
                          const SizedBox(height: 8),
                          Wrap(
                            spacing: 8,
                            runSpacing: 8,
                            children: _metodoLabel.entries.map((e) {
                              final selected = rascunho.paymentMethods.contains(e.key);
                              return FilterChip(
                                label: Text(e.value),
                                selected: selected,
                                onSelected: (v) => setSheetState(() => v ? rascunho.paymentMethods.add(e.key) : rascunho.paymentMethods.remove(e.key)),
                              );
                            }).toList(),
                          ),
                          const SizedBox(height: 20),
                          Text('Cliente', style: Theme.of(context).textTheme.labelLarge),
                          const SizedBox(height: 8),
                          DropdownButtonFormField<String?>(
                            initialValue: rascunho.clientId,
                            isExpanded: true,
                            hint: const Text('Todos os clientes'),
                            items: [
                              const DropdownMenuItem<String?>(value: null, child: Text('Todos os clientes')),
                              ...clients.map((c) => DropdownMenuItem<String?>(value: c['id'] as String, child: Text(c['name'] as String, overflow: TextOverflow.ellipsis))),
                            ],
                            onChanged: (v) => setSheetState(() => rascunho.clientId = v),
                          ),
                          const SizedBox(height: 24),
                        ],
                      ),
                    ),
                    Padding(
                      padding: const EdgeInsets.all(16),
                      child: SizedBox(
                        width: double.infinity,
                        child: FilledButton(
                          onPressed: () => Navigator.of(context).pop(rascunho),
                          child: const Text('Aplicar filtros'),
                        ),
                      ),
                    ),
                  ],
                );
              },
            );
          },
        ),
      );
    },
  );
}
