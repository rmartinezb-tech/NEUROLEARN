import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Play, Brain } from 'lucide-react';
import StudyEngine from './StudyEngine';
import { NumericInput, DurationBadge, SubjectToggle, TypeToggle, COGNITIVE_SKILLS } from './SessionConfigHelpers';

function useSkillCounts(selectedSkills, subjects, types) {
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(false);
  const timer = useRef(null);

  useEffect(() => {
    clearTimeout(timer.current);
    if (selectedSkills.length === 0) { setCounts({}); return; }
    setLoading(true);
    timer.current = setTimeout(async () => {
      try {
        let qs = await base44.entities.Question.list('-created_date', 1000);
        qs = qs.filter(q => (!q.status || q.status === 'active'));
        if (subjects.length > 0) qs = qs.filter(q => subjects.includes(q.subject));
        if (types.length > 0) qs = qs.filter(q => types.includes(q.type));
        const map = {};
        selectedSkills.forEach(skill => {
          map[skill] = qs.filter(q => q.cognitive_skill === skill).length;
        });
        setCounts(map);
      } catch {
        setCounts({});
      } finally {
        setLoading(false);
      }
    }, 400);
    return () => clearTimeout(timer.current);
  }, [selectedSkills.join(','), subjects.join(','), types.join(',')]); // eslint-disable-line

  return { counts, loading };
}

export default function CognitiveSkillSession({ profile, onBack }) {
  const [config, setConfig] = useState({
    subjects: [], types: [], blockMinutes: 25, pauseMinutes: 5, cycles: 2, blocks: 1,
  });
  const [selectedSkills, setSelectedSkills] = useState([]);
  const [questions, setQuestions] = useState(null);
  const [loading, setLoading] = useState(false);

  const toggleSubject = (s) => setConfig(c => ({
    ...c, subjects: c.subjects.includes(s) ? c.subjects.filter(x => x !== s) : [...c.subjects, s]
  }));
  const toggleType = (t) => setConfig(c => ({
    ...c, types: c.types.includes(t) ? c.types.filter(x => x !== t) : [...c.types, t]
  }));
  const toggleSkill = (skill) => setSelectedSkills(prev =>
    prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]
  );

  const { counts: availablePerSkill, loading: countLoading } = useSkillCounts(
    selectedSkills, config.subjects, config.types
  );

  // Per-skill question count (how many to include from each skill)
  const [perSkillWanted, setPerSkillWanted] = useState({});
  const setSkillCount = (skill, n) => setPerSkillWanted(prev => ({ ...prev, [skill]: n }));

  const totalRequested = selectedSkills.reduce((sum, s) => sum + (perSkillWanted[s] || 5), 0);

  const hasEnough = selectedSkills.length > 0 && selectedSkills.every(s => {
    const wanted = perSkillWanted[s] || 5;
    const avail = availablePerSkill[s] || 0;
    return avail >= wanted;
  });

  const start = async () => {
    setLoading(true);
    let allQ = await base44.entities.Question.list('-created_date', 1000);
    allQ = allQ.filter(q => (!q.status || q.status === 'active'));
    if (config.subjects.length > 0) allQ = allQ.filter(q => config.subjects.includes(q.subject));
    if (config.types.length > 0) allQ = allQ.filter(q => config.types.includes(q.type));

    let selected = [];
    selectedSkills.forEach(skill => {
      const want = perSkillWanted[skill] || 5;
      const pool = allQ.filter(q => q.cognitive_skill === skill).sort(() => Math.random() - 0.5);
      selected.push(...pool.slice(0, want));
    });
    selected = selected.sort(() => Math.random() - 0.5);
    setQuestions(selected);
    setLoading(false);
  };

  if (questions) {
    return (
      <StudyEngine questions={questions} profile={profile} sessionType="cognitive"
        config={{ blockMinutes: config.blockMinutes, pauseMinutes: config.pauseMinutes, blocks: config.blocks, cycles: config.cycles }}
        onBack={() => setQuestions(null)} />
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-5">
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-4 w-4" /> Volver
      </button>
      <h2 className="text-xl font-bold flex items-center gap-2"><Brain className="h-6 w-6 text-primary" /> Sesión de Habilidades Cognitivas</h2>
      <p className="text-sm text-muted-foreground -mt-2">
        Seleccioná las habilidades cognitivas que querés trabajar y cuántas preguntas de cada una.
      </p>

      <div className="bg-card border border-border rounded-xl p-5 space-y-5">
        {/* Cognitive skills */}
        <div>
          <label className="text-sm font-medium block mb-3">Habilidades cognitivas</label>
          <div className="grid grid-cols-2 gap-1.5">
            {COGNITIVE_SKILLS.map(skill => (
              <button key={skill} type="button" onClick={() => toggleSkill(skill)}
                className={`p-2 rounded-lg text-xs border transition-all text-left ${selectedSkills.includes(skill) ? 'border-primary bg-primary/10 font-medium' : 'border-border hover:border-muted-foreground'}`}>
                {skill}
              </button>
            ))}
          </div>
          {selectedSkills.length === 0 && (
            <p className="text-xs text-muted-foreground mt-2 text-center">Seleccioná al menos una habilidad para continuar</p>
          )}
        </div>

        {/* Per-skill count configuration */}
        {selectedSkills.length > 0 && (
          <div>
            <label className="text-sm font-medium block mb-3">Preguntas por habilidad</label>
            <div className="space-y-3">
              {selectedSkills.map(skill => {
                const avail = availablePerSkill[skill] ?? null;
                const wanted = perSkillWanted[skill] || 5;
                const enough = avail !== null && avail >= wanted;
                return (
                  <div key={skill} className={`rounded-xl p-3 border ${enough ? 'border-green-500/30 bg-green-500/5' : 'border-amber-500/30 bg-amber-500/5'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">{skill}</span>
                      {countLoading
                        ? <span className="text-xs text-muted-foreground">calculando...</span>
                        : <span className={`text-xs font-semibold ${enough ? 'text-green-600' : 'text-amber-600'}`}>
                            {avail !== null ? `${avail} disponibles` : '—'}
                          </span>}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground shrink-0">Quiero:</span>
                      <NumericInput value={wanted}
                        onChange={v => setSkillCount(skill, v)}
                        min={1} max={avail || 50} step={1} />
                    </div>
                    {!enough && avail !== null && avail > 0 && (
                      <p className="text-xs text-amber-600 mt-1">Máx. disponible: {avail}</p>
                    )}
                    {avail === 0 && (
                      <p className="text-xs text-red-500 mt-1">Sin preguntas con esta habilidad y los filtros seleccionados</p>
                    )}
                  </div>
                );
              })}
              <div className="bg-muted rounded-xl p-3 flex justify-between text-sm">
                <span className="text-muted-foreground">Total solicitado:</span>
                <span className="font-bold">{totalRequested} preguntas</span>
              </div>
            </div>
          </div>
        )}

        {/* Subjects */}
        <div>
          <label className="text-sm font-medium block mb-2">Materias <span className="text-muted-foreground font-normal">(vacío = todas)</span></label>
          <SubjectToggle subjects={config.subjects} onToggle={toggleSubject} />
        </div>

        {/* Types */}
        <div>
          <label className="text-sm font-medium block mb-2">Tipos de preguntas <span className="text-muted-foreground font-normal">(vacío = todos)</span></label>
          <TypeToggle types={config.types} onToggle={toggleType} />
        </div>

        {/* Session config */}
        <div className="grid grid-cols-1 gap-4">
          <NumericInput label="Tiempo por bloque (min)" value={config.blockMinutes}
            onChange={v => setConfig(c => ({ ...c, blockMinutes: v }))} min={5} max={120} step={5} />
          <NumericInput label="Pausa entre bloques (min)" value={config.pauseMinutes}
            onChange={v => setConfig(c => ({ ...c, pauseMinutes: v }))} min={1} max={30} step={1} />
          <NumericInput label="Ciclos por bloque" value={config.cycles}
            onChange={v => setConfig(c => ({ ...c, cycles: v }))} min={1} max={10} step={1} />
          <NumericInput label="N° de bloques" value={config.blocks}
            onChange={v => setConfig(c => ({ ...c, blocks: v }))} min={1} max={8} step={1} />
        </div>

        <DurationBadge blocks={config.blocks} blockMinutes={config.blockMinutes} pauseMinutes={config.pauseMinutes} />

        <Button onClick={start} className="w-full gap-2 py-5"
          disabled={loading || selectedSkills.length === 0 || !hasEnough || countLoading}>
          {loading
            ? <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            : selectedSkills.length === 0
              ? 'Seleccioná al menos una habilidad'
              : !hasEnough && !countLoading
                ? '⚠️ Ajustá las cantidades'
                : <><Play className="h-4 w-4" /> Iniciar sesión</>}
        </Button>
      </div>
    </div>
  );
}
