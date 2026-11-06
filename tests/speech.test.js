import test from 'node:test';
import assert from 'node:assert/strict';
import {selectEnglishVoice} from '../src/lib/speech.js';

test('TTS selects an explicit US English voice even on Korean-first devices', () => {
  const voices = [
    {identifier:'ko',language:'ko-KR',quality:'Enhanced'},
    {identifier:'uk',language:'en-GB',quality:'Enhanced'},
    {identifier:'us',language:'en-US',quality:'Default'},
    {identifier:'us-hd',language:'en_US',quality:'Enhanced'}
  ];
  assert.equal(selectEnglishVoice(voices).identifier,'us-hd');
  assert.equal(selectEnglishVoice(voices.slice(0,2)).identifier,'uk');
  assert.equal(selectEnglishVoice(voices.slice(0,1)),undefined);
});
