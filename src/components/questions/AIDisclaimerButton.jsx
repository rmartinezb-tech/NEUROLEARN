import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertTriangle } from 'lucide-react';

export default function AIDisclaimerButton({ variant = 'outline', size = 'default', className = '' }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant={variant} size={size} onClick={() => setOpen(true)} className={`gap-2 rounded-xl text-amber-600 border-amber-400/60 hover:bg-amber-50 dark:hover:bg-amber-950/30 ${className}`}>
        <AlertTriangle className="h-4 w-4" />
        Aviso importante
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              Antes de importar estas preguntas
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 text-sm text-foreground/90 leading-relaxed">
            <p>
              Las preguntas generadas por esta herramienta han sido creadas total o parcialmente mediante
              Inteligencia Artificial (IA). Aunque la IA puede ser de gran ayuda para crear material de
              estudio, <strong>también puede cometer errores</strong>, generar preguntas con información
              incorrecta, desactualizada, poco clara o incluso proponer respuestas equivocadas.
            </p>

            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-300/60 rounded-xl p-4">
              <p className="font-semibold text-amber-700 dark:text-amber-400 mb-1">
                Por favor, revisa cuidadosamente todas las preguntas antes de utilizarlas.
              </p>
              <p className="text-amber-700/80 dark:text-amber-400/80 text-xs">
                Verifica que el contenido sea correcto, que las respuestas sean adecuadas y que la
                información esté respaldada por fuentes confiables y actualizadas. La responsabilidad
                de validar el material antes de incorporarlo a una sesión de estudio recae en quien lo
                utiliza.
              </p>
            </div>

            <p>
              Esta herramienta busca ayudarte a ahorrar tiempo en la creación de contenido, pero{' '}
              <strong>no reemplaza el criterio académico ni el juicio profesional</strong>. El
              desarrollador de la plataforma no se hace responsable por errores, omisiones o las
              consecuencias derivadas del uso de preguntas generadas por IA.
            </p>

            <div className="border-t border-border pt-4">
              <p className="text-muted-foreground italic text-xs">
                En salud, el pensamiento crítico es tan importante como el conocimiento. La IA puede
                ser un excelente apoyo para aprender, pero nunca debe sustituir la revisión de la
                evidencia ni el análisis humano. Úsala como una herramienta que complementa tu
                trabajo, no como una fuente infalible de información.
              </p>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button onClick={() => setOpen(false)} className="rounded-xl">Entendido</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
