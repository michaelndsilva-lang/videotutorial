"use client";

import { useEffect, useState } from "react";

// Botão fixo no rodapé do celular: aparece depois que o botão da abertura
// sai da tela e some quando o formulário está visível.
export function CtaFixo() {
  const [visivel, setVisivel] = useState(false);

  useEffect(() => {
    const abertura = document.getElementById("cta-abertura");
    const form = document.getElementById("cadastro");
    if (!abertura || !form) return;
    let passouAbertura = false;
    let vendoForm = false;
    const obs = new IntersectionObserver((entradas) => {
      for (const e of entradas) {
        if (e.target === abertura) passouAbertura = !e.isIntersecting && e.boundingClientRect.top < 0;
        if (e.target === form) vendoForm = e.isIntersecting;
      }
      setVisivel(passouAbertura && !vendoForm);
    });
    obs.observe(abertura);
    obs.observe(form);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      aria-hidden={!visivel}
      className={`captura-cta-fixo fixed inset-x-0 bottom-0 z-40 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:hidden ${
        visivel ? "is-visivel" : ""
      }`}
    >
      <a href="#cadastro" tabIndex={visivel ? 0 : -1} className="bio-botao w-full">
        QUERO FAZER PARTE
      </a>
    </div>
  );
}
