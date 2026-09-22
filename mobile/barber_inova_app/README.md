# InovaFlow — App do Profissional (Flutter)

App mobile do **Profissional** (Android/iOS): agenda do dia, cadastro rápido de
cliente/agendamento, resumo financeiro simplificado, estoque e perfil. Mesma
conta (Supabase Auth) usada no painel web `apps/web-professional`.

> ⚠️ Este código foi escrito sem o Flutter SDK instalado na máquina que gerou
> o projeto — `flutter create`, `pub get` e `flutter run` **nunca rodaram**
> aqui. Antes de tudo, siga os passos abaixo na sua máquina com Flutter
> instalado.

## 1. Gerar as pastas nativas

Este diretório só tem `lib/`, `pubspec.yaml` e `analysis_options.yaml` — as
pastas `android/` e `ios/` (Gradle, `Info.plist`, ícones etc.) não existem
ainda. Gere-as sem sobrescrever o que já está aqui:

```bash
cd mobile/barber_inova_app
flutter create . --org com.barberinova --project-name barber_inova_app
flutter pub get
```

## 2. Configurar o Firebase (push notifications)

```bash
dart pub global activate flutterfire_cli
flutterfire configure
```

Isso gera `lib/firebase_options.dart` (não versionado por padrão — adicione ao
`.gitignore` se preferir não commitar). Sem esse passo o app funciona
normalmente, só sem push (o erro é capturado silenciosamente em `main.dart`).

## 3. Rodar

```bash
flutter run
```

O app já aponta para o projeto Supabase real (`lib/data/env.dart`, mesma
`anon key` pública dos apps web). Para apontar pra outro projeto:

```bash
flutter run --dart-define=SUPABASE_URL=https://xxx.supabase.co --dart-define=SUPABASE_ANON_KEY=xxx
```

## Estrutura

```
lib/
├── main.dart                    # init Supabase + Firebase, MaterialApp.router
├── app/
│   ├── router.dart               # go_router: /login vs. app autenticado
│   ├── main_shell.dart           # abas: Agenda / Financeiro / Estoque / Perfil
│   ├── session.dart               # providers Riverpod de sessão (auth state)
│   └── go_router_refresh_stream.dart
├── data/
│   ├── env.dart                   # URL/anon key do Supabase
│   ├── supabase_client.dart       # client único
│   └── company_service.dart       # resolve a empresa do profissional logado
└── features/
    ├── auth/login_screen.dart
    ├── company/no_company_screen.dart   # quando o usuário ainda não tem empresa
    ├── agenda/                          # fila do dia + novo agendamento
    ├── finance/finance_summary_screen.dart
    ├── inventory/inventory_screen.dart
    ├── notifications/push_service.dart  # registra device_tokens (FCM)
    └── profile/profile_screen.dart
```

## O que falta (próximos passos)

- Onboarding de empresa (criar a empresa) só existe no painel web por
  enquanto — o app mostra `NoCompanyScreen` orientando a completar por lá.
- Edge Function que efetivamente **envia** o push quando um agendamento é
  criado/cancelado (este app só se _inscreve_ salvando o token em
  `device_tokens`; o envio fica do lado do backend).
- Deep link da notificação pra abrir o agendamento específico.
