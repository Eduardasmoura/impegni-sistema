import Image from "next/image";
import { BOOKING_ROOT_DOMAIN } from "@/lib/format";

// Prints reais da página pública de agendamento (apps/web-client) da conta
// de demonstração Taty Beauty — dados fictícios, capturados num ambiente
// local isolado. Desktop: página da empresa. Celular: passo "horário".
const SLUG = "taty-beauty";

export function BookingMockup() {
  return (
    <div className="relative sm:pb-28 sm:pr-24 lg:pr-28">
      {/* celular: só o print mobile, que é o que o cliente final vê ali */}
      <div className="sm:hidden mx-auto w-[72%] max-w-[270px] rounded-[2.1rem] bg-[#141014] p-[7px] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.55)]">
        <div className="rounded-[1.7rem] overflow-hidden bg-white">
          <Image
            src="/produto/agendamento-celular.webp"
            alt="No celular, o cliente escolhe o dia no calendário e um dos horários disponíveis"
            width={390}
            height={844}
            sizes="270px"
            className="block w-full h-auto"
          />
        </div>
      </div>

      <div className="hidden sm:block rounded-2xl overflow-hidden border border-white/15 bg-white shadow-[0_40px_80px_-24px_rgba(0,0,0,0.5)]">
        <div className="flex items-center gap-3 h-8 sm:h-10 px-3 sm:px-4 border-b border-black/[0.06] bg-[#f5f2f4]" aria-hidden="true">
          <div className="flex gap-1.5">
            <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-black/15" />
            <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-black/15" />
            <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-black/15" />
          </div>
          <span className="mx-auto truncate rounded-md bg-white px-3 py-0.5 text-[10px] sm:text-xs text-black/50">
            {SLUG}.{BOOKING_ROOT_DOMAIN}
          </span>
          <span className="w-10 sm:w-12" />
        </div>
        <Image
          src="/produto/agendamento-publico.webp"
          alt="Página pública de agendamento da Taty Beauty, com o botão Agendar horário e a lista de serviços com preço e duração"
          width={1200}
          height={900}
          sizes="(min-width: 1024px) 620px, 100vw"
          className="block w-full h-auto"
        />
      </div>

      <div className="absolute hidden sm:block right-0 bottom-0 w-[42%] max-w-[250px] min-w-[180px] rounded-[2.1rem] bg-[#141014] p-[7px] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.55)]">
        <div className="relative rounded-[1.7rem] overflow-hidden bg-white">
          <Image
            src="/produto/agendamento-celular.webp"
            alt="No celular, o cliente escolhe o dia no calendário e um dos horários disponíveis"
            width={390}
            height={844}
            sizes="250px"
            className="block w-full h-auto"
          />
        </div>
      </div>
    </div>
  );
}
