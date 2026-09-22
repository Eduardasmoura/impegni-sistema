/// Regra de escolha da ficha de anamnese (espelha o servidor,
/// `private.resolve_anamnesis_form`, e o web-professional):
/// escolha manual > ficha vinculada ao serviço > única ficha ativa.
/// Com várias fichas e nada que defina qual, devolve `null` — a UI exige
/// seleção, nunca escolhe ao acaso. O servidor valida de novo (ficha de
/// outra empresa é recusada), isto aqui é só a decisão de tela.
Map<String, dynamic>? resolveAnamnesisForm({
  required String companyId,
  required List<Map<String, dynamic>> forms,
  String? manualFormId,
  String? serviceFormId,
}) {
  // só fichas ATIVAS desta empresa entram na conta
  final validas = forms.where((f) => f['company_id'] == companyId && f['active'] == true).toList();

  Map<String, dynamic>? porId(String? id) {
    if (id == null) return null;
    for (final f in validas) {
      if (f['id'] == id) return f;
    }
    return null;
  }

  return porId(manualFormId) ?? porId(serviceFormId) ?? (validas.length == 1 ? validas.first : null);
}

/// Nome mostrado pra ficha: segmento (Cílios, Unhas...) ou o título.
String anamnesisFormLabel(Map<String, dynamic> form) {
  final seg = form['segments'];
  if (seg is Map && (seg['name'] as String?)?.isNotEmpty == true) return seg['name'] as String;
  return (form['title'] as String?) ?? 'Anamnese';
}

/// Texto do histórico: rótulo/tipo congelados no envio; cai pro campo atual
/// só em respostas antigas sem snapshot.
({String label, String tipo})? anamnesisAnswerLabel(Map<String, dynamic> answer, List<Map<String, dynamic>> camposAtuais) {
  final snapLabel = answer['field_label_snapshot'] as String?;
  final snapTipo = answer['field_type_snapshot'] as String?;
  if (snapLabel != null) return (label: snapLabel, tipo: snapTipo ?? 'text');
  for (final c in camposAtuais) {
    if (c['id'] == answer['field_id']) return (label: c['label'] as String, tipo: c['field_type'] as String);
  }
  return null;
}
