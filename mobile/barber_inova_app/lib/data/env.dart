/// Config do Supabase — mesma anon key pública usada pelos apps web (não é
/// segredo, é protegida pelo RLS do banco). Pode ser sobrescrita em build:
/// `flutter run --dart-define=SUPABASE_URL=... --dart-define=SUPABASE_ANON_KEY=...`
class Env {
  static const supabaseUrl = String.fromEnvironment(
    'SUPABASE_URL',
    defaultValue: 'https://lcdzrahvhilxvkklulaa.supabase.co',
  );

  static const supabaseAnonKey = String.fromEnvironment(
    'SUPABASE_ANON_KEY',
    defaultValue:
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxjZHpyYWh2aGlseHZra2x1bGFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYxNTUzMjQsImV4cCI6MjEwMTczMTMyNH0.zIFOny5z29Qi43UDaSoIllTRA5V22E2rIXKFCD0_Yd4',
  );
}
