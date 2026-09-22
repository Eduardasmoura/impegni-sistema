// Máscaras e validações do cadastro do trial. Funções puras (sem estado,
// sem dependência de React) pra poderem ser usadas tanto na digitação
// (formatação progressiva) quanto na validação de cada etapa do wizard.

export function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

/** Máscara progressiva de celular/telefone fixo brasileiro. */
export function formatPhone(value: string): string {
  const d = onlyDigits(value).slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export function isValidPhone(value: string): boolean {
  const d = onlyDigits(value);
  return d.length === 10 || d.length === 11;
}

/** Máscara progressiva que muda de CPF pra CNPJ sozinha ao passar de 11 dígitos. */
export function formatDocument(value: string): string {
  const d = onlyDigits(value).slice(0, 14);
  if (d.length <= 11) {
    return d.replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  }
  return d
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1/$2")
    .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
}

export type DocumentType = "cpf" | "cnpj";

export function documentType(value: string): DocumentType | null {
  const d = onlyDigits(value);
  if (d.length === 11) return "cpf";
  if (d.length === 14) return "cnpj";
  return null;
}

function isValidCpf(cpf: string): boolean {
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  const checkDigit = (length: number) => {
    let sum = 0;
    for (let i = 0; i < length; i++) sum += Number(cpf[i]) * (length + 1 - i);
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };
  return checkDigit(9) === Number(cpf[9]) && checkDigit(10) === Number(cpf[10]);
}

function isValidCnpj(cnpj: string): boolean {
  if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) return false;
  const checkDigit = (base: string) => {
    const weights = base.length === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const sum = base.split("").reduce((acc, digit, i) => acc + Number(digit) * weights[i], 0);
    const rest = sum % 11;
    return rest < 2 ? 0 : 11 - rest;
  };
  const firstDigit = checkDigit(cnpj.slice(0, 12));
  const secondDigit = checkDigit(cnpj.slice(0, 12) + firstDigit);
  return firstDigit === Number(cnpj[12]) && secondDigit === Number(cnpj[13]);
}

/** Valida CPF (11 dígitos) ou CNPJ (14 dígitos) pelo dígito verificador — não só o tamanho. */
export function isValidDocument(value: string): boolean {
  const d = onlyDigits(value);
  if (d.length === 11) return isValidCpf(d);
  if (d.length === 14) return isValidCnpj(d);
  return false;
}

export function formatCep(value: string): string {
  const d = onlyDigits(value).slice(0, 8);
  return d.length <= 5 ? d : `${d.slice(0, 5)}-${d.slice(5)}`;
}

export function isValidCepFormat(value: string): boolean {
  return onlyDigits(value).length === 8;
}

export type PasswordChecks = { length: boolean; letter: boolean; number: boolean };

export function passwordChecks(password: string): PasswordChecks {
  return {
    length: password.length >= 8,
    letter: /[a-zA-Z]/.test(password),
    number: /[0-9]/.test(password),
  };
}

export function isPasswordValid(password: string): boolean {
  const checks = passwordChecks(password);
  return checks.length && checks.letter && checks.number;
}
