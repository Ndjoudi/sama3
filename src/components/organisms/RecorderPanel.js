import { RecordButton } from '../molecules/RecordButton.js';
import { Timer } from '../molecules/Timer.js';
import { LevelMeter } from '../molecules/LevelMeter.js';
import { StatusBanner } from '../molecules/StatusBanner.js';
import { Text } from '../atoms/Text.js';
import { labels } from '../../labels.js';

const HINT = {
  idle: labels.record.hintIdle,
  starting: labels.record.hintIdle,
  recording: labels.record.hintRecording,
  saving: labels.record.hintSaving,
};

// state : idle | starting | recording | saving
// levels : niveaux sonores récents (0 à 1) pour la jauge en direct
// banner : { tone, title, message } | null — erreur ou information après un arrêt
export function RecorderPanel({ state = 'idle', seconds = 0, levels = [], banner = null, onStart, onStop, onDismissBanner }) {
  const el = document.createElement('section');
  el.className = `recorder recorder--${state}`;

  const center = document.createElement('div');
  center.className = 'recorder__center';
  center.append(
    Timer({ seconds, active: state === 'recording' }),
    LevelMeter({ levels, active: state === 'recording' }),
    RecordButton({ state, onStart, onStop }),
    Text({ text: HINT[state], variant: 'small', tone: 'muted' }),
  );

  el.append(center);
  if (banner && state !== 'recording') {
    el.append(StatusBanner({ ...banner, actionLabel: labels.dismiss, onAction: onDismissBanner }));
  }
  return el;
}
