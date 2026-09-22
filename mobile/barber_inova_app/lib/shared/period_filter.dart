/// FASE 7 — mesma semântica de período do Web
/// (`apps/web-professional/.../dashboard/filters.ts`), portada pra Dart e
/// compartilhada entre Dashboard e Financeiro (os dois telas mobile que
/// precisam do mesmo conjunto de períodos). Não dá pra compartilhar código
/// entre Dart/TypeScript, mas a regra de cada período é a mesma: os 4
/// originais (hoje/semana/mês/ano) continuam "janela rolante até agora";
/// os novos (ontem/semana passada/mês passado/ano passado/personalizado)
/// usam limites fechados de calendário — não faz sentido janela rolante
/// pra algo que já passou.
library;

enum Periodo { hoje, ontem, semana, semanaPassada, mes, mesPassado, ano, anoPassado, personalizado }

const periodosLabel = {
  Periodo.hoje: 'Hoje',
  Periodo.ontem: 'Ontem',
  Periodo.semana: 'Semana',
  Periodo.semanaPassada: 'Semana passada',
  Periodo.mes: 'Mês',
  Periodo.mesPassado: 'Mês passado',
  Periodo.ano: 'Ano',
  Periodo.anoPassado: 'Ano passado',
  Periodo.personalizado: 'Personalizado',
};

/// As 4 opções principais, mostradas como chips diretos; o resto fica atrás
/// de "Mais filtros" (mesma divisão do Web entre `PERIODOS_PRINCIPAIS` e o
/// resto de `PERIODOS_TODOS`).
const periodosPrincipais = [Periodo.hoje, Periodo.semana, Periodo.mes, Periodo.ano];
const periodosSecundarios = [Periodo.ontem, Periodo.semanaPassada, Periodo.mesPassado, Periodo.anoPassado, Periodo.personalizado];

DateTime _inicioDoDia(DateTime d) => DateTime(d.year, d.month, d.day);
DateTime _fimDoDia(DateTime d) => DateTime(d.year, d.month, d.day, 23, 59, 59, 999);
DateTime _inicioDaSemana(DateTime d) => _inicioDoDia(d.subtract(Duration(days: d.weekday % 7))); // domingo = início
DateTime _fimDaSemana(DateTime d) => _fimDoDia(_inicioDaSemana(d).add(const Duration(days: 6)));
DateTime _inicioDoMes(DateTime d) => DateTime(d.year, d.month, 1);
DateTime _fimDoMes(DateTime d) => _fimDoDia(DateTime(d.year, d.month + 1, 0));
DateTime _inicioDoAno(DateTime d) => DateTime(d.year, 1, 1);
DateTime _fimDoAno(DateTime d) => _fimDoDia(DateTime(d.year, 12, 31));
DateTime _subMeses(DateTime d, int n) => DateTime(d.year, d.month - n, d.day, d.hour, d.minute, d.second);
DateTime _subAnos(DateTime d, int n) => DateTime(d.year - n, d.month, d.day, d.hour, d.minute, d.second);

/// Resolve o período escolhido num intervalo fechado [start, end] de verdade
/// — usado tanto pra filtrar localmente quanto pra escopar a query no
/// servidor (`.gte/.lte`), nunca busca "os últimos N registros" e filtra
/// depois (isso é o bug corrigido nesta fase — ver relatório).
({DateTime start, DateTime end}) resolvePeriodRange(
  Periodo periodo, {
  DateTime? customStart,
  DateTime? customEnd,
  DateTime? agora,
}) {
  final now = agora ?? DateTime.now();
  switch (periodo) {
    case Periodo.hoje:
      return (start: _inicioDoDia(now), end: now);
    case Periodo.ontem:
      final ontem = now.subtract(const Duration(days: 1));
      return (start: _inicioDoDia(ontem), end: _fimDoDia(ontem));
    case Periodo.semana:
      return (start: now.subtract(const Duration(days: 7)), end: now);
    case Periodo.semanaPassada:
      final semanaPassadaRef = now.subtract(const Duration(days: 7));
      final inicio = _inicioDaSemana(semanaPassadaRef);
      return (start: inicio, end: _fimDaSemana(inicio));
    case Periodo.mes:
      return (start: _subMeses(now, 1), end: now);
    case Periodo.mesPassado:
      final mesPassado = _subMeses(now, 1);
      return (start: _inicioDoMes(mesPassado), end: _fimDoMes(mesPassado));
    case Periodo.ano:
      return (start: _subAnos(now, 1), end: now);
    case Periodo.anoPassado:
      final anoPassado = _subAnos(now, 1);
      return (start: _inicioDoAno(anoPassado), end: _fimDoAno(anoPassado));
    case Periodo.personalizado:
      return (start: _inicioDoDia(customStart ?? now), end: _fimDoDia(customEnd ?? now));
  }
}

/// Dias inteiros cobertos pelo intervalo — usado tanto pro cálculo
/// proporcional de ocupação em período personalizado quanto pra estimar
/// `p_days`/`p_period_days` nas RPCs de segmentação de clientes (que
/// esperam "há quantos dias", não um intervalo [start, end]).
int diasNoIntervalo(({DateTime start, DateTime end}) intervalo) {
  return intervalo.end.difference(intervalo.start).inDays + 1;
}
