import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404: Rota inexistente acessada:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="text-center max-w-md">
        <h1 className="mb-2 text-6xl font-bold text-primary">404</h1>
        <p className="mb-2 text-lg font-medium text-foreground">Página não encontrada</p>
        <p className="mb-6 text-sm text-muted-foreground">
          O endereço que você acessou não existe. Verifique o link ou volte ao início.
        </p>
        <Button asChild>
          <Link to="/" className="gap-2">
            <Home className="h-4 w-4" />
            Ir para o início
          </Link>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
