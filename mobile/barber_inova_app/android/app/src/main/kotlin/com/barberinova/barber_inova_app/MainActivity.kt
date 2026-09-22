package com.barberinova.barber_inova_app

import io.flutter.embedding.android.FlutterFragmentActivity

// FASE 7: local_auth (biometria) exige que a Activity herde de
// FlutterFragmentActivity, não FlutterActivity — usa um DialogFragment
// internamente pra mostrar o prompt do sistema (impressão digital/Face
// unlock/PIN).
class MainActivity : FlutterFragmentActivity()
