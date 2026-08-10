import 'package:flutter/material.dart';

/// Identidade visual por tipo de negócio (ver `companies.business_type`):
/// Barbearia = preto/branco/azul; Studio/Estética = roxo claro/cinza/branco.
/// `MainShell` escolhe qual usar depois de carregar a empresa do usuário —
/// antes disso (tela de login), o app usa um tema neutro (ver `main.dart`).
ThemeData themeForBusinessType(String businessType) {
  return businessType == 'estudio_estetica' ? _estudioEsteticaTheme() : _barbeariaTheme();
}

ThemeData _barbeariaTheme() {
  const preto = Color(0xFF0A0A0A);
  const branco = Color(0xFFFFFFFF);
  const azul = Color(0xFF2563EB);

  const colorScheme = ColorScheme.light(
    primary: azul,
    onPrimary: branco,
    secondary: preto,
    onSecondary: branco,
    surface: branco,
    onSurface: preto,
    error: Color(0xFFDC2626),
    onError: branco,
  );

  return ThemeData(
    useMaterial3: true,
    colorScheme: colorScheme,
    scaffoldBackgroundColor: branco,
    appBarTheme: const AppBarTheme(backgroundColor: preto, foregroundColor: branco, elevation: 0),
    navigationBarTheme: NavigationBarThemeData(
      backgroundColor: preto,
      indicatorColor: azul.withValues(alpha: 0.25),
      iconTheme: WidgetStateProperty.resolveWith(
        (states) => IconThemeData(color: states.contains(WidgetState.selected) ? azul : branco.withValues(alpha: 0.7)),
      ),
      labelTextStyle: WidgetStateProperty.resolveWith(
        (states) => TextStyle(fontSize: 11, color: states.contains(WidgetState.selected) ? azul : branco.withValues(alpha: 0.7)),
      ),
    ),
    filledButtonTheme: FilledButtonThemeData(style: FilledButton.styleFrom(backgroundColor: azul, foregroundColor: branco)),
  );
}

ThemeData _estudioEsteticaTheme() {
  const roxoClaro = Color(0xFFC4B5FD);
  const cinza = Color(0xFF71717A);
  const branco = Color(0xFFFFFFFF);
  const textoEscuro = Color(0xFF27272A);

  const colorScheme = ColorScheme.light(
    primary: roxoClaro,
    onPrimary: textoEscuro,
    secondary: cinza,
    onSecondary: branco,
    surface: branco,
    onSurface: textoEscuro,
    error: Color(0xFFDC2626),
    onError: branco,
  );

  return ThemeData(
    useMaterial3: true,
    colorScheme: colorScheme,
    scaffoldBackgroundColor: branco,
    appBarTheme: const AppBarTheme(backgroundColor: roxoClaro, foregroundColor: textoEscuro, elevation: 0),
    navigationBarTheme: NavigationBarThemeData(
      backgroundColor: branco,
      indicatorColor: roxoClaro.withValues(alpha: 0.5),
      iconTheme: WidgetStateProperty.resolveWith(
        (states) => IconThemeData(color: states.contains(WidgetState.selected) ? textoEscuro : cinza),
      ),
      labelTextStyle: WidgetStateProperty.resolveWith(
        (states) => TextStyle(fontSize: 11, color: states.contains(WidgetState.selected) ? textoEscuro : cinza),
      ),
    ),
    filledButtonTheme: FilledButtonThemeData(style: FilledButton.styleFrom(backgroundColor: roxoClaro, foregroundColor: textoEscuro)),
  );
}
