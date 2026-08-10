import 'dart:io' show Platform;
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import '../../app/messenger.dart';
import '../../data/supabase_client.dart';

/// Handler de mensagens em background precisa ser uma função top-level (não
/// pode ser método de classe) — é assim que o Firebase exige em Flutter.
@pragma('vm:entry-point')
Future<void> firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  // Nenhum processamento especial aqui: o próprio SO já mostra a notificação
  // do FCM em background. Deixe hooks (ex: atualizar badge) se precisar.
}

/// Pede permissão, pega o token do device e salva em `device_tokens` — é
/// esse token que a Edge Function usa (ver plano de arquitetura) pra disparar
/// push quando um agendamento novo/cancelado acontece.
class PushService {
  static Future<void> init({String? companyId}) async {
    if (kIsWeb) return; // este app não roda como PWA por enquanto.

    final messaging = FirebaseMessaging.instance;
    await messaging.requestPermission(alert: true, badge: true, sound: true);

    final token = await messaging.getToken();
    final userId = supabase.auth.currentUser?.id;
    if (token != null && userId != null) {
      await supabase.from('device_tokens').upsert(
        {
          'user_id': userId,
          'company_id': companyId,
          'fcm_token': token,
          'platform': Platform.isIOS ? 'ios' : 'android',
        },
        onConflict: 'user_id,fcm_token',
      );
    }

    messaging.onTokenRefresh.listen((newToken) async {
      final uid = supabase.auth.currentUser?.id;
      if (uid == null) return;
      await supabase.from('device_tokens').upsert(
        {
          'user_id': uid,
          'company_id': companyId,
          'fcm_token': newToken,
          'platform': Platform.isIOS ? 'ios' : 'android',
        },
        onConflict: 'user_id,fcm_token',
      );
    });

    // Com o app aberto o SO não mostra a notificação sozinho — sem isso, o
    // profissional não percebia nada chegando (só registrávamos o token).
    FirebaseMessaging.onMessage.listen((message) {
      final title = message.notification?.title;
      final body = message.notification?.body;
      if (title == null && body == null) return;
      scaffoldMessengerKey.currentState?.showSnackBar(
        SnackBar(
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (title != null) Text(title, style: const TextStyle(fontWeight: FontWeight.bold)),
              if (body != null) Text(body),
            ],
          ),
          behavior: SnackBarBehavior.floating,
        ),
      );
    });
  }
}
