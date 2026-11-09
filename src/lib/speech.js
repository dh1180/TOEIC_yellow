export const SPEECH_RATES = [0.85, 1, 1.15];
export const DEFAULT_SPEECH = { voiceId: null, rate: 1 };

export function normalizeSpeechSettings(value) {
  return {
    voiceId: typeof value?.voiceId === 'string' && value.voiceId ? value.voiceId : null,
    rate: SPEECH_RATES.includes(value?.rate) ? value.rate : DEFAULT_SPEECH.rate,
  };
}

export function englishVoices(voices) {
  return voices.filter(voice => voice.identifier && /^en(?:[-_]|$)/i.test(voice.language));
}

export function selectEnglishVoice(voices, voiceId = null) {
  const english = englishVoices(voices);
  const preferred = english.find(voice => voice.identifier === voiceId);
  if (preferred) return preferred;
  const american = english.filter(voice => /^en[-_]us$/i.test(voice.language));
  const candidates = american.length ? american : english;
  return candidates.find(voice => voice.quality === 'Enhanced') ?? candidates[0];
}
