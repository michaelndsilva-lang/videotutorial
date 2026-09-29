-- O Guia de Produtos oficial tem ~38 MB (páginas em arte gráfica que não
-- comprimem sem perder legibilidade). 50 MB é o teto por arquivo do Storage no
-- plano free do Supabase.
update storage.buckets set file_size_limit = 52428800 where id = 'catalogos';
