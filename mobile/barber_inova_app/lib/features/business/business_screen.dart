import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:supabase_flutter/supabase_flutter.dart' show FileOptions;
import '../../app/app_drawer.dart';
import '../../data/company_service.dart';
import '../../data/supabase_client.dart';

/// Meu negócio — mesmos campos de
/// `apps/web-professional/.../configuracao/configuracao-view.tsx` (logo,
/// capa, cores, horário, endereço, link público, segmento). A paleta de
/// cor usa os mesmos 6 presets do web (`PALETAS_PRONTAS`, cada um já
/// define primária/secundária/acento juntas) em vez dos 3 inputs RGB
/// independentes que o web também tem pra ajuste fino depois do preset —
/// cobre o caso de uso principal sem duplicar toda aquela UI de color
/// picker. CORRIGIDO: antes só `color_primary` era salvo ao escolher um
/// preset (bug — secundária/acento do preset nunca chegavam a persistir,
/// mesmo a UI já mostrando as 3 cores do preset); agora as 3 vão juntas,
/// igual ao clique num preset no web.
class BusinessScreen extends StatefulWidget {
  final CurrentCompany company;

  const BusinessScreen({super.key, required this.company});

  @override
  State<BusinessScreen> createState() => _BusinessScreenState();
}

class _Paleta {
  final String nome;
  final Color primaria;
  final Color secundaria;
  final Color acento;

  const _Paleta(this.nome, this.primaria, this.secundaria, this.acento);
}

// Mesmos 6 presets de `configuracao-view.tsx` (PALETAS_PRONTAS).
const _paletas = [
  _Paleta('Âmbar', Color(0xFFB45309), Color(0xFF1C1917), Color(0xFFF5E6D3)),
  _Paleta('Rosa', Color(0xFFBE185D), Color(0xFF3B0764), Color(0xFFFCE7F3)),
  _Paleta('Esmeralda', Color(0xFF047857), Color(0xFF064E3B), Color(0xFFD1FAE5)),
  _Paleta('Azul', Color(0xFF1D4ED8), Color(0xFF0F172A), Color(0xFFDBEAFE)),
  _Paleta('Roxo', Color(0xFF7C3AED), Color(0xFF1E1B4B), Color(0xFFEDE9FE)),
  _Paleta('Preto', Color(0xFF171717), Color(0xFF000000), Color(0xFFF5F5F5)),
];

String _hex(Color c) => '#${c.toARGB32().toRadixString(16).substring(2).toUpperCase()}';

class _BusinessScreenState extends State<BusinessScreen> {
  bool _loading = true;
  bool _saving = false;
  bool _uploadingLogo = false;
  bool _uploadingCover = false;

  final _nameController = TextEditingController();
  final _phoneController = TextEditingController();
  final _whatsappController = TextEditingController();
  final _addressController = TextEditingController();
  final _instagramController = TextEditingController();
  final _hoursController = TextEditingController();

  String? _slug;
  String? _logoUrl;
  String? _coverUrl;
  String? _corPrimaria;
  String? _corSecundaria;
  String? _corAcento;
  bool _fidelidade = false;
  bool _lembreteWhatsapp = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _nameController.dispose();
    _phoneController.dispose();
    _whatsappController.dispose();
    _addressController.dispose();
    _instagramController.dispose();
    _hoursController.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    final row = await supabase
        .from('companies')
        .select(
          'name, slug, phone, whatsapp, address, instagram, business_hours, logo_url, cover_url, color_primary, color_secondary, color_accent, loyalty_program_enabled, whatsapp_reminder_enabled',
        )
        .eq('id', widget.company.id)
        .single();
    if (!mounted) return;
    setState(() {
      _nameController.text = row['name'] as String? ?? '';
      _slug = row['slug'] as String?;
      _phoneController.text = row['phone'] as String? ?? '';
      _whatsappController.text = row['whatsapp'] as String? ?? '';
      _addressController.text = row['address'] as String? ?? '';
      _instagramController.text = row['instagram'] as String? ?? '';
      _hoursController.text = row['business_hours'] as String? ?? '';
      _logoUrl = row['logo_url'] as String?;
      _coverUrl = row['cover_url'] as String?;
      _corPrimaria = row['color_primary'] as String?;
      _corSecundaria = row['color_secondary'] as String?;
      _corAcento = row['color_accent'] as String?;
      _fidelidade = row['loyalty_program_enabled'] as bool? ?? false;
      _lembreteWhatsapp = row['whatsapp_reminder_enabled'] as bool? ?? false;
      _loading = false;
    });
  }

  Future<void> _upload(String pasta, void Function(bool) setUploading, void Function(String) setUrl) async {
    final picked = await ImagePicker().pickImage(source: ImageSource.gallery, maxWidth: 1600, imageQuality: 82);
    if (picked == null) return;
    setState(() => setUploading(true));
    try {
      final bytes = await picked.readAsBytes();
      final ext = picked.name.split('.').last;
      final path = '${widget.company.id}/$pasta/${DateTime.now().millisecondsSinceEpoch}.$ext';
      await supabase.storage.from('company-assets').uploadBinary(path, bytes, fileOptions: const FileOptions(upsert: true));
      final url = supabase.storage.from('company-assets').getPublicUrl(path);
      if (!mounted) return;
      setState(() => setUrl(url));
    } catch (_) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Não foi possível enviar a imagem.'), backgroundColor: Colors.red));
    } finally {
      if (mounted) setState(() => setUploading(false));
    }
  }

  Future<void> _salvar() async {
    setState(() => _saving = true);
    try {
      await supabase.from('companies').update({
        'name': _nameController.text.trim(),
        'phone': _phoneController.text.trim().isEmpty ? null : _phoneController.text.trim(),
        'whatsapp': _whatsappController.text.trim().isEmpty ? null : _whatsappController.text.trim(),
        'address': _addressController.text.trim().isEmpty ? null : _addressController.text.trim(),
        'instagram': _instagramController.text.trim().isEmpty ? null : _instagramController.text.trim(),
        'business_hours': _hoursController.text.trim().isEmpty ? null : _hoursController.text.trim(),
        'logo_url': _logoUrl,
        'cover_url': _coverUrl,
        if (_corPrimaria != null) 'color_primary': _corPrimaria,
        if (_corSecundaria != null) 'color_secondary': _corSecundaria,
        if (_corAcento != null) 'color_accent': _corAcento,
        'loyalty_program_enabled': _fidelidade,
        'whatsapp_reminder_enabled': _lembreteWhatsapp,
      }).eq('id', widget.company.id);
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Identidade visual salva!')));
    } catch (_) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Não foi possível salvar.'), backgroundColor: Colors.red));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return Scaffold(drawer: const AppDrawer(), appBar: AppBar(title: const Text('Meu negócio')), body: const Center(child: CircularProgressIndicator()));
    }
    return Scaffold(
      drawer: const AppDrawer(),
      appBar: AppBar(title: const Text('Meu negócio')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          if (_slug != null)
            Card(
              child: ListTile(
                leading: const Icon(Icons.link),
                title: const Text('Link público', style: TextStyle(fontSize: 12, color: Colors.grey)),
                subtitle: Text('$_slug.inova.app', style: const TextStyle(fontFamily: 'monospace')),
              ),
            ),
          const SizedBox(height: 16),
          _ImagePickerCard(
            label: 'Capa',
            url: _coverUrl,
            uploading: _uploadingCover,
            height: 120,
            onTap: () => _upload('cover', (v) => _uploadingCover = v, (u) => _coverUrl = u),
          ),
          const SizedBox(height: 12),
          _ImagePickerCard(
            label: 'Logo',
            url: _logoUrl,
            uploading: _uploadingLogo,
            height: 90,
            circular: true,
            onTap: () => _upload('logo', (v) => _uploadingLogo = v, (u) => _logoUrl = u),
          ),
          const SizedBox(height: 20),
          TextField(controller: _nameController, decoration: const InputDecoration(labelText: 'Nome', border: OutlineInputBorder())),
          const SizedBox(height: 12),
          TextField(controller: _phoneController, decoration: const InputDecoration(labelText: 'Telefone', border: OutlineInputBorder())),
          const SizedBox(height: 12),
          TextField(controller: _whatsappController, decoration: const InputDecoration(labelText: 'WhatsApp', border: OutlineInputBorder())),
          const SizedBox(height: 12),
          TextField(controller: _addressController, decoration: const InputDecoration(labelText: 'Endereço', border: OutlineInputBorder())),
          const SizedBox(height: 12),
          TextField(controller: _instagramController, decoration: const InputDecoration(labelText: 'Instagram', border: OutlineInputBorder())),
          const SizedBox(height: 12),
          TextField(
            controller: _hoursController,
            maxLines: 2,
            decoration: const InputDecoration(labelText: 'Horário de funcionamento', border: OutlineInputBorder()),
          ),
          const SizedBox(height: 20),
          Text('Paleta de cores', style: Theme.of(context).textTheme.titleSmall),
          const SizedBox(height: 8),
          Wrap(
            spacing: 12,
            runSpacing: 12,
            children: _paletas.map((p) {
              final selecionada = _corPrimaria?.toUpperCase() == _hex(p.primaria);
              return GestureDetector(
                onTap: () => setState(() {
                  _corPrimaria = _hex(p.primaria);
                  _corSecundaria = _hex(p.secundaria);
                  _corAcento = _hex(p.acento);
                }),
                child: Column(
                  children: [
                    Container(
                      width: 40,
                      height: 40,
                      decoration: BoxDecoration(
                        color: p.primaria,
                        shape: BoxShape.circle,
                        border: selecionada ? Border.all(color: Theme.of(context).colorScheme.primary, width: 3) : null,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(p.nome, style: const TextStyle(fontSize: 10)),
                  ],
                ),
              );
            }).toList(),
          ),
          const SizedBox(height: 20),
          SwitchListTile(
            contentPadding: EdgeInsets.zero,
            title: const Text('Programa de fidelidade'),
            value: _fidelidade,
            onChanged: (v) => setState(() => _fidelidade = v),
          ),
          SwitchListTile(
            contentPadding: EdgeInsets.zero,
            title: const Text('Lembrete automático por WhatsApp'),
            value: _lembreteWhatsapp,
            onChanged: (v) => setState(() => _lembreteWhatsapp = v),
          ),
          const SizedBox(height: 16),
          FilledButton.icon(
            onPressed: _saving ? null : _salvar,
            icon: const Icon(Icons.save_outlined),
            label: Text(_saving ? 'Salvando...' : 'Salvar'),
          ),
        ],
      ),
    );
  }
}

class _ImagePickerCard extends StatelessWidget {
  final String label;
  final String? url;
  final bool uploading;
  final double height;
  final bool circular;
  final VoidCallback onTap;

  const _ImagePickerCard({required this.label, required this.url, required this.uploading, required this.height, this.circular = false, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: uploading ? null : onTap,
      child: ClipRRect(
        borderRadius: BorderRadius.circular(circular ? height / 2 : 12),
        child: Container(
          height: height,
          width: circular ? height : double.infinity,
          color: Colors.grey.shade200,
          child: uploading
              ? const Center(child: CircularProgressIndicator())
              : url != null
                  ? Image.network(url!, fit: BoxFit.cover, width: double.infinity, height: height)
                  : Center(
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(Icons.image_outlined, color: Colors.grey),
                          Text(label, style: const TextStyle(color: Colors.grey, fontSize: 11)),
                        ],
                      ),
                    ),
        ),
      ),
    );
  }
}
