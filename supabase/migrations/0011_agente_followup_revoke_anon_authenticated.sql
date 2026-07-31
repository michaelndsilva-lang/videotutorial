-- Supabase concede EXECUTE em funções novas do schema public para anon e
-- authenticated por default privileges (além do PUBLIC pseudo-role já revogado
-- na migration 0010) — o advisor de segurança acusou
-- agente_conversas_aguardando_followup() como chamável sem estar logado.
-- Só o service-role (cron) deve poder chamá-la.
revoke execute on function public.agente_conversas_aguardando_followup() from anon, authenticated;
