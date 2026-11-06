import test from 'node:test';
import assert from 'node:assert/strict';
import words from '../src/data/words.json' with {type:'json'};
import overrides from '../src/data/meaning-senses.json' with {type:'json'};
import {meaningSenses} from '../src/data/meaning-senses.js';

test('professional separates its adjective and noun meanings', () => {
  const word = words.find(word => word.word === 'professional');
  assert.deepEqual(meaningSenses(word), [['adj','전문적인, 직업의'],['n','전문가']]);
});

test('meaning badges preserve original glosses and unlabeled meanings remain readable', () => {
  const byId = new Map(words.map(word => [word.id,word]));
  for (const [id,senses] of Object.entries(overrides)) {
    assert.equal(senses.map(([,text])=>text).join(' '),byId.get(id).meaningKo.replaceAll('; ',' '),id);
    assert.ok(senses.every(([pos])=>['n','v','adj','adv','pron'].includes(pos)));
  }
  assert.deepEqual(meaningSenses({meaningKo:'하나, 둘; 셋'}),[[null,'하나, 둘'],[null,'셋']]);
});
