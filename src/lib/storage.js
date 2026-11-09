import AsyncStorage from '@react-native-async-storage/async-storage';
import { emptyData,validateBackup } from './session.js';
import { WORD_IDS, WORD_BY_ID } from '../data/index.js';
import { normalizeSpeechSettings, DEFAULT_SPEECH } from './speech.js';
const SPEECH_KEY='toeic-yellow-speech-v1';
const KEY='toeic-yellow-study-v1';
export async function loadData(){const v=await AsyncStorage.getItem(KEY);return v?validateBackup(v,WORD_IDS,WORD_BY_ID):emptyData();}
export async function saveData(data){await AsyncStorage.setItem(KEY,JSON.stringify(data));}
export async function clearData(){await AsyncStorage.removeItem(KEY);}

export async function loadSpeechSettings(){
  const value=await AsyncStorage.getItem(SPEECH_KEY);
  if(!value)return DEFAULT_SPEECH;
  try{return normalizeSpeechSettings(JSON.parse(value));}catch{return DEFAULT_SPEECH;}
}
export async function saveSpeechSettings(settings){
  await AsyncStorage.setItem(SPEECH_KEY,JSON.stringify(settings));
}
