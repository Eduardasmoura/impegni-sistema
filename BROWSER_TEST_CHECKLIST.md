# Checklist de testes manuais em navegador

Nenhum item deste documento foi executado — os ambientes de desenvolvimento usados nas rodadas de
auditoria deste projeto não têm acesso a um navegador real (só HTTP via `curl` e chamadas diretas
ao banco/API). Isto é o roteiro para quem for fazer essa passada manual antes do lançamento.

Marque cada célula com ✅ (passou), ❌ (falhou — abrir issue) ou `—` (não aplicável).

## Navegadores/dispositivos alvo

| | Chrome Desktop | Safari Desktop | Chrome Android | Safari iPhone | Tablet |
|---|---|---|---|---|---|
| Versão testada | | | | | |
| Data | | | | | |
| Testado por | | | | | |

## Fluxos a testar em cada linha da tabela acima

### Cadastro e contrato
- [ ] Landing page carrega, CTA "Começar teste grátis" funciona
- [ ] Wizard de cadastro: preencher as 5 etapas sem erro visual
- [ ] Máscaras (telefone, CPF/CNPJ, CEP) formatam corretamente ao digitar
- [ ] CEP válido preenche rua/bairro/cidade/estado automaticamente
- [ ] CEP inválido mostra mensagem clara, não trava o formulário
- [ ] Link "Ler contrato completo" abre `/contrato` em nova aba, sem exigir login
- [ ] Checkbox de aceite bloqueia "Criar minha conta" enquanto desmarcado
- [ ] Regras de senha (8 caracteres, letra, número) atualizam visualmente ao digitar
- [ ] Botão mostrar/ocultar senha funciona nos dois campos
- [ ] Envio finaliza e mostra a tela "Confirme seu e-mail"

### Confirmação e onboarding
- [ ] Link do e-mail de confirmação leva ao login
- [ ] Primeiro login mostra "Encontramos seus dados" com os dados corretos (não vazio)
- [ ] Confirmar aplica os dados e entra no dashboard com a mensagem de boas-vindas

### Sistema autenticado
- [ ] Dashboard carrega sem erro, gráficos/números aparecem
- [ ] Agenda: criar, editar, cancelar um agendamento
- [ ] Clientes: cadastrar, editar, buscar
- [ ] Serviços: cadastrar com foto, editar, marcar inativo
- [ ] Financeiro: lançar receita/despesa, ver totais
- [ ] Logout funciona e impede acesso a rotas protegidas depois

### Trial e bloqueio
- [ ] Banner/aviso de trial próximo do fim aparece quando esperado
- [ ] Acesso bloqueado corretamente quando o trial expira (usar empresa de teste com trial vencido)
- [ ] Tela de bloqueio mostra plano(s) e CTA de contratação, não uma tela em branco/erro
- [ ] Depois de "ativar" um plano (manualmente no banco, para teste), o acesso volta sem precisar
      recriar a empresa

### Pagamento (quando houver ambiente de sandbox do Asaas disponível)
- [ ] Fluxo de contratação de plano abre a cobrança corretamente
- [ ] Pagamento confirmado no sandbox reflete no sistema (webhook)

### Responsividade e UX geral
- [ ] Nenhum scroll horizontal indesejado em nenhuma tela, em nenhum dispositivo
- [ ] Teclado mobile não quebra o layout dos formulários (campo escondido atrás do teclado, etc.)
- [ ] Botões e áreas de toque confortáveis no mobile (não exigem zoom)
- [ ] Mensagens de erro e sucesso (toasts) legíveis e não cortadas em telas pequenas

### Console e rede (abrir DevTools em cada navegador testado)
- [ ] Nenhum erro JavaScript não tratado no console durante os fluxos acima
- [ ] Nenhuma requisição 4xx/5xx inesperada na aba Network durante os fluxos acima
- [ ] Nenhum warning de hydration mismatch (comum em SSR do Next.js — aparece no console)
- [ ] Nenhum dado sensível (senha, token) visível em query strings ou no corpo de requests logadas

## Ao encontrar um problema

Registrar: navegador/dispositivo, passo exato, comportamento esperado vs. observado, screenshot
quando possível, e mensagem de erro do console (se houver) — sem incluir dados reais de cliente.
