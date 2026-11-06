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
  const normalize = text => text.replace(/[,;]\s*|\s+/g,' ').trim();
  const byId = new Map(words.map(word => [word.id,word]));
  for (const [id,senses] of Object.entries(overrides)) {
    assert.equal(normalize(senses.map(([,text])=>text).join(' ')),normalize(byId.get(id).meaningKo),id);
    assert.ok(senses.every(([pos])=>['n','v','adj','adv','pron','prep','conj','phr'].includes(pos)));
  }
  assert.deepEqual(meaningSenses({meaningKo:'하나, 둘; 셋'}),[[null,'하나, 둘'],[null,'셋']]);
});

test('the first 500 pending cards have meaning-level labels', () => {
  const examples = {
    outline:[['n','개요'],['v','설명하다, 약술하다']],
    forward:[['adv','앞으로'],['v','(물건, 정보를) 보내다']],
    shovel:[['n','삽'],['v','(눈을) 치우다, 삽질하다']]
  };
  assert.equal(Object.keys(overrides).length,556);
  for (const [word,expected] of Object.entries(examples)) {
    const card = words.find(item=>item.word===word && overrides[item.id]);
    assert.deepEqual(meaningSenses(card),expected);
  }
});
