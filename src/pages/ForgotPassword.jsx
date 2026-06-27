import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Mail, ArrowLeft } from 'lucide-react';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try { await base44.auth.resetPasswordRequest(email); } catch {}
    setSent(true);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">🔐</div>
          <h1 className="text-3xl font-space font-bold">Recuperar contraseña</h1>
        </div>
        <div className="bg-card border border-border rounded-2xl p-6 shadow-lg">
          {!sent ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">Ingresa tu email y te enviaremos un enlace para restablecer tu contraseña.</p>
              <div>
                <Label>Email</Label>
                <div className="relative mt-1">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="tu@email.com" className="pl-10 rounded-xl" required />
                </div>
              </div>
              <Button type="submit" className="w-full py-5 rounded-xl" disabled={loading}>
                {loading ? <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : "Enviar enlace"}
              </Button>
            </form>
          ) : (
            <div className="text-center py-4">
              <div className="text-4xl mb-4">✉️</div>
              <p className="text-sm text-muted-foreground">Si el email está registrado, recibirás un enlace para restablecer tu contraseña.</p>
            </div>
          )}
          <Link to="/sign-in" className="flex items-center justify-center gap-2 mt-4 text-sm text-primary hover:underline">
            <ArrowLeft className="h-4 w-4" /> Volver a iniciar sesión
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
