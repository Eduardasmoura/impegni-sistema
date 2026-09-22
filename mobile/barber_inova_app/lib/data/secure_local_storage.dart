import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

/// MOB-06 (auditoria de segurança): por padrão o `supabase_flutter` persiste
/// a sessão (incluindo o refresh token) via `SharedPreferences`, que no
/// Android é um XML em texto plano dentro do sandbox do app e no iOS um
/// plist também não criptografado — legível em caso de root/jailbreak.
/// Esta implementação troca o armazenamento pelo Keychain (iOS) / Keystore
/// (Android) via `flutter_secure_storage`, sem mudar nenhum comportamento
/// visível do login/logout.
class SecureLocalStorage extends LocalStorage {
  SecureLocalStorage({FlutterSecureStorage? storage})
    : _storage = storage ?? const FlutterSecureStorage();

  final FlutterSecureStorage _storage;
  static const _key = 'sb-inovaflow-auth-token';

  @override
  Future<void> initialize() async {}

  @override
  Future<bool> hasAccessToken() async => (await _storage.read(key: _key)) != null;

  @override
  Future<String?> accessToken() => _storage.read(key: _key);

  @override
  Future<void> removePersistedSession() => _storage.delete(key: _key);

  @override
  Future<void> persistSession(String persistSessionString) =>
      _storage.write(key: _key, value: persistSessionString);
}
