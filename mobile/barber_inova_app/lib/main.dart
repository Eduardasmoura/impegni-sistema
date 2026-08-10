import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'app/messenger.dart';
import 'app/router.dart';
import 'data/env.dart';
import 'features/notifications/push_service.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  await Supabase.initialize(url: Env.supabaseUrl, publishableKey: Env.supabaseAnonKey);

  try {
    // Requer `firebase_options.dart`, gerado por `flutterfire configure`
    // (ver mobile/barber_inova_app/README.md) — sem isso, o app roda normal,
    // só sem push notifications.
    await Firebase.initializeApp();
    FirebaseMessaging.onBackgroundMessage(firebaseMessagingBackgroundHandler);
  } catch (_) {
    // Firebase ainda não configurado neste ambiente — segue sem push.
  }

  runApp(const ProviderScope(child: BarberInovaApp()));
}

class BarberInovaApp extends StatelessWidget {
  const BarberInovaApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      title: 'Barber iNova',
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
