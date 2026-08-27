export function isPlayButton(el: HTMLButtonElement): boolean {
  const text = (el.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
  return (
    text === 'jouer' ||
    text === 'commencer' ||
    text.endsWith(' jouer') ||
    text.endsWith(' commencer')
  );
}

export function clickPlayButton(): boolean {
  const buttons = Array.from(document.querySelectorAll('button'));
  const play = buttons.find(
    (b) => isPlayButton(b as HTMLButtonElement) && !(b as HTMLButtonElement).disabled,
  );
  if (play) {
    play.click();
    return true;
  }
  return false;
}

export function clickSettingsButton(): boolean {
  const buttons = Array.from(document.querySelectorAll('button'));
  const settings = buttons.find((b) => {
    const text = (b.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
    return text === 'paramètres' || text === 'parametres' || text.endsWith(' paramètres') || text.endsWith(' parametres');
  });
  if (settings && !(settings as HTMLButtonElement).disabled) {
    (settings as HTMLButtonElement).click();
    return true;
  }
  return false;
}

export function isResultsScreen(): boolean {
  const buttons = Array.from(document.querySelectorAll('button'));
  return buttons.some((b) => {
    const text = (b.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
    return text === 'rejouer' || text.endsWith(' rejouer');
  });
}

export function scrapeResult(): { percent: number | null; classNum: number | null } {
  const text = document.body.innerText || '';
  const cls = text.match(/Classe\s+(\d)/i);
  const pct = text.match(/(\d+(?:[.,]\d+)?)\s*%/);
  return {
    classNum: cls ? Number(cls[1]) : null,
    percent: pct ? Number(pct[1].replace(',', '.')) : null,
  };
}
