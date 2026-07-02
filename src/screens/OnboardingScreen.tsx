import { useState } from 'react';
import { useHeading } from '../store/headingStore';
import { useLocation } from '../store/locationStore';
import { useSettings } from '../store/settingsStore';
import { t } from '../lib/i18n';

interface Props {
  onGranted: () => void;
}

// iOS では DeviceOrientation の requestPermission を「ユーザー操作起点」で呼ぶ必要がある。
export function OnboardingScreen({ onGranted }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const requestHeading = useHeading((s) => s.request);
  const requestLocation = useLocation((s) => s.request);
  const lang = useSettings((s) => s.lang);
  const setLang = useSettings((s) => s.setLang);

  const start = async () => {
    setBusy(true);
    setError(null);
    // モーション（方位）は必ずタップ起点で
    const h = await requestHeading();
    const l = await requestLocation();
    setBusy(false);
    if (h === 'denied' || l === 'denied') {
      setError(t('permissionDenied', lang));
      return;
    }
    onGranted();
  };

  return (
    <div className="onboard">
      {/* 海外からの旅行者がまず英語へ切り替えられるよう、言語スイッチを最上部に */}
      <div className="onboard__lang">
        <button
          className="lang-toggle"
          data-active={lang === 'ja'}
          onClick={() => setLang('ja')}
        >
          日本語
        </button>
        <button
          className="lang-toggle"
          data-active={lang === 'en'}
          onClick={() => setLang('en')}
        >
          English
        </button>
      </div>

      <div className="onboard__center">
        <img
          className="onboard__icon"
          src={`${import.meta.env.BASE_URL}icon.svg`}
          alt="朱 Ake"
        />
        <div className="onboard__welcome">{t('welcomeTitle', lang)}</div>
        <div className="onboard__title">{t('onboardTitle', lang)}</div>
        <p className="onboard__body">{t('welcomeBody', lang)}</p>
      </div>

      <div className="onboard__foot">
        <button className="btn-primary" onClick={start} disabled={busy}>
          {t('welcomeContinue', lang)}
        </button>
        <div className="onboard__error">{error}</div>
      </div>
    </div>
  );
}
