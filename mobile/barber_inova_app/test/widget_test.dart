// Teste de exemplo do `flutter create` trocado por um smoke test mínimo.
//
// `InovaFlowApp` inicializa Supabase/Firebase/GoRouter em `main()` antes de
// montar a árvore de widgets, então testá-la de verdade aqui exigiria mocks
// desses serviços — isso fica para quando a suíte de testes crescer. Por
// enquanto, este teste só garante que o pipeline de testes roda.
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('sanity check', () {
    expect(1 + 1, 2);
  });
}
