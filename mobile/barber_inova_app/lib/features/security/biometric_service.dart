import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:local_auth/local_auth.dart';

/// FASE 7 (Section 9 do plano de paridade): destrave local opcional de uma
/// sessão já autenticada. Biometria/PIN do aparelho aqui só decide se o app
/// mostra ou não a tela pra quem já tem uma sessão Supabase válida — nunca
/// substitui login, nunca lê nem grava senha (a senha da conta continua só
/// no backend, verificada via Supabase Auth; ver `MOB-06` em
/// `secure_local_storage.dart` pra como a sessão em si já é protegida).
/// A preferência liga/desliga fica no mesmo `flutter_secure_storage` já
/// usado pra sessão e pra outras preferências do app (`main_shell.dart`) —
/// sem mecanismo de storage novo.
class BiometricService {
  BiometricService._();

  static const _storage = FlutterSecureStorage();
  static const _prefKey = 'biometric_unlock_enabled';
  static final _localAuth = LocalAuthentication();

  /// Aparelho tem hardware biométrico (ou PIN/padrão) configurado e
  /// disponível pra uso — se `false`, a opção nem deve aparecer na tela de
  /// Segurança.
  static Future<bool> isSupported() async {
    try {
      final suportaBiometria = await _localAuth.canCheckBiometrics;
      final suportaDispositivo = await _localAuth.isDeviceSupported();
      return suportaBiometria || suportaDispositivo;
    } catch (_) {
      // Alguma plataforma sem o plugin configurado corretamente (ex.: web) —
      // trata como não suportado em vez de deixar a exceção subir.
      return false;
    }
  }

  static Future<bool> isEnabled() async {
    final valor = await _storage.read(key: _prefKey);
    return valor == '1';
  }

  /// Liga só depois de confirmar que a pessoa realmente consegue se
  /// autenticar neste aparelho (evita ativar e trancar quem não vai
  /// conseguir destravar depois). Desligar não exige desafio.
  static Future<bool> setEnabled(bool enabled) async {
    if (!enabled) {
      await _storage.write(key: _prefKey, value: '0');
      return true;
    }
    final confirmou = await authenticate(motivo: 'Confirme sua identidade para ativar o desbloqueio por biometria');
    if (confirmou) await _storage.write(key: _prefKey, value: '1');
    return confirmou;
  }

  static Future<bool> authenticate({String motivo = 'Desbloqueie para acessar o InovaFlow'}) async {
    try {
      return await _localAuth.authenticate(
        localizedReason: motivo,
        options: const AuthenticationOptions(
          // `biometricOnly: false` deixa cair pro PIN/padrão do aparelho
          // quando não há Face ID/Touch ID/impressão digital disponível ou
          // cadastrada — "autenticação local" pedida no escopo, não só
          // biometria pura.
          biometricOnly: false,
          stickyAuth: true,
        ),
      );
    } catch (_) {
      // Qualquer erro da plataforma (hardware ocupado, cancelado pelo SO
      // etc.) trata como falha de autenticação — nunca libera o app por
      // exceção.
      return false;
    }
  }
}
