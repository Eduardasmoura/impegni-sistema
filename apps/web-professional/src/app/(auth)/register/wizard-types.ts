export type WizardData = {
  // Etapa 1 — Seus dados
  fullName: string;
  email: string;
  phone: string;
  businessName: string;
  document: string;
  // Etapa 2 — Seu negócio
  businessSize: string;
  staffSizeRange: string;
  // Etapa 3 — Segmento e objetivos
  segmentId: string;
  otherSegment: string;
  goals: string[];
  // Etapa 4 — Endereço
  zipCode: string;
  street: string;
  neighborhood: string;
  addressNumber: string;
  complement: string;
  city: string;
  state: string;
  // Etapa 5 — Senha
  password: string;
  confirmPassword: string;
  termsAccepted: boolean;
};

export const EMPTY_WIZARD_DATA: WizardData = {
  fullName: "",
  email: "",
  phone: "",
  businessName: "",
  document: "",
  businessSize: "",
  staffSizeRange: "",
  segmentId: "",
  otherSegment: "",
  goals: [],
  zipCode: "",
  street: "",
  neighborhood: "",
  addressNumber: "",
  complement: "",
  city: "",
  state: "",
  password: "",
  confirmPassword: "",
  termsAccepted: false,
};

export type StepProps = {
  data: WizardData;
  onChange: (patch: Partial<WizardData>) => void;
};
