import 'package:supabase_flutter/supabase_flutter.dart';

/// Client único do Supabase, inicializado em `main.dart` (`Supabase.initialize`)
/// e reaproveitado por toda a app — mesmo contrato de dados (tabelas + RLS)
/// que os apps Next.js, só que consumido via `supabase_flutter`.
SupabaseClient get supabase => Supabase.instance.client;
