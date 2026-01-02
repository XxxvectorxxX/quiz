-- Seed initial questions for each difficulty level

-- Perguntas para crianças
insert into public.questions (question_text, correct_answer, wrong_answers, difficulty_level, bible_reference, topic)
values
  ('Quem construiu a arca?', 'Noé', '["Moisés", "Abraão", "Davi"]', 'criancas', 'Gênesis 6:14', 'Antigo Testamento'),
  ('Quantos dias e noites choveu na época de Noé?', '40', '["7", "30", "100"]', 'criancas', 'Gênesis 7:12', 'Antigo Testamento'),
  ('Quem venceu o gigante Golias?', 'Davi', '["Saul", "Sansão", "Josué"]', 'criancas', '1 Samuel 17', 'Antigo Testamento'),
  ('Quantos discípulos Jesus tinha?', '12', '["7", "10", "24"]', 'criancas', 'Mateus 10:1-4', 'Novo Testamento'),
  ('Onde Jesus nasceu?', 'Belém', '["Nazaré", "Jerusalém", "Jericó"]', 'criancas', 'Lucas 2:4-7', 'Novo Testamento');

-- Perguntas para adolescentes
insert into public.questions (question_text, correct_answer, wrong_answers, difficulty_level, bible_reference, topic)
values
  ('Qual foi o primeiro milagre de Jesus?', 'Transformar água em vinho', '["Curar um cego", "Multiplicar pães", "Ressuscitar Lázaro"]', 'adolescentes', 'João 2:1-11', 'Novo Testamento'),
  ('Quem traiu Jesus por 30 moedas de prata?', 'Judas Iscariotes', '["Pedro", "Tomé", "João"]', 'adolescentes', 'Mateus 26:14-16', 'Novo Testamento'),
  ('Quantos anos o povo de Israel peregrinou no deserto?', '40', '["30", "50", "70"]', 'adolescentes', 'Números 14:33', 'Antigo Testamento'),
  ('Qual era a profissão de Pedro antes de seguir Jesus?', 'Pescador', '["Carpinteiro", "Cobrador de impostos", "Fariseu"]', 'adolescentes', 'Mateus 4:18', 'Novo Testamento'),
  ('Em qual monte Moisés recebeu os Dez Mandamentos?', 'Monte Sinai', '["Monte Carmelo", "Monte das Oliveiras", "Monte Ararate"]', 'adolescentes', 'Êxodo 19:20', 'Antigo Testamento');

-- Perguntas para jovens
insert into public.questions (question_text, correct_answer, wrong_answers, difficulty_level, bible_reference, topic)
values
  ('Qual apóstolo escreveu mais livros no Novo Testamento?', 'Paulo', '["Pedro", "João", "Tiago"]', 'jovens', 'Romanos até Filemom', 'Novo Testamento'),
  ('Quem foi o rei mais sábio de Israel?', 'Salomão', '["Davi", "Josias", "Ezequias"]', 'jovens', '1 Reis 3:12', 'Antigo Testamento'),
  ('Quantos livros há no Novo Testamento?', '27', '["24", "30", "39"]', 'jovens', 'Novo Testamento', 'Conhecimento Geral'),
  ('Qual é o menor versículo da Bíblia?', 'Jesus chorou', '["Orai sem cessar", "Deus é amor", "Eu sou"]', 'jovens', 'João 11:35', 'Novo Testamento'),
  ('Quem foi vendido como escravo pelos seus irmãos?', 'José', '["Benjamim", "Judá", "Simeão"]', 'jovens', 'Gênesis 37:28', 'Antigo Testamento');

-- Perguntas para adultos
insert into public.questions (question_text, correct_answer, wrong_answers, difficulty_level, bible_reference, topic)
values
  ('Qual é o significado do nome Emanuel?', 'Deus conosco', '["Deus é grande", "Deus provê", "Deus salva"]', 'adultos', 'Mateus 1:23', 'Teologia'),
  ('Quantos livros tem o Antigo Testamento?', '39', '["27", '45', '66']', 'adultos', 'Antigo Testamento', 'Conhecimento Geral'),
  ('Qual profeta foi levado ao céu em um redemoinho?', 'Elias', '["Eliseu", "Enoque", "Ezequiel"]', 'adultos', '2 Reis 2:11', 'Antigo Testamento'),
  ('Quantas pragas Deus enviou ao Egito?', '10', '["7", "12", "14"]', 'adultos', 'Êxodo 7-12', 'Antigo Testamento'),
  ('Qual era a profissão de Lucas?', 'Médico', '["Escriba", "Fariseu", "Pescador"]', 'adultos', 'Colossenses 4:14', 'Novo Testamento');

-- Perguntas para casais
insert into public.questions (question_text, correct_answer, wrong_answers, difficulty_level, bible_reference, topic)
values
  ('Qual casal foi o primeiro da criação?', 'Adão e Eva', '["Abraão e Sara", "Isaque e Rebeca", "Jacó e Raquel"]', 'casais', 'Gênesis 2:21-24', 'Casamento'),
  ('Complete o versículo: "O que Deus uniu..."', 'não separe o homem', '["é para sempre", "seja abençoado", "permanecerá eternamente"]', 'casais', 'Mateus 19:6', 'Casamento'),
  ('Qual casal recebeu a promessa de ter um filho na velhice?', 'Abraão e Sara', '["Isaque e Rebeca", "Jacó e Raquel", "Zacarias e Isabel"]', 'casais', 'Gênesis 18:10-14', 'Família'),
  ('Qual livro da Bíblia é conhecido como o "livro do amor"?', 'Cânticos', '["Provérbios", "Rute", "Ester"]', 'casais', 'Cânticos 1:1', 'Casamento'),
  ('Quem disse: "Onde quer que fores, irei"?', 'Rute', '["Sara", "Rebeca", "Raquel"]', 'casais', 'Rute 1:16', 'Família');
