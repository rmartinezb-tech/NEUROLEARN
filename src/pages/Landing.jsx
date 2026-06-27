import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Sparkles, BookOpen, Brain, Trophy, Users, ArrowRight } from 'lucide-react';

export default function Landing() {
  const [userCount, setUserCount] = useState(0);

  useEffect(() => {
    async function loadCount() {
      try {
        const users = await base44.entities.UserProfile.list();
        setUserCount(users.length);
      } catch { setUserCount(0); }
    }
    loadCount();
  }, []);

  const features = [
    { icon: Brain, title: "Motor Anki SM-2", desc: "Repetición espaciada científica" },
    { icon: Trophy, title: "Duelos y Torneos", desc: "Compite con otros estudiantes" },
    { icon: Sparkles, title: "IA Adaptativa", desc: "Preguntas generadas por IA" },
    { icon: Users, title: "Colaborativo", desc: "Salas de estudio grupal" },
  ];

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-accent/5 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/3 blur-3xl" />
      </div>

      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4">
        {/* User counter */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="absolute top-6 right-6 bg-card/80 backdrop-blur-md border border-border rounded-full px-4 py-2 text-sm text-muted-foreground"
        >
          <span className="font-semibold text-primary">{userCount}</span>/40 perfiles registrados
        </motion.div>

        {/* Main hero */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, type: "spring" }}
          className="text-center mb-8"
        >
          <div className="text-8xl md:text-9xl animate-float cursor-pointer select-none mb-6 inline-block hover:animate-glow transition-all">
            🧠
          </div>
          <h1 className="text-5xl md:text-7xl font-space font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent mb-4">
            NeuroLearn Pro
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-lg mx-auto leading-relaxed">
            Plataforma de estudio adaptativo con IA, gamificación y motor Anki
          </p>
        </motion.div>

        {/* Auth buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex flex-col sm:flex-row gap-4 mb-16"
        >
          <Link to="/register">
            <Button size="lg" className="text-lg px-8 py-6 rounded-xl bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25 transition-all hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5">
              <Sparkles className="mr-2 h-5 w-5" />
              Registrar sesión
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
          <Link to="/sign-in">
            <Button size="lg" variant="outline" className="text-lg px-8 py-6 rounded-xl border-2 hover:bg-primary/5 transition-all hover:-translate-y-0.5">
              <BookOpen className="mr-2 h-5 w-5" />
              Iniciar sesión
            </Button>
          </Link>
        </motion.div>

        {/* Feature cards */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl w-full"
        >
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 + i * 0.1 }}
              className="bg-card/60 backdrop-blur-sm border border-border/50 rounded-xl p-4 text-center hover:border-primary/30 hover:bg-card/80 transition-all cursor-default group"
            >
              <f.icon className="h-8 w-8 mx-auto mb-2 text-primary group-hover:text-accent transition-colors" />
              <h3 className="font-semibold text-sm mb-1">{f.title}</h3>
              <p className="text-xs text-muted-foreground">{f.desc}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* Footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="absolute bottom-6 text-xs text-muted-foreground/50"
        >
          Versión 3.0 — Estudio adaptativo impulsado por ciencia cognitiva
        </motion.p>
      </div>
    </div>
  );
}
