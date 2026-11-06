export function selectEnglishVoice(voices) {
  const english = voices.filter(voice => voice.identifier && /^en(?:[-_]|$)/i.test(voice.language));
  const american = english.filter(voice => /^en[-_]us$/i.test(voice.language));
  const candidates = american.length ? american : english;
  return candidates.find(voice => voice.quality === 'Enhanced') ?? candidates[0];
}
