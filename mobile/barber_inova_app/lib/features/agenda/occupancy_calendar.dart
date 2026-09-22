import 'package:flutter/material.dart';

const _meses = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];
const _diasSemana = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

class DiaOcupacao {
  final int capacityMin;
  final int occupiedMin;
  final int appointmentCount;
  final double occupancyPct;

  DiaOcupacao({required this.capacityMin, required this.occupiedMin, required this.appointmentCount, required this.occupancyPct});
}

enum _Nivel { semExpediente, verde, amarelo, laranja, vermelho }

// Mesma classificação de `apps/web-professional/.../agenda/occupancy-calendar.tsx`:
// capacidade 0 (folga/férias/sem expediente) fica numa faixa neutra à
// parte; senão 0-40% verde, 41-70% amarelo, 71-90% laranja, >90% vermelho.
_Nivel _nivelOcupacao(double pct, int capacityMin) {
  if (capacityMin <= 0) return _Nivel.semExpediente;
  if (pct <= 40) return _Nivel.verde;
  if (pct <= 70) return _Nivel.amarelo;
  if (pct <= 90) return _Nivel.laranja;
  return _Nivel.vermelho;
}

const _corNivel = {
  _Nivel.semExpediente: Color(0x4D9E9E9E),
  _Nivel.verde: Color(0xFF10B981),
  _Nivel.amarelo: Color(0xFFFACC15),
  _Nivel.laranja: Color(0xFFF97316),
  _Nivel.vermelho: Color(0xFFEF4444),
};

String _toDateStr(int y, int m, int day) => '$y-${(m + 1).toString().padLeft(2, '0')}-${day.toString().padLeft(2, '0')}';

/// Calendário mensal de ocupação — equivalente mobile do
/// `OccupancyCalendar` do Web (mesma RPC `get_professional_occupancy_month`,
/// mesmas cores/níveis), redesenhado como grid compacto pra tela pequena em
/// vez de copiar o layout desktop.
class OccupancyCalendar extends StatelessWidget {
  final int year;
  final int month; // 0-indexado
  final void Function(int year, int month) onMonthChange;
  final Map<String, DiaOcupacao> occupancyByDay;
  final bool loading;
  final String? selectedDate;
  final void Function(String dateStr) onSelectDate;

  const OccupancyCalendar({
    super.key,
    required this.year,
    required this.month,
    required this.onMonthChange,
    required this.occupancyByDay,
    required this.selectedDate,
    required this.onSelectDate,
    this.loading = false,
  });

  @override
  Widget build(BuildContext context) {
    final hoje = DateTime.now();
    final hojeStr = _toDateStr(hoje.year, hoje.month - 1, hoje.day);
    final primeiroDiaSemana = DateTime(year, month + 1, 1).weekday % 7; // Dart: seg=1..dom=7 -> ajusta pra dom=0
    final diasNoMes = DateTime(year, month + 2, 0).day;
    final celulas = <int?>[...List.filled(primeiroDiaSemana, null), ...List.generate(diasNoMes, (i) => i + 1)];
    final primary = Theme.of(context).colorScheme.primary;

    return Opacity(
      opacity: loading ? 0.5 : 1,
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              IconButton(
                icon: const Icon(Icons.chevron_left),
                onPressed: () => onMonthChange(month == 0 ? year - 1 : year, month == 0 ? 11 : month - 1),
              ),
              Text('${_meses[month]} $year', style: Theme.of(context).textTheme.titleSmall),
              IconButton(
                icon: const Icon(Icons.chevron_right),
                onPressed: () => onMonthChange(month == 11 ? year + 1 : year, month == 11 ? 0 : month + 1),
              ),
            ],
          ),
          Row(children: _diasSemana.map((d) => Expanded(child: Center(child: Text(d, style: const TextStyle(fontSize: 11, color: Colors.grey))))).toList()),
          const SizedBox(height: 4),
          GridView.count(
            crossAxisCount: 7,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            mainAxisSpacing: 4,
            crossAxisSpacing: 4,
            children: celulas.map((dia) {
              if (dia == null) return const SizedBox.shrink();
              final dateStr = _toDateStr(year, month, dia);
              final passado = dateStr.compareTo(hojeStr) < 0;
              final info = occupancyByDay[dateStr];
              final nivel = info != null ? _nivelOcupacao(info.occupancyPct, info.capacityMin) : null;
              final selecionado = selectedDate == dateStr;
              final ehHoje = dateStr == hojeStr;

              return GestureDetector(
                onTap: () => onSelectDate(dateStr),
                child: Container(
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(
                      color: selecionado ? primary : (ehHoje ? primary.withValues(alpha: 0.4) : Colors.grey.withValues(alpha: 0.25)),
                      width: selecionado || ehHoje ? 1.4 : 1,
                    ),
                    color: selecionado ? primary.withValues(alpha: 0.1) : null,
                  ),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(
                        '$dia',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: selecionado ? FontWeight.bold : FontWeight.normal,
                          color: selecionado ? primary : (passado ? Colors.grey : null),
                        ),
                      ),
                      if (nivel != null) ...[
                        const SizedBox(height: 2),
                        Container(width: 14, height: 3, decoration: BoxDecoration(color: _corNivel[nivel], borderRadius: BorderRadius.circular(2))),
                      ],
                    ],
                  ),
                ),
              );
            }).toList(),
          ),
          const SizedBox(height: 10),
          const Wrap(
            spacing: 10,
            runSpacing: 4,
            children: [
              _Legenda(cor: Color(0xFF10B981), label: 'Baixa'),
              _Legenda(cor: Color(0xFFFACC15), label: 'Moderada'),
              _Legenda(cor: Color(0xFFF97316), label: 'Alta'),
              _Legenda(cor: Color(0xFFEF4444), label: 'Lotado'),
              _Legenda(cor: Color(0x4D9E9E9E), label: 'Sem expediente'),
            ],
          ),
        ],
      ),
    );
  }
}

class _Legenda extends StatelessWidget {
  final Color cor;
  final String label;

  const _Legenda({required this.cor, required this.label});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(width: 8, height: 8, decoration: BoxDecoration(color: cor, shape: BoxShape.circle)),
        const SizedBox(width: 4),
        Text(label, style: const TextStyle(fontSize: 10, color: Colors.grey)),
      ],
    );
  }
}
