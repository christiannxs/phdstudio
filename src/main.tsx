import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

const rootEl = document.getElementById("root");
if (!rootEl) {
  throw new Error('Elemento "#root" não encontrado no HTML.');
}

function ConfigMissing() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-6">
      <div className="max-w-md text-center space-y-3 rounded-lg border border-border bg-card p-6 shadow-lg">
        <h1 className="text-lg font-semibold text-primary">Configuração incompleta</h1>
        <p className="text-sm text-muted-foreground">
          Crie um arquivo <code className="rounded bg-muted px-1 py-0.5 text-foreground">.env</code> na raiz do projeto
          com as variáveis:
        </p>
        <pre className="text-left text-xs bg-muted/50 rounded-md p-3 overflow-x-auto text-foreground">
          {`VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sua-chave-anon`}
        </pre>
        <p className="text-xs text-muted-foreground">Reinicie o servidor (<kbd className="rounded bg-muted px-1">npm run dev</kbd>) após salvar.</p>
      </div>
    </div>
  );
}

function Root() {
  const url = import.meta.env.VITE_SUPABASE_URL?.trim();
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!url || !key) {
    return <ConfigMissing />;
  }
  return <App />;
}

createRoot(rootEl).render(<Root />);
