import 'package:flutter/material.dart';

/// Chave global do ScaffoldMessenger — permite mostrar um SnackBar (ex.:
/// notificação chegando com o app aberto, em `push_service.dart`) de
/// qualquer lugar da árvore de widgets, sem precisar de um BuildContext
/// dentro de uma tela específica.
final scaffoldMessengerKey = GlobalKey<ScaffoldMessengerState>();
