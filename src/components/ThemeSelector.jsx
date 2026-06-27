import { useState } from 'react';
import { THEMES, applyTheme } from '../utils/themes';
import { base44 } from '@/api/base44Client';

export default function ThemeSelector({ profile, onThemeChange }) {
  const [current, setCurrent] = useState(profile?.theme || 'dark');

  const handleChange = async (key) => {
    applyTheme(key);
    setCurrent(key);
    if (profile?.id) {
      await base44.entities.UserProfile.update(profile.id, { theme: key });
    }
    onThemeChange?.(key);
  };

  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold">🎨 Tema Visual</p>
      <div className="grid grid-cols-2 gap-2 max-h-80 overflow-y-auto">
        {Object.entries(THEMES).map(([key, theme]) => (
          <button
            key={key}
            onClick={() => handleChange(key)}
            className={`flex items-center gap-2 p-3 rounded-xl border-2 text-left transition-all text-sm ${
              current === key ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'
            }`}
          >
            <span className="text-xl">{theme.emoji}</span>
            <span className="font-medium text-xs">{theme.name}</span>
            {current === key && <span className="ml-auto text-primary">✓</span>}
          </button>
        ))}
      </div>
    </div>
  );
}
