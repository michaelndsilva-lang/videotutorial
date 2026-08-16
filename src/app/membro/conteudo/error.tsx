"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function ConteudoError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <Card className="max-w-md">
      <CardContent className="flex flex-col items-start gap-3 pt-6">
        <div className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="size-5" />
          <p className="font-medium">Algo deu errado no motor de conteúdo</p>
        </div>
        <p className="text-sm text-muted-foreground">Tente de novo. Se continuar acontecendo, avise o admin.</p>
        <Button onClick={() => reset()} variant="outline">
          Tentar de novo
        </Button>
      </CardContent>
    </Card>
  );
}
