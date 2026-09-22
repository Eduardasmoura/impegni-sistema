import 'package:flutter_test/flutter_test.dart';
import 'package:barber_inova_app/features/clients/anamnesis_form_resolver.dart';

Map<String, dynamic> form(String id, {String company = 'A', bool active = true, String? segmento}) => {
      'id': id,
      'company_id': company,
      'active': active,
      'title': 'Anamnese',
      'segments': segmento == null ? null : {'name': segmento},
    };

void main() {
  group('resolveAnamnesisForm', () {
    test('uma única ficha ativa é usada automaticamente', () {
      final r = resolveAnamnesisForm(companyId: 'A', forms: [form('1')]);
      expect(r?['id'], '1');
    });

    test('várias fichas e nenhuma definida -> null (exige seleção, nunca aleatório)', () {
      final r = resolveAnamnesisForm(companyId: 'A', forms: [form('1'), form('2')]);
      expect(r, isNull);
    });

    test('ficha vinculada ao serviço é escolhida automaticamente', () {
      final r = resolveAnamnesisForm(companyId: 'A', forms: [form('1'), form('2')], serviceFormId: '2');
      expect(r?['id'], '2');
    });

    test('escolha manual vence o vínculo do serviço', () {
      final r = resolveAnamnesisForm(companyId: 'A', forms: [form('1'), form('2')], serviceFormId: '2', manualFormId: '1');
      expect(r?['id'], '1');
    });

    test('ficha de OUTRA empresa é ignorada (manual e via serviço)', () {
      final forms = [form('1'), form('x', company: 'B')];
      expect(resolveAnamnesisForm(companyId: 'A', forms: forms, manualFormId: 'x')?['id'], '1');
      expect(resolveAnamnesisForm(companyId: 'A', forms: [form('x', company: 'B')], serviceFormId: 'x'), isNull);
    });

    test('ficha vinculada inativa cai na regra geral', () {
      final forms = [form('1', active: false), form('2')];
      expect(resolveAnamnesisForm(companyId: 'A', forms: forms, serviceFormId: '1')?['id'], '2');
      final duas = [form('1', active: false), form('2'), form('3')];
      expect(resolveAnamnesisForm(companyId: 'A', forms: duas, serviceFormId: '1'), isNull);
    });

    test('sem fichas -> null', () {
      expect(resolveAnamnesisForm(companyId: 'A', forms: []), isNull);
    });
  });

  group('anamnesisFormLabel', () {
    test('usa o nome do segmento, senão o título', () {
      expect(anamnesisFormLabel(form('1', segmento: 'Cílios')), 'Cílios');
      expect(anamnesisFormLabel(form('2')), 'Anamnese');
    });
  });

  group('anamnesisAnswerLabel (histórico congelado)', () {
    final campos = [
      {'id': 'f1', 'label': 'Rótulo NOVO', 'field_type': 'text'}
    ];
    test('usa o snapshot do envio, ignorando edição posterior do campo', () {
      final r = anamnesisAnswerLabel({'field_id': 'f1', 'field_label_snapshot': 'Rótulo antigo', 'field_type_snapshot': 'boolean'}, campos);
      expect(r?.label, 'Rótulo antigo');
      expect(r?.tipo, 'boolean');
    });
    test('sem snapshot (resposta antiga) cai pro campo atual', () {
      final r = anamnesisAnswerLabel({'field_id': 'f1'}, campos);
      expect(r?.label, 'Rótulo NOVO');
    });
    test('campo desconhecido e sem snapshot -> null', () {
      expect(anamnesisAnswerLabel({'field_id': 'zz'}, campos), isNull);
    });
  });
}
