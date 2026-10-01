import { PassageHeader } from '../molecules/PassageHeader.js';
import { EmptyState } from '../molecules/EmptyState.js';
import { PassageList } from '../organisms/PassageList.js';
import { VerseDetail } from '../organisms/VerseDetail.js';
import { Spinner } from '../atoms/Spinner.js';
import * as store from '../../services/store.js';
import * as quranContent from '../../services/quranContent.js';
import { labels } from '../../labels.js';

// Résultat d'une prière. Sans `surah`/`ayah` : liste des passages ; avec : détail du verset.
// Retourne { el, destroy }.
export function ResultScreen({ sessionId, surah, ayah, navigate }) {
  const el = document.createElement('div');
  el.className = 'screen screen--result';
  let alive = true;

  const listHash = `#/result/${encodeURIComponent(sessionId)}`;
  const session = store.getSession(sessionId);

  function loading() {
    const box = document.createElement('div');
    box.className = 'screen__loading';
    box.append(Spinner({ size: 'lg' }));
    return box;
  }

  function failed() {
    return EmptyState({ icon: 'network', title: labels.result.loadFailedTitle, message: labels.result.loadFailedMessage });
  }

  async function showList() {
    const header = PassageHeader({
      label: session.label,
      createdAt: session.createdAt,
      durationSec: session.durationSec,
      passageCount: session.passages.length,
      onBack: () => navigate('#/history'),
    });
    if (!session.passages.length) {
      el.replaceChildren(header, EmptyState({ icon: 'mic', title: labels.result.emptyTitle, message: labels.result.emptyMessage }));
      return;
    }
    el.replaceChildren(header, loading());
    try {
      const [chapters, verseLists] = await Promise.all([
        quranContent.getChapters(),
        Promise.all(session.passages.map((p) => quranContent.getPassageVerses(p))),
      ]);
      if (!alive) return;
      const passages = session.passages.map((p, i) => ({
        ...p,
        name: chapters?.[p.surah]?.name,
        meaning: chapters?.[p.surah]?.meaning,
        verses: verseLists[i],
      }));
      el.replaceChildren(
        header,
        PassageList({
          passages,
          onSelectVerse: (v) => navigate(`${listHash}/${v.surah}/${v.ayah}`),
        }),
      );
    } catch {
      if (alive) el.replaceChildren(header, failed());
    }
  }

  async function showVerse() {
    el.replaceChildren(loading());
    let detail, chapters;
    try {
      [detail, chapters] = await Promise.all([quranContent.getVerseDetail(surah, ayah), quranContent.getChapters()]);
    } catch {
      if (alive) el.replaceChildren(failed());
      return;
    }
    let tab = 'arabic';
    const render = () => {
      el.replaceChildren(
        VerseDetail({
          ...detail,
          name: chapters?.[surah]?.name,
          tab,
          onTabChange: (next) => {
            tab = next;
            render();
            el.querySelector('.tabs__tab--active')?.focus();
          },
          onBack: () => navigate(listHash),
        }),
      );
    };
    if (alive) render();
  }

  if (!session) {
    el.append(
      EmptyState({
        icon: 'error',
        title: labels.result.notFoundTitle,
        message: labels.result.notFoundMessage,
        actionLabel: labels.result.back,
        onAction: () => navigate('#/history'),
      }),
    );
  } else if (surah && ayah) showVerse();
  else showList();

  return {
    el,
    destroy() {
      alive = false;
    },
  };
}
