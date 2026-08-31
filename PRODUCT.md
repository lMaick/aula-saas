# Aula SaaS — Product Brief v0.1

## 1. Objetivo do produto

Construir um SaaS simples para professores particulares autônomos gerenciarem:

* alunos;
* agenda de aulas;
* aulas realizadas;
* cancelamentos;
* reposições;
* pacotes de aulas;
* pagamentos;
* valores a receber.

O produto deve substituir principalmente o uso combinado de:

* memória;
* planilhas;
* anotações;
* múltiplas informações espalhadas pelo WhatsApp e agenda.

A primeira meta comercial do projeto é conseguir pelo menos **1 professor particular desconhecido pagando uma assinatura mensal**.

---

## 2. Público-alvo inicial

Professor particular autônomo.

Exemplos:

* professor de inglês;
* matemática;
* português;
* reforço escolar;
* música;
* idiomas;
* preparação para provas;
* outras aulas individuais.

O produto NÃO será inicialmente voltado para escolas, cursos ou equipes de professores.

---

## 3. Proposta de valor

### “Suas aulas em ordem. Seu dinheiro também.”

O professor deve conseguir administrar alunos, agenda e pagamentos em um único lugar, sem depender de planilhas e da própria memória.

---

# 4. Pilares do produto

O MVP possui quatro pilares:

## Alunos

Cadastro e histórico de cada aluno.

## Agenda

Organização das aulas e recorrências.

## Financeiro

Controle simples de pagamentos e valores pendentes.

## Pendências

Mostrar ao professor tudo que precisa de atenção.

Exemplos:

* pagamento atrasado;
* reposição pendente;
* pacote acabando;
* aula de hoje;
* cobrança pendente.

---

# 5. Dashboard

O dashboard será a tela principal.

Deve responder rapidamente:

* Quanto recebi este mês?
* Quanto tenho a receber?
* Quantas aulas dei?
* Quais aulas tenho hoje?
* Quem está devendo?
* Quem possui reposição pendente?
* Qual aluno está perto de acabar o pacote?

Exemplo:

Olá, Ana.

AGOSTO

Recebido: R$ 4.850

A receber: R$ 920

Aulas realizadas: 46

HOJE

14:00 — Lucas
16:00 — Mariana
19:00 — Pedro

ATENÇÃO

Carlos — pagamento atrasado R$300

Fernanda — reposição pendente

Pedro — restam 2 aulas no pacote

---

# 6. Cadastro de alunos

Cada aluno deve possuir inicialmente:

* nome;
* WhatsApp;
* observação opcional;
* status ativo/inativo;
* modelo de cobrança;
* valor;
* dias e horários habituais;
* histórico de aulas;
* histórico financeiro.

---

# 7. Modelos de cobrança

O MVP deve suportar três modelos.

## Por aula

Exemplo:

R$70 por aula.

Cada aula realizada pode gerar um valor a receber.

## Mensalidade

Exemplo:

R$300 por mês.

## Pacote

Exemplo:

10 aulas por R$600.

O sistema deve mostrar quantas aulas foram utilizadas e quantas restam.

Exemplo:

8 / 10 utilizadas.

Quando o pacote estiver próximo do fim, deve surgir um alerta.

---

# 8. Agenda

A agenda faz parte do MVP.

Não deve tentar substituir completamente Google Calendar.

Sua função é administrar as aulas dentro do SaaS.

O professor deve conseguir:

* visualizar aulas do dia;
* visualizar aulas da semana;
* criar uma aula;
* criar aula recorrente;
* remarcar;
* cancelar;
* marcar como realizada;
* registrar necessidade de reposição.

Exemplo:

TERÇA-FEIRA

14:00 — Lucas — Inglês

[Realizada]

[Cancelar]

[Remarcar]

---

# 9. Recorrência

Recurso essencial.

Exemplo:

Lucas possui aulas:

terça às 14h;

quinta às 14h.

O professor não deve cadastrar manualmente cada aula.

O sistema deve permitir cadastrar uma recorrência.

---

# 10. Status das aulas

Inicialmente:

* agendada;
* realizada;
* cancelada;
* reposição pendente;
* reposta.

Uma aula realizada deve atualizar automaticamente as informações necessárias do aluno.

Exemplo:

Aula realizada

→ histórico atualizado;

→ pacote reduzido, quando aplicável;

→ financeiro atualizado, quando aplicável;

→ dashboard atualizado.

---

# 11. Reposições

Quando uma aula for cancelada, o professor poderá informar se precisa de reposição.

Exemplo:

Carlos

Aula cancelada.

Necessita reposição: SIM.

O dashboard deverá mostrar:

“Carlos possui uma reposição pendente.”

Depois de remarcar e realizar a reposição, o alerta desaparece.

---

# 12. Financeiro

O sistema NÃO será um software contábil.

Ele precisa responder apenas perguntas operacionais simples.

Exemplos:

Quanto recebi?

Quanto tenho para receber?

Quem ainda não pagou?

Tela financeira:

AGOSTO

Recebido: R$4.850

A receber: R$920

Lucas — R$560 — Pago

Mariana — R$300 — Pendente

Carlos — R$300 — Pendente

O professor poderá marcar manualmente um pagamento como recebido.

---

# 13. Cobrança via WhatsApp

Inicialmente NÃO utilizar API oficial do WhatsApp.

O sistema poderá gerar uma mensagem e abrir o WhatsApp do professor.

Exemplo:

“Olá, Mariana! Passando para lembrar que o pagamento das aulas de agosto, no valor de R$300, está pendente.”

Opcionalmente poderá incluir a chave Pix cadastrada pelo professor.

---

# 14. Alertas

O dashboard deve possuir uma área chamada algo semelhante a:

“Precisa de atenção”.

Exemplos:

3 pagamentos pendentes — R$920

2 reposições pendentes

1 pacote terminando

A intenção é o professor abrir o sistema e imediatamente saber o que precisa resolver.

---

# 15. Onboarding

O primeiro acesso precisa ser extremamente simples.

Objetivo:

o professor deve conseguir perceber valor no produto em poucos minutos.

Fluxo inicial sugerido:

1. Nome do professor.
2. O que ele ensina.
3. Cadastro do primeiro aluno.
4. Modelo de cobrança.
5. Valor.
6. Dias e horários das aulas.
7. Abrir dashboard já preenchido.

Evitar dashboard completamente vazio.

---

# 16. Plano comercial inicial

Hipótese inicial:

14 dias grátis.

Não exigir cartão no teste inicialmente.

Depois:

PRO — R$29,90/mês.

Um único plano.

O preço poderá mudar após validação comercial.

---

# 17. Landing page

Mensagem principal sugerida:

## Suas aulas em ordem. Seu dinheiro também.

Gerencie alunos, aulas, pagamentos e reposições sem depender de planilhas.

CTA:

TESTAR GRÁTIS POR 14 DIAS

A landing page deve utilizar imagens reais do produto.

---

# 18. Estratégia comercial inicial

Depois do MVP pronto:

1. colocar o sistema em produção;
2. criar landing page;
3. preparar checkout;
4. gravar demonstrações reais do produto;
5. criar vídeos curtos para Instagram;
6. anunciar para professores particulares;
7. acompanhar cadastros;
8. conversar com usuários;
9. melhorar pontos de abandono;
10. buscar a primeira assinatura paga.

---

# 19. O que NÃO faz parte do MVP

Não implementar sem autorização explícita:

* aplicativo Android nativo;
* aplicativo iOS nativo;
* videoconferência;
* plataforma de cursos;
* exercícios para alunos;
* chat interno;
* armazenamento avançado de materiais;
* IA ensinando alunos;
* marketplace de professores;
* emissão de nota fiscal;
* sistema contábil;
* folha de pagamento;
* múltiplos funcionários;
* gestão de escolas;
* gestão complexa de turmas;
* API oficial do WhatsApp;
* integração com Zoom;
* integração com Google Meet;
* integração com Google Classroom;
* integração com Outlook;
* integração com Google Calendar;
* sincronização bidirecional com calendários externos.

Esses recursos só deverão ser considerados após feedback de usuários reais.

---

# 20. Princípios de desenvolvimento

1. O produto deve ser simples.
2. Priorizar experiência mobile.
3. Poucos cliques para ações frequentes.
4. Não adicionar funcionalidades apenas porque são tecnicamente interessantes.
5. Toda funcionalidade deve estar ligada diretamente a uma dor do professor.
6. Preferir soluções simples antes de integrações complexas.
7. O MVP precisa ser vendável, não perfeito.
8. Segurança e isolamento dos dados de cada usuário são obrigatórios.
9. O sistema deve estar preparado para ser SaaS multiusuário.
10. Não alterar o escopo do MVP sem autorização.

---

# 21. Stack preferencial inicial

Frontend:

* Next.js;
* TypeScript;
* Tailwind CSS;
* shadcn/ui.

Backend e banco:

* Supabase;
* PostgreSQL;
* Supabase Auth.

Deploy:

* Vercel.

Pagamentos:

A decidir posteriormente entre soluções adequadas ao mercado brasileiro.

Não implementar pagamentos nesta primeira etapa.

---

# 22. Primeira métrica de sucesso

A métrica mais importante inicialmente NÃO é:

* número de funcionalidades;
* número de commits;
* quantidade de código;
* visualizações do site.

É:

## PRIMEIRA ASSINATURA PAGA.

Até isso acontecer, o projeto deve permanecer enxuto e orientado à validação.
