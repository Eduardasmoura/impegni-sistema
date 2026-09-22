import 'dart:async';

import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'app/messenger.dart';
import 'app/router.dart';
import 'data/env.dart';
import 'data/secure_local_storage.dart';
import 'features/notifications/push_service.dart';

Future<void> main() async {
  // Sem isso, uma exceção não tratada num Future solto (fora do build de um
  // widget — ex.: dentro de um callback assíncrono) derrubava o app em
  // release sem deixar rastro nenhum. Não é um serviço de crash reporting
  // (isso fica pra quando o time decidir qual usar — Sentry/Crashlytics),
  // só a rede de segurança básica: loga em vez de crashar silenciosamente.
  runZonedGuarded(
    () async {
      WidgetsFlutterBinding.ensureInitialized();

      FlutterError.onError = (details) {
        FlutterError.presentError(details);
        debugPrint('FlutterError: ${details.exceptionAsString()}');
      };

      // FASE 7 (achado do teste ao vivo, não uma regressão desta fase): sem
      // isso, todo `DateFormat(padrão, 'pt_BR')` usado no app (Agenda,
      // Dashboard, Financeiro, Repasse, Meu plano, Pagamentos, Histórico do
      // cliente) lançava `LocaleDataException` em tempo de execução — a tela
      // inteira ficava em branco/cinza. `flutter analyze` nunca detectava
      // isso (é só um erro de runtime), só apareceu testando o app de
      // verdade.
      await initializeDateFormatting('pt_BR', null);

      await Supabase.initialize(
        url: Env.supabaseUrl,
        publishableKey: Env.supabaseAnonKey,
        // MOB-06: sessão (refresh token incluso) persistida no Keychain/Keystore
        // via flutter_secure_storage, em vez de SharedPreferences (texto plano).
        authOptions: FlutterAuthClientOptions(localStorage: SecureLocalStorage()),
      );

      try {
        // Requer `firebase_options.dart`, gerado por `flutterfire configure`
        // (ver mobile/barber_inova_app/README.md) — sem isso, o app roda normal,
        // só sem push notifications.
        await Firebase.initializeApp();
        FirebaseMessaging.onBackgroundMessage(firebaseMessagingBackgroundHandler);
      } catch (_) {
        // Firebase ainda não configurado neste ambiente — segue sem push.
      }

      runApp(const ProviderScope(child: InovaFlowApp()));
    },
    (error, stack) {
      debugPrint('Uncaught error: $error\n$stack');
    },
  );
}

class InovaFlowApp extends StatelessWidget {
  const InovaFlowApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      title: 'InovaFlow',
      debugShowCheckedModeBanner: false,
      scaffoldMessengerKey: scaffoldMessengerKey,
      // Tema neutro só até a empresa carregar (tela de login) — o tema de
      // verdade (por tipo de negócio) é aplicado dentro do MainShell.
      theme: ThemeData(
        useMaterial3: true,
        colorSchemeSeed: const Color(0xFFB45309),
      ),
      routerConfig: router,
    );
  }
}
