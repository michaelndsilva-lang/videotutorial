-- Novo modo de agente exclusivo (SUNNE). Precisa ser uma migration separada:
-- um valor novo de enum não pode ser usado na mesma transação em que é criado.
alter type agente_modo add value if not exists 'sunne';
