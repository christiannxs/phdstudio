# PHD Studio

## Banco de dados: Supabase

Este projeto usa **Supabase** como backend (PostgreSQL, autenticação e armazenamento de arquivos).

### Passo a passo para deixar o sistema funcional

1. **Instalar dependências**:
   ```sh
   npm i
   ```

2. **Configurar o Supabase**:
   - Crie um projeto em [Supabase](https://supabase.com).
   - No dashboard: **Project Settings** → **API** → anote a **URL** e a chave **anon public**.
   - Rode as migrações em `supabase/migrations/` (via Supabase CLI ou pelo SQL Editor no dashboard).

3. **Variáveis de ambiente**:
   - Crie um arquivo `.env` na raiz com:
   ```env
   VITE_SUPABASE_URL=https://seu-projeto.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=sua-chave-anon-public
   ```

4. **Subir o app**:
   ```sh
   npm run dev
   ```

5. **Primeiro uso (setup único)**:
   - Na primeira vez você verá a tela de **Configuração inicial**.
   - Crie a **conta do administrador** (nome, e-mail, senha).
   - Depois, faça login com o admin e use **Gerenciar usuários** no Dashboard para cadastrar atendentes, admins e produtores.

6. **Deploy no Vercel (contas já existentes)**:
   - Se você fez deploy e as contas já foram criadas em outro ambiente, a app pode ainda mostrar a tela de "Configuração inicial".
   - Isso acontece porque o status do setup fica na tabela `app_config` do Supabase. No projeto Supabase que a Vercel usa, essa chave pode não existir.
   - **Solução**: no Dashboard do Supabase (o mesmo projeto cuja URL/anon key estão nas variáveis de ambiente da Vercel), abra o **SQL Editor** e execute o conteúdo do arquivo `supabase/mark-setup-complete.sql`. Assim a app passa a redirecionar para login em vez do setup.

### O que o Supabase fornece

- **Auth**: login/cadastro com e-mail e senha (Supabase Auth).
- **Tabelas**: `profiles`, `user_roles`, `demands`, `demand_deliverables`, `app_config`.
- **Storage**: bucket `demand-files` para upload/download de entregas (arquivos de áudio).

### Comandos úteis

| Comando | Descrição |
|--------|-----------|
| `npm run dev` | Sobe o frontend (Vite). |

---

## Desenvolvimento local

Instale as dependências, configure o `.env` conforme acima e execute `npm run dev`.

## Stack

- Vite
- TypeScript
- React
- Supabase (PostgreSQL, Auth, Storage)
- shadcn-ui
- Tailwind CSS
