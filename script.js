(() => {
  const tabs = Array.from(document.querySelectorAll('[role="tab"][data-tab]'));
  const panels = Array.from(document.querySelectorAll('[role="tabpanel"][data-panel]'));
  const pill = document.getElementById('detectedPill');

  const byKey = (arr, key, value) => arr.find((x) => x?.dataset?.[key] === value);

  // --- Google Translate (note: attribution/branding must remain visible) ---
  window.googleTranslateElementInit = function googleTranslateElementInit() {
    // eslint-disable-next-line no-undef
    new google.translate.TranslateElement(
      {
        pageLanguage: 'ar',
        includedLanguages: 'ar,en',
        autoDisplay: false,
      },
      'google_translate_element',
    );
  };

  function setLanguage(lang) {
    const combo = document.querySelector('.goog-te-combo');
    if (!combo || !lang) return false;
    combo.value = lang;
    combo.dispatchEvent(new Event('change'));
    localStorage.setItem('selectedLang', lang);

    // Update page direction for better UX
    document.documentElement.lang = lang === 'en' ? 'en' : 'ar';
    document.documentElement.dir = lang === 'en' ? 'ltr' : 'rtl';

    // Update custom button label + selected state
    const btn = document.querySelector('.lang-btn');
    document.querySelectorAll('.language-list li').forEach((li) => {
      li.setAttribute('aria-selected', String(li.dataset.lang === lang));
    });
    if (btn) {
      const li = document.querySelector(`.language-list li[data-lang="${lang}"]`);
      if (li) btn.childNodes[0].textContent = `${li.textContent} `;
    }
    return true;
  }

  function setLanguageWithRetry(lang, { tries = 20, intervalMs = 250 } = {}) {
    if (setLanguage(lang)) return;
    let left = tries;
    const t = window.setInterval(() => {
      left -= 1;
      if (setLanguage(lang) || left <= 0) window.clearInterval(t);
    }, intervalMs);
  }

  // Custom dropdown behavior
  const container = document.querySelector('.language-container');
  if (container) {
    const btn = container.querySelector('.lang-btn');
    const list = container.querySelector('.language-list');

    if (btn && list) {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = list.classList.toggle('show');
        btn.setAttribute('aria-expanded', String(isOpen));
      });

      document.addEventListener('click', () => {
        list.classList.remove('show');
        btn.setAttribute('aria-expanded', 'false');
      });

      list.querySelectorAll('li[data-lang]').forEach((li) => {
        li.addEventListener('click', () => {
          const lang = li.dataset.lang || 'ar';
          setLanguageWithRetry(lang);
          // If switching back to Arabic, reload to fully restore original text
          if (lang === 'ar') location.reload();
          list.classList.remove('show');
          btn.setAttribute('aria-expanded', 'false');
        });
      });
    }
  }

  function setActive(key, { focusPanel = false } = {}) {
    const tab = byKey(tabs, 'tab', key);
    const panel = byKey(panels, 'panel', key);
    if (!tab || !panel) return;

    tabs.forEach((t) => {
      const isSelected = t === tab;
      t.setAttribute('aria-selected', String(isSelected));
      t.tabIndex = isSelected ? 0 : -1;
    });

    panels.forEach((p) => {
      const isActive = p === panel;
      p.classList.toggle('is-active', isActive);
      p.classList.remove('is-visible');
    });

    // Animate in on next frame
    requestAnimationFrame(() => {
      panel.classList.add('is-visible');
      if (focusPanel) panel.focus({ preventScroll: true });
    });

    // Keep hash for shareability
    history.replaceState(null, '', `#${key}`);
  }

  function detect() {
    const ua = navigator.userAgent || '';
    const platform = navigator.platform || '';
    const isIOS = /iPhone|iPad|iPod/i.test(ua);
    const isAndroid = /Android/i.test(ua);
    const isMac = /Mac/i.test(platform) || /Mac OS X/i.test(ua);
    const isWindows = /Win/i.test(platform) || /Windows/i.test(ua);

    // Safari detection (avoid Chrome on iOS which still uses WebKit but UA differs)
    const isSafari = /Safari/i.test(ua) && !/Chrome|CriOS|Edg|OPR/i.test(ua);
    const isChromeLike = /Chrome|CriOS/i.test(ua);
    const isEdge = /Edg/i.test(ua);

    let key = 'android-chrome';
    let label = 'غير معروف — اختر التاب المناسب';

    if (isIOS) {
      key = 'iphone-safari';
      label = isSafari ? 'تم التعرف: آيفون — Safari' : 'تم التعرف: آيفون — يُفضّل Safari';
    } else if (isAndroid) {
      key = 'android-chrome';
      label = isChromeLike ? 'تم التعرف: أندرويد — Chrome' : 'تم التعرف: أندرويد — افتحها في Chrome';
    } else if (isWindows) {
      key = 'windows-chrome';
      label = isEdge ? 'تم التعرف: ويندوز — Edge' : 'تم التعرف: ويندوز — Chrome / Edge';
    } else if (isMac) {
      key = 'mac';
      label = isSafari ? 'تم التعرف: ماك — Safari' : 'تم التعرف: ماك — Safari / Chrome';
    }

    return { key, label };
  }

  function initFromHashOrDetect() {
    const raw = (location.hash || '').replace('#', '').trim();
    const hashKey = raw && byKey(tabs, 'tab', raw) ? raw : null;
    const { key, label } = detect();
    if (pill) pill.textContent = label;
    setActive(hashKey || key);
  }

  // Click handling
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => setActive(tab.dataset.tab, { focusPanel: false }));
  });

  // Keyboard navigation (RTL: we still keep left/right intuitive)
  tabs.forEach((tab, idx) => {
    tab.addEventListener('keydown', (e) => {
      const key = e.key;
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End', 'Enter', ' '].includes(key)) return;

      const currentIndex = tabs.findIndex((t) => t.getAttribute('aria-selected') === 'true');
      let nextIndex = currentIndex;

      if (key === 'ArrowRight') nextIndex = Math.min(tabs.length - 1, currentIndex + 1);
      if (key === 'ArrowLeft') nextIndex = Math.max(0, currentIndex - 1);
      if (key === 'Home') nextIndex = 0;
      if (key === 'End') nextIndex = tabs.length - 1;

      if (key === 'Enter' || key === ' ') {
        e.preventDefault();
        setActive(tab.dataset.tab, { focusPanel: true });
        return;
      }

      if (nextIndex !== currentIndex) {
        e.preventDefault();
        tabs[nextIndex].focus();
      }
    });
  });

  window.addEventListener('hashchange', () => initFromHashOrDetect());
  initFromHashOrDetect();

  // Restore saved language after widget loads
  window.addEventListener('load', () => {
    const savedLang = localStorage.getItem('selectedLang') || 'ar';
    if (savedLang && savedLang !== 'ar') {
      // wait for google widget to be ready
      setTimeout(() => setLanguageWithRetry(savedLang), 900);
    } else {
      document.documentElement.lang = 'ar';
      document.documentElement.dir = 'rtl';
    }
  });
})();


