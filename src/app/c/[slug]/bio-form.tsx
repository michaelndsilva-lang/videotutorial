"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2 } from "lucide-react";
import { enviarLeadBio } from "./actions";

type Campo = "nome" | "telefone" | "email" | "consentimento";
type Erros = Partial<Record<Campo, string>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Máscara (00) 00000-0000. Começando com "+", aceita o código do país
// na frente: +55 (84) 99999-9999.
function mascararTelefone(valor: string) {
  const internacional = valor.trim().startsWith("+");
  let d = valor.replace(/\D/g, "");
  let ddi = "";
  if (internacional) {
    ddi = d.slice(0, 2);
    d = d.slice(2);
  }
  d = d.slice(0, 11);
  let local = d;
  if (d.length > 2) local = `(${d.slice(0, 2)}) ${d.slice(2)}`;
  else if (d.length > 0) local = `(${d}`;
  if (d.length > 6) {
    const corte = d.length === 11 ? 7 : 6;
    local = `(${d.slice(0, 2)}) ${d.slice(2, corte)}-${d.slice(corte)}`;
  }
  return internacional ? `+${ddi}${local ? ` ${local}` : ""}` : local;
}

function validar(nome: string, telefone: string, email: string, aceite: boolean): Erros {
  const erros: Erros = {};
  if (nome.trim().split(/\s+/).filter(Boolean).length < 2) erros.nome = "Digite seu nome e sobrenome.";
  let d = telefone.replace(/\D/g, "");
  if (telefone.trim().startsWith("+") && d.startsWith("55")) d = d.slice(2);
  if (d.length < 10 || d.length > 11) erros.telefone = "Digite o WhatsApp com DDD.";
  if (!EMAIL_RE.test(email.trim())) erros.email = "Digite um e-mail válido, como nome@exemplo.com.";
  if (!aceite) erros.consentimento = "Marque a caixa para enviar.";
  return erros;
}

export function BioForm({ slug }: { slug: string }) {
  const [abertoEm] = useState(() => Date.now());
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [aceite, setAceite] = useState(false);
  const [erros, setErros] = useState<Erros>({});
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);
  const [isPending, startTransition] = useTransition();
  const enviando = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);

  function focarPrimeiroErro(e: Erros) {
    const ordem: Campo[] = ["nome", "telefone", "email", "consentimento"];
    const primeiro = ordem.find((c) => e[c]);
    if (primeiro) formRef.current?.querySelector<HTMLElement>(`[name="${primeiro}"]`)?.focus();
  }

  function limparErro(campo: Campo) {
    if (erros[campo]) setErros((e) => ({ ...e, [campo]: undefined }));
  }

  if (enviado) {
    return (
      <div role="status" className="bio-sucesso flex flex-col items-center gap-3 px-2 py-6 text-center">
        <CheckCircle2 aria-hidden className="size-10 text-[var(--an-gold)]" strokeWidth={1.5} />
        <p className="bio-serif text-2xl font-semibold">Cadastro realizado com sucesso!</p>
        <p className="max-w-xs text-[15px] leading-relaxed text-[var(--an-muted)]">
          Obrigado pelo interesse. Em breve, entrarei em contato com você.
        </p>
      </div>
    );
  }

  return (
    <form
      ref={formRef}
      // POST: se o JS ainda não carregou, os dados nunca vão parar na URL.
      method="post"
      noValidate
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        if (enviando.current) return; // bloqueia clique duplo
        const encontrados = validar(nome, telefone, email, aceite);
        setErros(encontrados);
        setErroGeral(null);
        if (Object.keys(encontrados).length) return focarPrimeiroErro(encontrados);

        const fd = new FormData(e.currentTarget);
        fd.set("t", String(abertoEm));
        fd.set("url_origem", window.location.href);
        enviando.current = true;
        startTransition(async () => {
          try {
            const r = await enviarLeadBio(slug, fd);
            if (r.ok) return setEnviado(true);
            if (r.campo) {
              const e2 = { [r.campo]: r.erro } as Erros;
              setErros(e2);
              focarPrimeiroErro(e2);
            } else {
              setErroGeral(r.erro);
            }
          } catch {
            setErroGeral("Não foi possível enviar agora. Verifique sua conexão e tente novamente.");
          } finally {
            enviando.current = false;
          }
        });
      }}
    >
      <div className="bio-campo">
        <label htmlFor="bio-nome">Nome completo</label>
        <input
          id="bio-nome"
          name="nome"
          value={nome}
          onChange={(e) => {
            setNome(e.target.value);
            limparErro("nome");
          }}
          maxLength={80}
          autoComplete="name"
          placeholder="Digite seu nome completo"
          aria-invalid={!!erros.nome}
          aria-describedby={erros.nome ? "bio-nome-erro" : undefined}
          required
        />
        {erros.nome && <p id="bio-nome-erro" className="bio-erro">{erros.nome}</p>}
      </div>

      <div className="bio-campo">
        <label htmlFor="bio-telefone">WhatsApp</label>
        <input
          id="bio-telefone"
          name="telefone"
          type="tel"
          value={telefone}
          onChange={(e) => {
            setTelefone(mascararTelefone(e.target.value));
            limparErro("telefone");
          }}
          inputMode="tel"
          autoComplete="tel"
          placeholder="(00) 00000-0000"
          aria-invalid={!!erros.telefone}
          aria-describedby={erros.telefone ? "bio-telefone-erro" : undefined}
          required
        />
        {erros.telefone && <p id="bio-telefone-erro" className="bio-erro">{erros.telefone}</p>}
      </div>

      <div className="bio-campo">
        <label htmlFor="bio-email">E-mail</label>
        <input
          id="bio-email"
          name="email"
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            limparErro("email");
          }}
          maxLength={254}
          autoComplete="email"
          inputMode="email"
          placeholder="Digite seu melhor e-mail"
          aria-invalid={!!erros.email}
          aria-describedby={erros.email ? "bio-email-erro" : undefined}
          required
        />
        {erros.email && <p id="bio-email-erro" className="bio-erro">{erros.email}</p>}
      </div>

      {/* Armadilha para robôs: invisível para pessoas. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Empresa
          <input type="text" name="empresa" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      {erroGeral && (
        <p role="alert" className="bio-erro rounded-xl border border-[var(--an-erro)]/40 px-4 py-3">
          {erroGeral}
        </p>
      )}

      <button type="submit" className="bio-botao" disabled={isPending} aria-busy={isPending}>
        {isPending && <Loader2 aria-hidden className="size-5 animate-spin" />}
        {isPending ? "Enviando..." : "QUERO SABER MAIS"}
      </button>

      <div className="flex flex-col gap-1.5">
        <label className="flex items-start gap-3 text-[13px] leading-relaxed text-[var(--an-muted)]">
          <input
            type="checkbox"
            name="consentimento"
            checked={aceite}
            onChange={(e) => {
              setAceite(e.target.checked);
              limparErro("consentimento");
            }}
            aria-invalid={!!erros.consentimento}
            aria-describedby={erros.consentimento ? "bio-consentimento-erro" : undefined}
            className="bio-check mt-0.5"
            required
          />
          <span>
            Ao enviar seus dados, você declara estar ciente de que suas informações serão utilizadas
            para responder à sua solicitação e permitir o contato do consultor responsável, conforme
            nossa{" "}
            <Link href="/privacidade" target="_blank" className="text-[var(--an-gold)] underline underline-offset-2">
              Política de Privacidade
            </Link>
            .
          </span>
        </label>
        {erros.consentimento && (
          <p id="bio-consentimento-erro" className="bio-erro pl-8">
            {erros.consentimento}
          </p>
        )}
      </div>
    </form>
  );
}
