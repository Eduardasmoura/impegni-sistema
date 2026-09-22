import { onlyDigits } from "@/lib/validators";

export type CepAddress = { street: string; neighborhood: string; city: string; state: string };
export type CepLookupResult =
  | { status: "found"; address: CepAddress }
  | { status: "not_found" }
  | { status: "unavailable" };

/**
 * Busca endereço pelo CEP via ViaCEP — usado só na Etapa 4 do cadastro pra
 * pré-preencher rua/bairro/cidade/estado. Nunca lança: chamador sempre
 * recebe um resultado tipado e decide a mensagem (CEP inválido vs. serviço
 * fora do ar), e o formulário continua editável nos dois casos — a
 * consulta é uma ajuda, não um bloqueio.
 */
export async function lookupCep(cep: string): Promise<CepLookupResult> {
  const digits = onlyDigits(cep);
  if (digits.length !== 8) return { status: "not_found" };

  try {
    const response = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
    if (!response.ok) return { status: "unavailable" };
    const data = await response.json();
    if (data.erro) return { status: "not_found" };
    return {
      status: "found",
      address: {
        street: data.logradouro ?? "",
        neighborhood: data.bairro ?? "",
        city: data.localidade ?? "",
        state: data.uf ?? "",
      },
    };
  } catch {
    return { status: "unavailable" };
  }
}
