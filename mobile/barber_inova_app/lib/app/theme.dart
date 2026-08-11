import 'package:flutter/material.dart';

/// Identidade visual por segmento (ver `segments.theme_key`, escolhido pelo
/// Super Admin ou pelo próprio profissional ao cadastrar a empresa):
/// dark_blue = preto/branco/azul; soft_purple = roxo claro/cinza/branco. Um
/// segmento novo (ex.: "Manicure") escolhe uma dessas duas paletas — uma
/// terceira paleta só entraria aqui quando fizer sentido de verdade.
/// `MainShell` escolhe qual usar depois de carregar a empresa do usuário —
/// antes disso (tela de login), o app usa um tema neutro (ver `main.dart`).
ThemeData themeForSegment(String themeKey) {
  return themeKey == 'soft_purple' ? _estudioEsteticaTheme() : _barbeariaTheme();
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
