# Boss e-business CRM

Repositório: crm-gpt-v1 — CRM construído no GPT.

Aplicação web com landing page e CRM multiempresa. Marca Boss, domínio de produção previsto `crm.allo.tec.br`. Código próprio ampliado a partir do projeto fornecido pelo cliente.

## Executar neste computador

A instalação de desenvolvimento está em funcionamento em http://127.0.0.1:3000. Crie sua conta em **Começar agora**. Não existe senha administrativa padrão. O banco local fica em `.local/postgres-v2`; preserve essa pasta se cadastrar dados.

Para retomar após reiniciar, execute `scripts/start-local.ps1` no PowerShell. O script utiliza Node/pnpm instalados ou o runtime do Codex, inicia banco, aplicação e worker, e grava os logs em `.local`. Esse modo é destinado a avaliação local. Não publique o banco PGlite na internet.

## Planos implementados

- Essencial: R$299/mês por empresa, 3 usuários ativos, 2 conexões, 7 dias de teste sem cartão.
- Ilimitado: R$599/mês por empresa, sem limite comercial de usuários/conexões. Consumo dos provedores e IA são separados; a infraestrutura continua tendo capacidade finita.
- Cada usuário pertence a uma empresa. Convites pendentes reservam vagas.
- IA usa chave da própria empresa; o operador pode habilitar uma cota de copiloto com `COPILOT_API_KEY` e `COPILOT_MONTHLY_QUOTA`.

## Implantação em produção

### Railway (caminho recomendado para a primeira homologação)

O repositório inclui `railway.json` com build via Dockerfile, migrações/seed antes do deploy e health check em `/api/health`.

Arquitetura recomendada no Railway:

- 1 serviço PostgreSQL;
- 1 serviço web usando este repositório e `railway.json`; `pnpm start` inicia o servidor standalone;
- 1 serviço worker usando o mesmo repositório, com Config File Path `/railway.worker.json` (sem health check HTTP). Não sobrescreva apenas o Start Command: o `railway.json` da aplicação teria precedência;
- as mesmas variáveis de aplicação nos serviços web e worker, especialmente `DATABASE_URL`, `AUTH_SECRET`, `ENCRYPTION_KEY`, `APP_URL` e credenciais dos provedores habilitados.

Antes de liberar clientes, aponte `crm.allo.tec.br` para o domínio público do serviço web, atualize `APP_URL=https://crm.allo.tec.br` e confirme `/api/health` retornando HTTP 200.

Primeiro valide em um domínio temporário Railway com `APP_URL` igual à URL HTTPS desse domínio, `AUTH_TRUST_HOST=true`, `DATABASE_URL` apontando para o PostgreSQL persistente e chaves `AUTH_SECRET`/`ENCRYPTION_KEY` novas e iguais no web e worker. Não reutilize o banco nem as chaves locais. O seed cria somente planos, não usuários ou dados de demonstração.

`pnpm build` inclui logo, widget, CSS e JavaScript na saída standalone. Para uma porta local diferente, configure `PORT`, `BIND_HOST=127.0.0.1` e `APP_URL` com a URL exata e execute `node --env-file=.env scripts/start-production.mjs`. A suíte HTTP aceita `TEST_BASE_URL` e cria empresas de QA: execute apenas em homologação. O banco de produção deve ter volume e backup configurados; integrações externas dependem das respectivas credenciais.

### Servidor Linux próprio

1. Servidor Linux com Docker Compose, DNS de `crm.allo.tec.br` apontando para ele e portas 80/443 disponíveis. Hospedagem não foi contratada e o DNS não foi alterado.
2. Copie `.env.example` para `.env`. Gere **duas chaves diferentes** com `openssl rand -hex 32` para AUTH_SECRET e ENCRYPTION_KEY. Defina a senha do PostgreSQL tanto em POSTGRES_PASSWORD quanto em DATABASE_URL. Guarde backup da ENCRYPTION_KEY: sem ela, credenciais salvas não podem ser lidas.
3. Execute `docker compose up -d --build`. O serviço migrate aplica o esquema e os planos; app e worker só iniciam depois. Caddy solicita HTTPS para o domínio.
4. Cadastre a conta do operador. Execute `docker compose exec app pnpm exec tsx scripts/bootstrap-admin.ts EMAIL_DO_OPERADOR` e entre novamente. Isso concede acesso global; use apenas para o proprietário da plataforma.
5. Faça backup diário: `docker compose exec -T db pg_dump -U boss boss > backup.sql`. Guarde os backups criptografados, fora do servidor, junto com as chaves. Teste restauração antes de operar com clientes.

O Dockerfile e o Compose foram preparados, mas **não foram executados neste Windows**, que foi validado com Node e banco local. Homologue uma instalação PostgreSQL real antes do lançamento.

## Integrações

**Asaas** é o gateway implementado. Use sandbox primeiro (`ASAAS_ENV=sandbox`). Configure ASAAS_API_KEY e ASAAS_WEBHOOK_TOKEN no servidor. Cadastre o webhook `https://crm.allo.tec.br/api/billing/webhook` com o mesmo token e eventos de pagamento. A página hospedada do Asaas é usada para pagamento; disponibilidade de cartão/Pix/boleto depende da conta e da modalidade habilitada no provedor. Só eventos conferidos na API ativam pagamento; nenhuma cobrança real foi feita durante o desenvolvimento. Stripe não foi implementado.

Em **Conexões**, cada conta tem URL de webhook e instruções específicas. Os segredos são criptografados no banco e não retornam nas consultas de listagem.

| Canal | Requisitos externos | Implementação atual |
|---|---|---|
| WhatsApp oficial | App Meta, token, número habilitado, templates aprovados | Texto, webhook assinado, janela de atendimento, template sem parâmetros |
| Evolution | Servidor e instância próprios, origem liberada no servidor | Texto, webhook e conexão de sessão/QR; conexão não oficial |
| Instagram/Messenger | App e conta Meta com permissões aprovadas | Adaptadores de texto e webhook |
| Telegram | Bot e token | Texto e webhook autenticado |
| E-mail | Resend, domínio verificado | Envio, recebimento por webhook e descadastro |
| SMS | Twilio e remetente habilitado | Texto e webhook |
| Chat do site | Código de incorporação e domínio autorizado | Conversa e mensagens persistidas |

Liberar servidores Evolution em EVOLUTION_ALLOWED_ORIGINS e destinos de webhooks em WEBHOOK_ALLOWED_ORIGINS, separados por vírgula e incluindo protocolo. Não há descoberta automática de fornecedores. Meta coexistência/Embedded Signup **não está implementado**; QR Evolution não equivale à API oficial.

Recuperação de senha depende de RESEND_API_KEY e MAIL_FROM no servidor. Chaves da IA são configuradas dentro da empresa. Agentes podem criar tarefas e transferir atendimento quando essas ações forem autorizadas na interface. Consulta à base usa busca textual; não há indexação vetorial nem upload de PDF.

## Dados e operação

PostgreSQL relacional; filtros obrigatórios por empresa, validação de referências e chaves estrangeiras compostas contra vínculos cruzados. Papéis de administrador, gestor, supervisor, vendedor, analista, financeiro e convidado. Logs de auditoria. Não foi implementado RLS no PostgreSQL; o isolamento de leitura é feito na aplicação.

O worker precisa ficar ligado para mensagens, campanhas, agentes, webhooks e automações. Usa fila persistida com bloqueio de linha. Falhas ficam registradas; não reenvia automaticamente operações ambíguas, evitando disparos duplicados. A revisão/reexecução operacional de falhas ainda exige administração técnica.

Importação e exportação CSV com mapeamento para contatos, empresas, negócios e produtos. Arquivos de até 5 MB/5.000 linhas; validação antes da gravação. Contatos são deduplicados por e-mail/telefone; produtos por código. Importação XLSX não foi implementada.

## Indicadores

- Negócios abertos: quantidade com `dealStatus=open` dentro do escopo de acesso.
- Valor em aberto: soma Decimal do valor desses negócios.
- Funil: quantidade e soma agrupadas por etapa.
- Conversas abertas: quantidade com status open/pending; aguardando atendimento: status pending. Ambos respeitam o escopo de acesso.
- Conversão: ganhos / (ganhos + perdidos), com tratamento de denominador zero, conforme os filtros do relatório.
- Propostas: soma por item de preço × quantidade × (1 − desconto/100), arredondada para centavos.
- MRR global: soma dos preços mensais das assinaturas ativas com período pago vigente; não representa caixa recebido nem lucro.

Os painéis não usam dados fictícios. A landing contém uma ilustração identificada como exemplo de fluxo comercial.

## Validação e limites da entrega

Validados: compilação de produção, TypeScript, 14 testes de domínio/segurança, 39 verificações HTTP e execução de evento → automação → tarefa no banco. Veja `tests/`. Não execute testes com clientes reais: eles geram empresas QA e o teste de worker processa a fila local.

Esta é uma versão operacional local, **não a implementação integral homologada de todos os requisitos originais**. Ainda faltam, além das credenciais e hospedagem: anexos completos na central, onboarding oficial/coexistência Meta, templates WhatsApp com parâmetros/mídia, segmentação avançada de campanhas, importação XLSX, base de conhecimento por documentos/embeddings, fluxos completos de portabilidade/eliminação de dados, recuperação operacional da fila e testes de carga/segurança em produção. Campos personalizados disponíveis para contatos, negócios, empresas e produtos.

As páginas de privacidade e termos são rascunhos de produto e precisam da identificação do controlador e revisão antes de comercialização. Não há certificação de conformidade legal.

## Comandos de desenvolvimento

Node >=20.9, pnpm. `pnpm install --frozen-lockfile`, `pnpm exec prisma generate`, `pnpm exec prisma migrate deploy`, `pnpm exec tsx scripts/seed.ts`, `pnpm dev` e, em outro processo, `pnpm worker`. Variáveis do `.env` devem ser carregadas no processo do worker (`node --env-file=.env --import tsx workers/run.ts`).

Testes: `node --env-file=.env --import tsx --test tests/core.test.ts`; aplicação ligada: `node tests/http.mjs`; execução da fila: `node --env-file=.env --import tsx tests/worker-smoke.ts`. Verificação: `pnpm check` e `pnpm build`.
