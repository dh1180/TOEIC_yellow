import senseOverrides from './meaning-senses.json' with {type:'json'};

export function meaningSenses(word) {
  return senseOverrides[word.id] ?? word.meaningKo.split(';').map(text => [null, text.trim()]).filter(([,text]) => text);
}
