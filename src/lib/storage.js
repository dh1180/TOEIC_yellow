import AsyncStorage from '@react-native-async-storage/async-storage';
import { emptyData,validateBackup } from './session.js';
import { WORD_IDS, WORD_BY_ID } from '../data/index.js';
const KEY='toeic-yellow-study-v1';
export async function loadData(){const v=await AsyncStorage.getItem(KEY);return v?validateBackup(v,WORD_IDS,WORD_BY_ID):emptyData();}
export async function saveData(data){await AsyncStorage.setItem(KEY,JSON.stringify(data));}
export async function clearData(){await AsyncStorage.removeItem(KEY);}
