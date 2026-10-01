// Test manuel du matcher : une ligne = un segment de transcription.
// Une ligne vide simule un long silence (nouveau passage).
import { Button } from '../src/components/atoms/Button.js';
import { Badge } from '../src/components/atoms/Badge.js';
import { Spinner } from '../src/components/atoms/Spinner.js';
import { Text } from '../src/components/atoms/Text.js';
import { analyze, MIN_CONFIDENCE, MAX_SILENCE_SEC } from '../src/services/matcher.js';

const SEGMENT_SEC = 8;
const EXAMPLES = {
  'Fatiha déformée': `الله اكبر
بسم الله الرحمان الرحيم الحمد لله رب العالمين
الرحمن الرحيم ملك يوم الدين اياك نعبد واياك نستعين
اهدنا الصراط المستقيم صراط اللذين انعمت عليهم غير المغضوب عليهم ولا الضالين
امين`,
  'Kursi avec trou': `الله لا اله الا هو الحي القيوم لا تاخذه سنه ولا نوم
من ذا الذي يشفع عنده الا باذنه يعلم ما بين ايديهم
الله ولي الذين امنوا يخرجهم من الظلمات الى النور`,
  'Rahman (refrain)': `فباي الاء ربكما تكذبان
خلق الانسان من صلصال كالفخار
وخلق الجان من مارج من نار
فباي الاء ربكما تكذبان`,
  'Deux rakaat': `بسم الله الرحمن الرحيم قل هو الله احد الله الصمد
لم يلد ولم يولد ولم يكن له كفوا احد

بسم الله الرحمن الرحيم قل اعوذ برب الفلق من شر ما خلق
ومن شر غاسق اذا وقب ومن شر النفاسات في العقد`,
};

const root = document.getElementById('demo');
const input = document.createElement('textarea');
input.className = 'dev__textarea text--arabic';
input.dir = 'rtl';
input.lang = 'ar';
input.placeholder = 'Une ligne par segment…';

const output = document.createElement('div');
output.className = 'dev__stack dev__log';

// Lignes → segments horodatés ; une ligne vide = silence plus long que le seuil.
function toSegments(text) {
  const segments = [];
  let t = 0;
  for (const line of text.split('\n')) {
    if (!line.trim()) {
      t += MAX_SILENCE_SEC + 1;
      continue;
    }
    segments.push({ start: t, end: t + SEGMENT_SEC, text: line.trim() });
    t += SEGMENT_SEC + 1;
  }
  return segments;
}

async function run() {
  output.replaceChildren(Spinner());
  const t0 = performance.now();
  const { passages, details } = await analyze(toSegments(input.value));
  const ms = Math.round(performance.now() - t0);

  const passageRows = passages.length
    ? passages.map((p) =>
        Text({ text: `Sourate ${p.surah}, versets ${p.fromAyah}–${p.toAyah} · confiance ${p.confidence}`, variant: 'title' }),
      )
    : [Text({ text: 'Aucun passage reconnu.', tone: 'muted' })];

  const detailRows = details.map((d) => {
    const row = document.createElement('div');
    row.className = 'dev__entry';
    row.append(
      d.best
        ? Badge({ text: `${d.best.ref} · ${d.best.score.toFixed(2)}`, tone: 'success' })
        : Badge({ text: 'ignoré', tone: 'neutral' }),
      Text({ text: d.segment.text, variant: 'arabic' }),
    );
    return row;
  });

  output.replaceChildren(
    Text({ text: `Passages (${ms} ms, seuil ${MIN_CONFIDENCE})`, variant: 'label', tone: 'faint' }),
    ...passageRows,
    Text({ text: 'Segments', variant: 'label', tone: 'faint' }),
    ...detailRows,
  );
}

const examples = document.createElement('div');
examples.className = 'dev__row';
for (const [name, text] of Object.entries(EXAMPLES)) {
  examples.append(
    Button({
      label: name,
      variant: 'secondary',
      onClick: () => {
        input.value = text;
        run();
      },
    }),
  );
}

const panel = document.createElement('div');
panel.className = 'dev__stack';
panel.append(
  Text({ text: 'Matcher', variant: 'display' }),
  Text({ text: 'Une ligne = un segment. Ligne vide = long silence.', variant: 'small', tone: 'muted' }),
  examples,
  input,
  Button({ label: 'Analyser', block: true, onClick: run }),
);
root.append(panel, output);
