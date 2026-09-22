import 'package:flutter/material.dart';
import '../features/security/biometric_service.dart';

/// Envolve o app autenticado (`MainShell`) e, só se a pessoa tiver ligado a
/// preferência em Segurança, esconde o conteúdo atrás de uma tela de
/// desbloqueio até a autenticação local (biometria/PIN do aparelho) passar.
/// `_desbloqueadoNesteProcesso` é `static` de propósito: precisa sobreviver
/// a rebuilds/trocas de aba (senão pediria biometria a cada navegação), mas
/// reseta sozinho quando o app é morto e reaberto (nova instância do
/// processo) — que é exatamente quando o gate deve valer de novo.
class BiometricGate extends StatefulWidget {
  final Widget child;

  const BiometricGate({super.key, required this.child});

  @override
  State<BiometricGate> createState() => _BiometricGateState();
}

class _BiometricGateState extends State<BiometricGate> with WidgetsBindingObserver {
  static bool _desbloqueadoNesteProcesso = false;

  bool _carregando = true;
  bool _precisaDesbloquear = false;
  bool _autenticando = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _verificar();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  // Volta a pedir desbloqueio se o app foi pro background e voltou — mesma
  // lógica de "sessão local" de qualquer app com bloqueio por biometria.
  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.paused) {
      _desbloqueadoNesteProcesso = false;
    } else if (state == AppLifecycleState.resumed && !_desbloqueadoNesteProcesso) {
      _verificar();
    }
  }

  Future<void> _verificar() async {
    if (_desbloqueadoNesteProcesso) {
      setState(() {
        _carregando = false;
        _precisaDesbloquear = false;
      });
      return;
    }
    final ligado = await BiometricService.isEnabled();
    if (!mounted) return;
    setState(() {
      _carregando = false;
      _precisaDesbloquear = ligado;
    });
    if (ligado) _tentarDesbloquear();
  }

  Future<void> _tentarDesbloquear() async {
    if (_autenticando) return;
    setState(() => _autenticando = true);
    final ok = await BiometricService.authenticate();
    if (!mounted) return;
    setState(() {
      _autenticando = false;
      if (ok) {
        _desbloqueadoNesteProcesso = true;
        _precisaDesbloquear = false;
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    if (_carregando) return const Scaffold(body: Center(child: CircularProgressIndicator()));
    if (!_precisaDesbloquear) return widget.child;

    return Scaffold(
      body: SafeArea(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.lock_outline, size: 56, color: Theme.of(context).colorScheme.primary),
                const SizedBox(height: 16),
                const Text('InovaFlow bloqueado', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                const SizedBox(height: 4),
                const Text('Desbloqueie para continuar', style: TextStyle(color: Colors.grey)),
                const SizedBox(height: 24),
                FilledButton.icon(
                  onPressed: _autenticando ? null : _tentarDesbloquear,
                  icon: const Icon(Icons.fingerprint),
                  label: Text(_autenticando ? 'Verificando...' : 'Desbloquear'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
