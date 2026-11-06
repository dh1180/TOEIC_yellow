import test from 'node:test';
import assert from 'node:assert/strict';
import words from '../src/data/words.json' with {type:'json'};
import overrides from '../src/data/meaning-senses.json' with {type:'json'};
import {meaningSenses} from '../src/data/meaning-senses.js';

const normalize = text => text.replace(/[,;\s]+/g,' ').trim();

test('professional separates its adjective and noun meanings', () => {
  const word = words.find(word => word.word === 'professional');
  assert.deepEqual(meaningSenses(word), [['adj','전문적인, 직업의'],['n','전문가']]);
});

test('meaning badges preserve original glosses and unlabeled meanings remain readable', () => {
  const normalize = text => text.replace(/[,;\s]+/g,' ').trim();
  const byId = new Map(words.map(word => [word.id,word]));
  for (const [id,senses] of Object.entries(overrides)) {
    assert.equal(normalize(senses.map(([,text])=>text).join(' ')),normalize(byId.get(id).meaningKo),id);
    assert.ok(senses.every(([pos])=>['n','v','adj','adv','pron','prep','conj','phr','det','aux'].includes(pos)));
  }
  assert.deepEqual(meaningSenses({meaningKo:'하나, 둘; 셋'}),[[null,'하나, 둘'],[null,'셋']]);
});

test('all study cards have meaning-level labels', () => {
  const normalizeForLookup = text => text.replace(/[,;\s]+/g,' ').trim();
  const examples = {
    outline:[['n','개요'],['v','설명하다, 약술하다']],
    forward:[['adv','앞으로'],['v','(물건, 정보를) 보내다']],
    shovel:[['n','삽'],['v','(눈을) 치우다, 삽질하다']],
    potential:[['adj','잠재적인'],['n','가능성']],
    clear:[['adj','말게 갠, 명백한, 분명한'],['adv','또렷하게, 완전히, 떨어져서']]
  };
  assert.equal(Object.keys(overrides).length,words.length);
  assert.ok(words.every(word => overrides[word.id]?.length));
  for (const [word,expected] of Object.entries(examples)) {
    const card = words.find(item=>item.word===word && normalize(item.meaningKo) === normalize(expected.map(([,text])=>text).join(' ')));
    assert.deepEqual(meaningSenses(card),expected);
  }
});
