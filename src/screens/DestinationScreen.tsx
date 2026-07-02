import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { searchPlaces, hasGeocoder, type Place } from '../lib/geocoding';
import { hasMap } from '../lib/mapStyle';
import {
  useDestination,
  sameSpot,
  type Destination,
} from '../store/destinationStore';
import { useLocation } from '../store/locationStore';
import { useSettings } from '../store/settingsStore';
import { t } from '../lib/i18n';

// 地図（maplibre-gl）は目的地選択を開いたときだけ読み込む。
// コンパス本体はオフライン動作のため初期バンドルに含めない。
const MapPickerScreen = lazy(() =>
  import('./MapPickerScreen').then((m) => ({ default: m.MapPickerScreen }))
);

interface Props {
  onDone: () => void;
}

export function DestinationScreen({ onDone }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Place[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [mapOpen, setMapOpen] = useState(false);
  const setDestination = useDestination((s) => s.setDestination);
  const history = useDestination((s) => s.history);
  const favorites = useDestination((s) => s.favorites);
  const toggleFavorite = useDestination((s) => s.toggleFavorite);
  const fix = useLocation((s) => s.fix);
  const lang = useSettings((s) => s.lang);
  const abortRef = useRef<AbortController | null>(null);

  const isFav = (d: Destination | Place) =>
    favorites.some((f) => sameSpot(f, d));

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    if (!hasGeocoder()) return;
    const ctrl = new AbortController();
    abortRef.current?.abort();
    abortRef.current = ctrl;
    const timer = setTimeout(async () => {
      try {
        const r = await searchPlaces(query, fix ?? undefined, ctrl.signal);
        setResults(r);
        setError(null);
      } catch (e) {
        if ((e as Error).name !== 'AbortError') setError(String(e));
      }
    }, 250);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [query, fix]);

  const choose = (d: Destination | Place) => {
    setDestination(d);
    onDone();
  };

  if (mapOpen) {
    return (
      <Suspense fallback={<div className="sheet" />}>
        <MapPickerScreen onDone={onDone} onBack={() => setMapOpen(false)} />
      </Suspense>
    );
  }

  return (
    <div className="sheet">
      <div className="sheet__head">
        <button className="btn-ghost" onClick={onDone}>
          ‹ {t('back', lang)}
        </button>
        <div className="sheet__title">{t('setDestination', lang)}</div>
      </div>

      <input
        className="search-input"
        placeholder={t('searchPlaceholder', lang)}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        autoFocus
        enterKeyHint="search"
      />

      {hasMap() && (
        <button className="btn-outline map-open" onClick={() => setMapOpen(true)}>
          <MapGlyph />
          {t('chooseOnMap', lang)}
        </button>
      )}

      {!hasGeocoder() && <div className="notice">{t('noGeocoder', lang)}</div>}
      {error && <div className="notice">{error}</div>}

      {results.length > 0 ? (
        <ul className="results">
          {results.map((r) => (
            <li key={r.id} className="result">
              <button className="result__main" onClick={() => choose(r)}>
                <span className="result__name">{r.name}</span>
                {r.context && <span className="result__ctx">{r.context}</span>}
              </button>
              <StarButton
                on={isFav(r)}
                lang={lang}
                onClick={() => toggleFavorite(r)}
              />
            </li>
          ))}
        </ul>
      ) : (
        <div className="results">
          {favorites.length > 0 && (
            <>
              <div className="section-label">{t('favorites', lang)}</div>
              <ul className="results__list">
                {favorites.map((f, i) => (
                  <li key={`fav-${f.lat},${f.lon},${i}`} className="result">
                    <button className="result__main" onClick={() => choose(f)}>
                      <span className="result__name">{f.name}</span>
                      <span className="result__ctx">
                        {f.lat.toFixed(4)}, {f.lon.toFixed(4)}
                      </span>
                    </button>
                    <StarButton on lang={lang} onClick={() => toggleFavorite(f)} />
                  </li>
                ))}
              </ul>
            </>
          )}

          {history.filter((h) => !isFav(h)).length > 0 && (
            <>
              <div className="section-label">{t('history', lang)}</div>
              <ul className="results__list">
                {history
                  .filter((h) => !isFav(h))
                  .map((h, i) => (
                    <li key={`his-${h.lat},${h.lon},${i}`} className="result">
                      <button className="result__main" onClick={() => choose(h)}>
                        <span className="result__name">{h.name}</span>
                        <span className="result__ctx">
                          {h.lat.toFixed(4)}, {h.lon.toFixed(4)}
                        </span>
                      </button>
                      <StarButton
                        on={false}
                        lang={lang}
                        onClick={() => toggleFavorite(h)}
                      />
                    </li>
                  ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function StarButton({
  on,
  lang,
  onClick,
}: {
  on: boolean;
  lang: 'ja' | 'en';
  onClick: () => void;
}) {
  return (
    <button
      className="star-btn"
      data-on={on}
      aria-label={t(on ? 'removeFavorite' : 'addFavorite', lang)}
      aria-pressed={on}
      onClick={onClick}
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill={on ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.6">
        <path d="M12 3.5l2.6 5.27 5.82.85-4.21 4.1.99 5.79L12 16.77l-5.2 2.73.99-5.79-4.21-4.1 5.82-.85z" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

function MapGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M12 21c4-5 7-8.5 7-12a7 7 0 0 0-14 0c0 3.5 3 7 7 12z" strokeLinejoin="round" />
      <circle cx="12" cy="9" r="2.5" />
    </svg>
  );
}
