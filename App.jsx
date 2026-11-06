import React,{useEffect,useMemo,useRef,useState} from 'react';
import {ActivityIndicator,Alert,BackHandler,Keyboard,Platform,Pressable,ScrollView,StatusBar,StyleSheet,Text,TextInput,useWindowDimensions,View} from 'react-native';
import {SafeAreaProvider,SafeAreaView} from 'react-native-safe-area-context';
import * as Speech from 'expo-speech';
import {WORDS,WORD_BY_ID,WORD_IDS,WORDS_BY_CATEGORY,MANIFEST,searchWords} from './src/data/index';
import {emptyData,newSession,answerSession,categoryStats,selectQueue,CATEGORIES,CATEGORY_LABELS,backupJson,validateBackup,sessionVisibleIndex,sessionCompleted} from './src/lib/session';
import {STAGES,reviewLabel,nextLabel} from './src/lib/srs';
import {loadData,saveData,clearData} from './src/lib/storage';
import {selectEnglishVoice} from './src/lib/speech';
import {C,CATEGORY_COLORS,CATEGORY_SOFT,STUDY_ACCENTS,base} from './src/styles';

const DAY_LIST=Array.from({length:30},(_,i)=>i+1);
const RATE=0.85;
const format=n=>n.toLocaleString('ko-KR');
const dayName=d=>d===null?'전체':`DAY ${String(d).padStart(2,'0')}`;
const withCategory=(id,d)=>WORDS_BY_CATEGORY[id].filter(w=>d===null||w.day===d);
const speechError='영어 음성을 재생할 수 없어요. 기기의 텍스트 음성 변환 설정에서 영어 음성을 설치한 뒤 다시 시도해 주세요.';
let speechRequest=0;
const stopSpeech=()=>{
  speechRequest+=1;
  return Speech.stop().catch(()=>{});
};

async function play(text,setError){
  const stopped=stopSpeech();
  const request=speechRequest;
  setError('');
  const reportError=()=>{if(request===speechRequest)setError(speechError)};
  try {
    await stopped;
    const voice=selectEnglishVoice(await Speech.getAvailableVoicesAsync());
    if(request!==speechRequest)return;
    if(!voice){reportError();return;}
    // Expo's Android implementation passes language to Locale.Builder.setLanguage.
    Speech.speak(text,{voice:voice.identifier,language:Platform.OS==='android'?'en':voice.language,rate:RATE,pitch:1,onError:reportError});
  } catch {
    reportError();
  }
}

function Action({title,onPress,variant='primary',disabled=false,style,small=false}){
  const primary=variant==='primary', danger=variant==='danger';
  return <Pressable accessibilityRole="button" accessibilityState={{disabled}} disabled={disabled} onPress={onPress} style={({pressed})=>[s.action,small&&s.smallAction,primary?{backgroundColor:C.yellow}:danger?{backgroundColor:'#FFF1F1',borderColor:'#F4D6D6'}:{backgroundColor:C.card,borderColor:C.line},disabled&&{opacity:.4},pressed&&{opacity:.82},style]}><Text style={[s.actionText,{color:danger?C.danger:C.ink}]}>{title}</Text></Pressable>;
}
function Header({title,subtitle,onBack,right}){return <View style={s.header}><Pressable accessibilityRole="button" accessibilityLabel="뒤로가기" onPress={onBack} style={s.back}><Text style={s.backText}>‹</Text></Pressable><View style={{flex:1}}><Text style={s.headerTitle}>{title}</Text>{subtitle&&<Text style={s.tiny}>{subtitle}</Text>}</View>{right}</View>;}
function Pill({label,selected,onPress,color=C.yellow}){return <Pressable accessibilityRole="button" accessibilityState={{selected}} onPress={onPress} style={[s.pill,selected&&{backgroundColor:color,borderColor:color}]}><Text style={[s.pillText,selected&&{color:C.dark}]}>{label}</Text></Pressable>;}
function Stat({label,value,sub}){return <View style={s.stat}><Text style={s.tiny}>{label}</Text><Text style={s.statNum}>{format(value)}</Text>{sub&&<Text style={s.tiny}>{sub}</Text>}</View>;}
function SectionTitle({children}){return <Text accessibilityRole="header" style={s.sectionTitle}>{children}</Text>;}
function Card({children,style}){return <View style={[s.card,style]}>{children}</View>;}
function DayPicker({value,onChange}){return <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.dayPicker}><Pill label="전체" selected={value===null} onPress={()=>onChange(null)}/>{DAY_LIST.map(d=><Pill key={d} label={`DAY ${String(d).padStart(2,'0')}`} selected={value===d} onPress={()=>onChange(d)}/>)}</ScrollView>;}

function Home({data,onSelect,onNavigate}){
  const wide=useWindowDimensions().width>=760;
  const totalStudied=Object.keys(data.progress).length;
  const totalLongTerm=Object.values(data.progress).filter(p=>p.stage==='LONG_TERM').length;
  return <ScrollView contentContainerStyle={s.page}>
    <View style={s.brandRow}><View style={s.logo}><Text style={s.logoText}>Y.</Text></View><View style={{flex:1}}><Text style={s.brand}>TOEIC Yellow</Text><Text style={s.tiny}>나만의 토익 어휘 노트</Text></View><Pressable onPress={()=>onNavigate('SETTINGS')} accessibilityRole="button" accessibilityLabel="설정" style={s.iconButton}><Text style={{fontSize:23}}>⚙</Text></Pressable></View>
    <View style={[s.hero,wide&&s.heroWide]}>
      <View accessible={false} pointerEvents="none" style={s.heroDecoration}/>
      <View style={s.heroIntro}>
        <Text style={s.heroEyebrow}>TOEIC YELLOW  /  VOCABULARY</Text>
        <Text accessibilityRole="header" style={[s.heroTitle,wide&&s.heroTitleWide]}>오늘의 단어,{"\n"}한 장씩 쌓아요.</Text>
        <Text style={s.heroCopy}>복습할 단어부터, 한 번에 {data.target}개씩.</Text>
      </View>
      <View style={[s.heroStats,wide&&s.heroStatsWide]}>
        <View><Text style={s.heroStatsValue}>{format(totalStudied)}</Text><Text style={s.heroStatsText}>학습한 단어</Text></View>
        <View><Text style={s.heroStatsValue}>{format(totalLongTerm)}</Text><Text style={s.heroStatsText}>장기 기억</Text></View>
        <View><Text style={s.heroStatsValue}>{format(WORDS.length)}</Text><Text style={s.heroStatsText}>전체 단어</Text></View>
      </View>
    </View>
    {data.session&&<Card style={{borderColor:C.yellow,borderWidth:2}}><Text style={s.sectionTitle}>중단한 학습이 있어요</Text><Text style={s.body}>{CATEGORY_LABELS[data.session.category]} · {dayName(data.session.day)} · {sessionCompleted(data.session)} / {data.session.originalIds.length} 카드 진행</Text><Action title="이어 학습하기" onPress={()=>onNavigate('STUDY')}/></Card>}
    <View style={s.sectionHeading}><SectionTitle>단어장 선택</SectionTitle><Text style={s.tiny}>DAY 01–30</Text></View>
    <View style={s.catGrid}>{CATEGORIES.map(cat=>{const words=WORDS_BY_CATEGORY[cat],v=categoryStats(words,data.progress);return <Pressable accessibilityRole="button" accessibilityLabel={`${CATEGORY_LABELS[cat]} ${words.length}개 단어`} onPress={()=>onSelect(cat)} key={cat} style={({pressed})=>[s.categoryCard,wide&&s.categoryCardWide,pressed&&{opacity:.75}]}><View style={s.categoryTop}><View style={[s.dot,{backgroundColor:CATEGORY_COLORS[cat]}]}/><Text style={s.categoryArrow}>↗</Text></View><Text style={s.catTitle}>{CATEGORY_LABELS[cat]}</Text><Text style={s.catCount}>{format(v.total)}개</Text><View style={s.progressTrack}><View style={[s.progressFill,{width:`${100*v.studied/v.total}%`,backgroundColor:CATEGORY_COLORS[cat]}]}/></View><Text style={s.catSub}>학습 {format(v.studied)} · 복습 {v.due}</Text></Pressable>})}</View>
    <SectionTitle>빠른 메뉴</SectionTitle><View style={s.shortcuts}><Action variant="outline" title="⌕ 단어 검색" onPress={()=>onNavigate('SEARCH')} style={{flex:1}}/><Action variant="outline" title="◷ 학습 통계" onPress={()=>onNavigate('STATS')} style={{flex:1}}/></View>
    <Text style={[s.footnote,{marginTop:16}]}>DAY 01~30, 기존 단어 뜻과 제공 예문을 보존했어요. 추가로 만든 학습용 문장은 출처를 구분해 표시합니다.</Text>
  </ScrollView>;
}

function Level({data,category,day,onDay,onTarget,onStart,onBack,onPreview}){
  const words=useMemo(()=>withCategory(category,day),[category,day]);const stats=categoryStats(words,data.progress);
  const queue=selectQueue(words,data.progress,data.target);
  const recent=words.filter(w=>data.progress[w.id]).slice(0,12);
  return <View style={s.safe}><Header title={CATEGORY_LABELS[category]} subtitle={`${format(WORDS_BY_CATEGORY[category].length)}개 · ${dayName(day)}`} onBack={onBack}/><ScrollView contentContainerStyle={s.page}>
    <SectionTitle>학습 범위</SectionTitle><DayPicker value={day} onChange={onDay}/>
    <View style={s.statsRow}><Stat label="전체" value={stats.total}/><Stat label="새 단어" value={stats.new}/><Stat label="복습 대기" value={stats.due}/><Stat label="장기 기억" value={stats.longTerm}/></View>
    <SectionTitle>한 번에 학습할 단어</SectionTitle><View style={s.pillRow}>{[10,20,30].map(n=><Pill key={n} label={`${n}개`} selected={data.target===n} onPress={()=>onTarget(n)}/>)}</View>
    <Card><Text style={s.body}>복습 시각이 지난 단어를 먼저 선택하고, 남은 자리는 아직 배우지 않은 단어로 채웁니다.</Text><Text style={[s.body,{marginVertical:14,fontWeight:'800'}]}>지금 학습 가능: {queue.length}개</Text><Action title={queue.length?`${queue.length}개 단어 학습 시작`:'현재 학습할 단어가 없어요'} disabled={!queue.length||!!data.session} onPress={()=>onStart(queue)}/>{data.session&&<Text style={[s.tiny,{marginTop:8}]}>진행 중인 세션을 먼저 완료하거나 종료해 주세요.</Text>}</Card>
    <SectionTitle>이 범위의 단어 미리 보기</SectionTitle>{words.slice(0,8).map(w=><Pressable key={w.id} accessibilityRole="button" onPress={()=>onPreview(w)} style={s.wordRow}><View style={{flex:1}}><Text style={s.wordRowEn}>{w.word}</Text><Text numberOfLines={1} style={s.wordRowKo}>{w.meaningKo}</Text></View><Text style={s.tiny}>›</Text></Pressable>)}
    <Action title="전체 단어 검색하기" variant="outline" onPress={()=>onPreview('SEARCH')}/>
    {recent.length>0&&<Text style={s.footnote}>이미 학습한 단어도 검색에서 열어 내용을 확인할 수 있습니다.</Text>}
  </ScrollView></View>;
}

function Study({word,progress,category,day,index,total,isRetry,onAnswer,onClose,readOnly=false}){
  const [reveal,setReveal]=useState(false),[locked,setLocked]=useState(false),[sampleIndex,setSampleIndex]=useState(0),[showDraft,setShowDraft]=useState(false);
  const [audioError,setAudioError]=useState('');
  const example=word?.examples?.[sampleIndex]||null;
  const unreviewed=['generated-context','provided-crosslink'].includes(example?.source);
  useEffect(()=>{setReveal(false);setLocked(false);setSampleIndex(0);setShowDraft(false);setAudioError('');},[word?.id,readOnly]);
  useEffect(()=>()=>{void stopSpeech();},[word?.id]);
  if(!word)return <View style={s.safe}><Header title="단어를 불러올 수 없습니다" onBack={onClose}/></View>;
  const accent=STUDY_ACCENTS[word.category];
  const soft=CATEGORY_SOFT[word.category];
  const complete=()=>{if(locked||!reveal)return;setLocked(true);onAnswer('KNOWN');};
  const retry=()=>{if(locked||!reveal)return;setLocked(true);onAnswer('RELEARN');};
  return <View style={s.safe}><View style={s.studyTop}><Pressable accessibilityRole="button" accessibilityLabel="학습 닫기" onPress={onClose} style={s.back}><Text style={s.backText}>×</Text></Pressable><View style={{flex:1,alignItems:'center'}}><Text style={s.tiny}>{readOnly?'단어 미리 보기':`${index} / ${total} · ${isRetry?'다시 학습':'오늘의 학습'}`}</Text><View style={s.progressTrack}><View style={[s.progressFill,{width:`${Math.min(100,(index-1)/total*100)}%`,backgroundColor:accent}]}/></View></View><View style={{width:44}}/></View>
    <ScrollView contentContainerStyle={s.studyScroll}><View style={s.studyStage}><Text style={[s.stageText,{backgroundColor:soft,color:accent}]}>{CATEGORY_LABELS[word.category]} · {dayName(word.day)} · {reviewLabel(progress)}</Text></View>
      <View style={s.studyCard}>
        <View style={s.studyCardTop}><View style={s.studyCardLabel}><View style={[s.studyDot,{backgroundColor:accent}]}/><Text style={s.tiny}>{word.part!=='VOCAB'?word.part:'ENGLISH'}</Text></View><Pressable accessibilityRole="button" onPress={()=>void play(word.word,setAudioError)} style={s.audio}><Text style={s.audioText}>▶ 발음</Text></Pressable></View>
        <Pressable accessibilityRole={reveal?undefined:"button"} accessibilityLabel={reveal?undefined:"뜻과 예문 보기"} disabled={reveal} onPress={()=>setReveal(true)} style={[s.studyCardWord,reveal&&{minHeight:112}]}><Text adjustsFontSizeToFit numberOfLines={3} style={[s.bigWord,{fontSize:word.word.length>19?31:word.word.length>13?39:word.word.length>8?47:61}]}>{word.word}</Text>{!reveal&&<Text style={s.tapHint}>탭하여 뜻과 예문 보기 <Text style={s.categoryArrow}>↓</Text></Text>}</Pressable>
        {reveal&&<View style={s.revealed}><Text style={s.meaning}>{word.meaningKo}</Text>{!!word.wordOriginal&&<Text style={s.qualityWarning}>원본 표기: {word.wordOriginal} · 교정 전 원문 보존</Text>}<View style={[s.exampleBox,{borderLeftColor:accent}]}><View style={s.exampleHeader}><Text style={s.exampleTitle}>{example?.source==='provided'?'제공된 원본 예문':example?.source==='provided-crosslink'?'원본 예문 재활용 · 뜻 연결 검수 대기':example?.source==='editorial-draft'?'직접 작성한 예문 초안':example?.source==='project-authored'?'프로젝트 직접 작성 예문':example?.source==='generated-context'?'자동 작성 문맥 초안 · 검수 대기':'예문 출처 미확인'}</Text><Pressable accessibilityRole="button" accessibilityLabel="예문 발음 재생" disabled={unreviewed&&!showDraft} onPress={()=>example&&void play(example.en,setAudioError)} style={s.audio}><Text style={s.audioText}>▶ 듣기</Text></Pressable></View>{unreviewed&&!showDraft?<View><Text style={s.qualityWarning}>이 단어에는 검수 완료된 문맥 예문이 없습니다. 잘못된 용법을 학습하지 않도록 미검수 문장은 기본적으로 가립니다.</Text><Action variant="outline" small title="검수 전 문장 보기" onPress={()=>setShowDraft(true)}/></View>:<><Text style={s.exampleEn}>{example?.en||'예문을 확인할 수 없습니다.'}</Text>{!!example?.ko&&<Text style={s.exampleKo}>{example.ko}</Text>}</>}{example?.source!=='provided'&&<Text style={s.qualityWarning}>{example?.source==='editorial-draft'?'직접 작성한 영문·번역 초안이며 외부 검수를 마치지 않았습니다.':example?.source==='provided-crosslink'?'다른 단어 카드에 있던 제공 예문입니다. 해당 단어 뜻과 용례가 일치하는지 확인이 필요합니다.':example?.source==='project-authored'?'프로젝트 직접 작성 예문으로, 공식 TOEIC 예문이거나 독립적인 전문 검수를 마친 자료는 아닙니다.':'자동 구성 문맥 초안입니다. 문법·뜻·자연스러움은 검수 전이며 한국어는 문장 번역이 아닌 핵심 뜻입니다.'}</Text>}{word.examples.length>1&&<View style={s.exampleButtons}><Text style={s.tiny}>예문 {sampleIndex+1}/{word.examples.length}</Text><Action title="다른 예문" small variant="outline" onPress={()=>{setSampleIndex(i=>(i+1)%word.examples.length);setShowDraft(false)}}/></View>}</View></View>}
        {!!audioError&&<Text accessibilityRole="alert" style={s.qualityWarning}>{audioError}</Text>}
      </View>
    </ScrollView>
    {!readOnly&&<View style={s.answerArea}><Text style={s.answerNote}>{reveal?'다음 복습 시점을 선택해 주세요':'뜻을 확인하면 답변할 수 있어요'}</Text><View style={s.answerRow}><Pressable accessibilityRole="button" accessibilityState={{disabled:!reveal||locked}} disabled={!reveal||locked} onPress={retry} style={[s.answerButton,{borderWidth:1,borderColor:C.line,backgroundColor:C.card},(!reveal||locked)&&s.disabled]}><Text style={s.answerTitle}>다시 학습</Text><Text style={s.answerSub}>다음 {nextLabel(progress,'RELEARN')}</Text></Pressable><Pressable accessibilityRole="button" accessibilityState={{disabled:!reveal||locked}} disabled={!reveal||locked} onPress={complete} style={[s.answerButton,{backgroundColor:accent},(!reveal||locked)&&s.disabled]}><Text style={[s.answerTitle,s.answerOnAccent]}>알고 있음</Text><Text style={[s.answerSub,s.answerOnAccent]}>다음 {isRetry?reviewLabel(progress):nextLabel(progress,'KNOWN')}</Text></Pressable></View></View>}
    {readOnly&&<View style={s.answerArea}><Action title="단어장으로 돌아가기" onPress={onClose}/></View>}
  </View>;
}

function Summary({result,onDone}){return <View style={s.safe}><ScrollView contentContainerStyle={[s.page,{flexGrow:1,justifyContent:'center'}]}><View style={s.summaryIcon}><Text style={{fontSize:35}}>✓</Text></View><Text style={[s.heroTitle,{textAlign:'center',marginTop:18}]}>오늘의 학습 완료!</Text><Text style={[s.body,{textAlign:'center',marginTop:9,marginBottom:20}]}>기억을 한 단계씩 키워가고 있어요.</Text><Card><View style={s.statsRow}><Stat label="학습한 단어" value={result.total}/><Stat label="알고 있음 응답" value={result.known}/></View><View style={[s.statsRow,{marginTop:14}]}><Stat label="다시 학습 응답" value={result.relearn}/><Stat label="장기 기억으로" value={result.longTermAdded}/></View></Card><Card style={{marginVertical:15}}><Text style={s.sectionTitle}>복습 규칙</Text><Text style={s.body}>30분 → 3일 → 7일 → 21일 → 장기 기억. 처음 보는 단어를 이미 안다고 표시하면 장기 기억에 바로 들어갑니다. 이는 자기 평가에 따른 분류입니다.</Text></Card><Action title="단어장으로 돌아가기" onPress={onDone}/></ScrollView></View>}

function Search({onBack,onPreview}){
 const [query,setQuery]=useState(''),[cat,setCat]=useState('all'),[day,setDay]=useState(null),[limit,setLimit]=useState(50);
 const found=useMemo(()=>searchWords(query,cat,day),[query,cat,day]);
 return <View style={s.safe}><Header title="전체 단어 검색" subtitle="영단어와 한국어 뜻을 모두 검색해요" onBack={onBack}/><View style={s.searchPanel}><TextInput value={query} onChangeText={v=>{setQuery(v);setLimit(50)}} placeholder="예: schedule, 일정, résumé" placeholderTextColor="#99928A" autoCapitalize="none" autoCorrect={false} returnKeyType="search" style={s.searchInput} accessibilityLabel="단어 검색"/><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.pillRow}><Pill label="전체" selected={cat==='all'} onPress={()=>{setCat('all');setLimit(50)}}/>{CATEGORIES.map(c=><Pill key={c} label={CATEGORY_LABELS[c]} selected={cat===c} onPress={()=>{setCat(c);setLimit(50)}}/>)}</ScrollView><DayPicker value={day} onChange={d=>{setDay(d);setLimit(50)}}/><Text style={s.resultCount}>검색 결과 {format(found.length)}개</Text></View>
 <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.searchResults}>{found.slice(0,limit).map(w=><Pressable key={w.id} accessibilityRole="button" onPress={()=>{Keyboard.dismiss();onPreview(w)}} style={s.wordRow}><View style={{flex:1}}><Text style={s.wordRowEn}>{w.word}</Text><Text numberOfLines={2} style={s.wordRowKo}>{w.meaningKo}</Text><Text style={s.tiny}>{CATEGORY_LABELS[w.category]} · {dayName(w.day)}</Text></View><Text style={s.tiny}>›</Text></Pressable>)}{found.length>limit&&<Action title={`50개 더 보기 · ${format(Math.min(limit,found.length))}/${format(found.length)}`} variant="outline" onPress={()=>setLimit(l=>l+50)}/ >}{found.length===0&&<Text style={s.empty}>검색 결과가 없어요. 철자나 필터를 확인해 주세요.</Text>}</ScrollView>
 </View>;
}
function Stats({progress,onBack}){
  const items=Object.values(progress);const counts=Object.fromEntries(Object.keys(STAGES).map(k=>[k,items.filter(p=>p.stage===k).length]));
  return <View style={s.safe}><Header title="학습 통계" subtitle="기기에 저장된 학습 상태" onBack={onBack}/><ScrollView contentContainerStyle={s.page}><Card><Text style={s.sectionTitle}>나의 학습 현황</Text><View style={s.statsRow}><Stat label="학습한 단어" value={items.length}/><Stat label="장기 기억" value={counts.LONG_TERM}/><Stat label="전체 어휘" value={WORDS.length}/></View></Card><SectionTitle>복습 단계별 단어</SectionTitle>{Object.entries(STAGES).filter(([k])=>k!=='NEW').map(([key,label])=><View key={key} style={s.wordRow}><View style={{flex:1}}><Text style={s.wordRowEn}>{label}</Text><View style={s.progressTrack}><View style={[s.progressFill,{backgroundColor:C.yellow,width:`${100*counts[key]/Math.max(1,items.length)}%`}]}/></View></View><Text style={s.statNum}>{counts[key]}</Text></View>)}<SectionTitle>단어장별 진도</SectionTitle>{CATEGORIES.map(cat=>{const v=categoryStats(WORDS_BY_CATEGORY[cat],progress);return <Card key={cat}><Text style={s.wordRowEn}>{CATEGORY_LABELS[cat]}</Text><Text style={s.tiny}>{v.studied}/{v.total} 학습 · {v.due}개 복습 대기</Text><View style={s.progressTrack}><View style={[s.progressFill,{backgroundColor:CATEGORY_COLORS[cat],width:`${100*v.studied/v.total}%`}]}/></View></Card>})}</ScrollView></View>;
}
async function downloadBackup(data){
 const text=backupJson(data),name='toeic-yellow-backup.json';
 if(Platform.OS==='web'){
  const url=URL.createObjectURL(new Blob([text],{type:'application/json'}));
  const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);return;
 }
 const [{File,Paths},Sharing]=await Promise.all([import('expo-file-system'),import('expo-sharing')]);
 if(!await Sharing.isAvailableAsync())throw Error('기기에서 파일 공유를 사용할 수 없습니다.');
 const file=new File(Paths.cache,name);await file.write(text);await Sharing.shareAsync(file.uri,{mimeType:'application/json',UTI:'public.json'});
}
async function selectBackup(){
 if(Platform.OS==='web')return new Promise((resolve,reject)=>{
  const input=document.createElement('input');input.type='file';input.accept='.json,application/json';
  input.onchange=()=>{const f=input.files?.[0];if(!f)return resolve(null);if(f.size>10_000_000)return reject(Error('10MB 이하 파일만 가능합니다.'));f.text().then(resolve,reject)};
  input.oncancel=()=>resolve(null);input.click();
 });
 const [Picker,{File}]=await Promise.all([import('expo-document-picker'),import('expo-file-system')]);
 const r=await Picker.getDocumentAsync({type:['application/json','text/plain'],copyToCacheDirectory:true,multiple:false});if(r.canceled)return null;
 const f=new File(r.assets[0].uri);if((r.assets[0].size??f.size)>10_000_000)throw Error('10MB 이하 파일만 가능합니다.');return f.text();
}
function Settings({data,onBack,onReplace,onReset}){
 const [busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const run=async task=>{if(busy)return;setBusy(true);setMessage('');try{await task()}catch(e){setMessage(e instanceof Error?e.message:'처리하지 못했습니다.')}finally{setBusy(false)}};
 const confirm=(title,body,yes)=>{if(Platform.OS==='web'){if(window.confirm(`${title}\n${body}`))void run(yes);return;}Alert.alert(title,body,[{text:'취소',style:'cancel'},{text:'확인',style:'destructive',onPress:()=>void run(yes)}]);};
 return <View style={s.safe}><Header title="설정" subtitle="학습 기록과 자료 정보" onBack={onBack}/><ScrollView contentContainerStyle={s.page}>{busy&&<ActivityIndicator size="large" color={C.dark}/ >}{!!message&&<Card><Text accessibilityRole="alert" style={s.body}>{message}</Text></Card>}
 <Card><SectionTitle>한 번에 학습할 단어</SectionTitle><Text style={s.body}>현재 {data.target}개 · 단어장 화면에서 10/20/30개로 변경할 수 있습니다.</Text></Card>
 <Card><SectionTitle>백업 및 복구</SectionTitle><Text style={s.body}>학습 상태는 기기에만 저장되며 서버로 전송되지 않습니다. 기기 교체나 앱 삭제 전 JSON 백업을 내보내 주세요.</Text><Action variant="outline" title="학습 기록 백업 파일 내보내기" onPress={()=>void run(async()=>{await downloadBackup(data);setMessage('파일 공유 또는 다운로드를 실행했습니다. 저장 여부를 확인하세요.')})} disabled={busy}/><Action variant="outline" title="백업 파일 불러오기" disabled={busy} onPress={()=>void run(async()=>{const raw=await selectBackup();if(raw===null)return;const next=validateBackup(raw,WORD_IDS,WORD_BY_ID);if(Platform.OS==='web'){if(window.confirm('기존 기록 위에 백업을 복원할까요?')){await onReplace(next);setMessage('백업을 복원했습니다.')}}else{Alert.alert('기존 기록 덮어쓰기','백업 데이터를 현재 기록 위에 복원할까요?',[{text:'취소',style:'cancel'},{text:'복원',onPress:()=>void run(async()=>{await onReplace(next);setMessage('백업을 복원했습니다.')})}])}})}/><Action variant="danger" title="학습 기록 초기화" disabled={busy} onPress={()=>confirm('학습 기록 초기화','기기에 저장된 학습 이력이 삭제됩니다. 백업 후 진행해 주세요.',async()=>{await onReset();setMessage('학습 기록을 초기화했습니다.')})}/></Card>
 <Card><SectionTitle>단어 및 예문 출처</SectionTitle><Text style={s.body}>사용자가 제공한 두 개의 Anki 덱에서 어휘 {format(MANIFEST.wordCount)}개와 예문 카드 {format(MANIFEST.exampleCardCount)}개를 추출했습니다. 중복 의미를 가진 원본 항목은 통합하지 않았습니다.</Text><Text style={s.body}>원본 예문이 있는 단어 {format(MANIFEST.providedExampleWords)}개. 그 외 {format(MANIFEST.authoredPromptWords)}개 중 {format((MANIFEST.projectReviewedExamples||0)+(MANIFEST.editorialDraftExamples||0))}개는 프로젝트 작성 예문, {format(MANIFEST.providedCrosslinkedExamples||0)}개는 다른 원본 카드의 예문을 재연결한 후보, {format(MANIFEST.generatedContextExamples||0)}개의 규칙 기반 예문이 남아 있습니다. 재연결 후보는 기본으로 숨깁니다. 예문은 독립 언어 감수 대기 상태입니다.</Text><Text style={s.body}>발음은 기기의 영어 TTS를 사용하며 기기 및 음성 엔진 설정에 따라 품질이 달라집니다.</Text><Text style={s.body}>저작권 및 사용 권한은 원본 Anki 데이터 제공자와 별도로 확인이 필요합니다. 원본 음성 MP3는 앱에 재배포하지 않았습니다.</Text></Card>
 <Card><SectionTitle>개인정보</SectionTitle><Text style={s.body}>회원가입과 별도 서버가 없습니다. 학습 기록은 AsyncStorage에 보관하고, 외부 백업 파일은 사용자가 직접 관리합니다. 광고 및 분석 SDK를 사용하지 않습니다.</Text></Card>
 </ScrollView></View>;
}

function StudyApp(){
 const [data,setData]=useState(emptyData),[ready,setReady]=useState(false),[loadError,setLoadError]=useState(false),[saveError,setSaveError]=useState(false),[mode,setMode]=useState('HOME'),[category,setCategory]=useState('frequent'),[day,setDay]=useState(null),[preview,setPreview]=useState(null),[result,setResult]=useState({total:0,known:0,relearn:0,longTermAdded:0});
 const current=useRef(data),queueRef=useRef(Promise.resolve()),answerLock=useRef(false);
 const load=async()=>{try{const v=await loadData();current.current=v;setData(v);setReady(true);setLoadError(false)}catch(e){console.warn(e);setLoadError(true)}};
 useEffect(()=>{void load()},[]);
 const persist=next=>{current.current=next;setData(next);const task=queueRef.current.catch(()=>{}).then(()=>saveData(next));queueRef.current=task;task.then(()=>setSaveError(false)).catch(()=>setSaveError(true));return task;};
 const replace=async next=>{await queueRef.current.catch(()=>{});await saveData(next);current.current=next;setData(next);setSaveError(false);};
 const reset=async()=>{await queueRef.current.catch(()=>{});await clearData();const next=emptyData();current.current=next;setData(next);setSaveError(false);};
 const back=()=>{void stopSpeech();if(preview){setPreview(null);return;}if(mode==='STUDY'||mode==='SUMMARY'){setMode('LEVEL');return;}if(mode==='LEVEL'||mode==='SEARCH'||mode==='STATS'||mode==='SETTINGS'){setMode('HOME');return;}};
 useEffect(()=>{if(Platform.OS!=='android')return;const sub=BackHandler.addEventListener('hardwareBackPress',()=>{if(mode==='HOME'&&!preview)return false;back();return true});return()=>sub.remove()},[mode,preview]);
 useEffect(()=>{answerLock.current=false;},[data.session?.queue?.[0],data.session?.known,data.session?.relearn,mode]);
 const navigate=destination=>{
  if(destination==='STUDY'&&current.current.session){
   setCategory(current.current.session.category);
   setDay(current.current.session.day);
  }
  setMode(destination);
 };
 const choose=cat=>{setCategory(cat);setDay(null);setMode('LEVEL')};
 const begin=words=>{if(current.current.session)return;persist(newSession(current.current,words,category,day,{shuffle:true}));setMode('STUDY')};
 const answer=value=>{if(answerLock.current)return;answerLock.current=true;try{const r=answerSession(current.current,value);persist(r.data);setResult(r.result);if(!r.data.session)setMode('SUMMARY')}catch(e){answerLock.current=false;console.warn(e)}};
 const openWord=w=>{if(w==='SEARCH'){setMode('SEARCH');return;}setPreview(w)};
 if(!ready)return <SafeAreaView style={s.loading}>{loadError?<><Text accessibilityRole="alert" style={s.body}>저장된 학습 기록을 읽지 못했습니다. 데이터를 초기화하지 않고 보존합니다.</Text><Action title="다시 불러오기" onPress={()=>void load()}/><Action variant="outline" title="설정에서 백업 복구" onPress={()=>{setReady(true);setMode('SETTINGS')}}/></>:<ActivityIndicator size="large" color={C.dark}/>}</SafeAreaView>;
 const session=data.session, word=preview|| (session?WORD_BY_ID.get(session.queue[0]):null);
 return <SafeAreaView style={s.root}><StatusBar barStyle="dark-content" backgroundColor={C.bg}/>{saveError&&<View style={s.saveBanner}><Text style={s.body}>기기 저장에 실패했습니다. 앱을 종료하지 마세요.</Text><Action title="저장 재시도" variant="outline" small onPress={()=>void persist(current.current)}/></View>}
 {preview&&<Study word={preview} progress={data.progress[preview.id]} category={preview.category} day={preview.day} index={1} total={1} readOnly onClose={()=>setPreview(null)}/>}
 {!preview&&mode==='HOME'&&<Home data={data} onSelect={choose} onNavigate={navigate}/>}
 {!preview&&mode==='LEVEL'&&<Level data={data} category={category} day={day} onDay={setDay} onTarget={target=>void persist({...current.current,target})} onStart={begin} onBack={back} onPreview={openWord}/>}
 {!preview&&mode==='STUDY'&&session&&word&&<Study key={`${word.id}:${session.known+session.relearn}`} word={word} progress={data.progress[word.id]} category={session.category} day={session.day} index={sessionVisibleIndex(session)} total={session.originalIds.length} isRetry={session.retryIds.includes(word.id)} onAnswer={answer} onClose={back}/>}
 {!preview&&mode==='STUDY'&&!session&&<Home data={data} onSelect={choose} onNavigate={navigate}/>}
 {!preview&&mode==='SUMMARY'&&<Summary result={result} onDone={()=>setMode('LEVEL')}/>}
 {mode==='SEARCH'&&<View style={[s.safe,preview&&s.hidden]}><Search onBack={back} onPreview={openWord}/></View>}
 {!preview&&mode==='STATS'&&<Stats progress={data.progress} onBack={back}/>}
 {!preview&&mode==='SETTINGS'&&<Settings data={data} onBack={back} onReplace={replace} onReset={reset}/>}
 </SafeAreaView>;
}
export default function App(){return <SafeAreaProvider><StudyApp/></SafeAreaProvider>}

const s=StyleSheet.create({
 root:{flex:1,backgroundColor:C.bg},hidden:{display:'none'},safe:{flex:1,backgroundColor:C.bg},page:{paddingHorizontal:18,paddingTop:12,paddingBottom:40,gap:16,maxWidth:1000,width:'100%',alignSelf:'center'},loading:{flex:1,alignItems:'center',justifyContent:'center',padding:30,gap:12,backgroundColor:C.bg},
 header:{minHeight:66,maxWidth:1000,width:'100%',alignSelf:'center',flexDirection:'row',alignItems:'center',paddingHorizontal:14,gap:8,borderBottomColor:C.line,borderBottomWidth:1},back:{width:44,height:44,borderRadius:14,backgroundColor:C.card,alignItems:'center',justifyContent:'center'},backText:{fontSize:35,color:C.ink,fontWeight:'300'},headerTitle:{fontSize:19,color:C.ink,fontWeight:'900'},tiny:{color:C.muted,fontSize:11,lineHeight:17},
 brandRow:{flexDirection:'row',alignItems:'center',gap:10,marginTop:6,marginBottom:4},logo:{width:48,height:48,alignItems:'center',justifyContent:'center',borderRadius:17,backgroundColor:C.yellow},logoText:{fontWeight:'900',fontSize:24,color:C.dark},brand:{fontSize:22,fontWeight:'900',color:C.ink,letterSpacing:-.6},iconButton:{width:44,height:44,backgroundColor:C.card,borderWidth:1,borderColor:C.line,borderRadius:14,alignItems:'center',justifyContent:'center'},
 card:{backgroundColor:C.card,borderRadius:22,padding:18,borderColor:C.line,borderWidth:1,gap:10,...base},hero:{position:'relative',overflow:'hidden',backgroundColor:C.yellow,borderRadius:28,padding:22,gap:22},
 heroWide:{padding:34,minHeight:244,flexDirection:'row',alignItems:'center',gap:34},
 heroDecoration:{position:'absolute',width:300,height:300,borderRadius:150,borderWidth:30,borderColor:'#F8CB43',right:-95,top:-148},
 heroIntro:{flexShrink:1,gap:8},heroEyebrow:{fontSize:10,fontWeight:'900',letterSpacing:1.7,color:'#55430D'},
 heroTitle:{fontSize:31,fontWeight:'900',lineHeight:40,letterSpacing:-1.3,color:C.dark},
 heroTitleWide:{fontSize:42,lineHeight:52},heroCopy:{fontSize:14,lineHeight:22,color:'#51421B'},
 heroStats:{flexDirection:'row',justifyContent:'space-between',gap:10,padding:14,borderRadius:17,backgroundColor:C.dark},
 heroStatsWide:{flex:1,maxWidth:342,marginLeft:'auto',padding:20},
 heroStatsValue:{fontSize:21,color:C.yellow,fontWeight:'900',fontVariant:['tabular-nums']},
 heroStatsText:{fontSize:11,color:'#F0E8CB',marginTop:4},
 sectionHeading:{flexDirection:'row',justifyContent:'space-between',alignItems:'baseline'},
 studyCardLabel:{flexDirection:'row',alignItems:'center',gap:7},
 studyDot:{width:8,height:8,borderRadius:4},
 answerOnAccent:{color:'#FFFFFF'},
 categoryArrow:{color:C.muted,fontSize:15,fontWeight:'800'},
 categoryCardWide:{width:'24%'},
 searchPanel:{width:'100%',maxWidth:820,alignSelf:'center',paddingHorizontal:18},
 searchResults:{width:'100%',maxWidth:820,alignSelf:'center',paddingHorizontal:18,paddingBottom:30},
 sectionTitle:{color:C.ink,fontWeight:'900',fontSize:16,marginTop:12,marginBottom:2},catGrid:{flexDirection:'row',flexWrap:'wrap',justifyContent:'space-between',rowGap:12},categoryCard:{width:'48.2%',backgroundColor:C.card,padding:16,minHeight:156,borderRadius:20,borderWidth:1,borderColor:C.line,gap:7,...base},dot:{width:13,height:13,borderRadius:99,marginBottom:3},catTitle:{color:C.ink,fontWeight:'900',fontSize:15},catCount:{color:C.ink,fontWeight:'900',fontSize:21},catSub:{fontSize:11,color:C.muted},
 progressTrack:{height:6,borderRadius:9,backgroundColor:'#EAE6DC',overflow:'hidden',width:'100%',marginTop:5},progressFill:{height:'100%',borderRadius:9},shortcuts:{flexDirection:'row',gap:10},
 action:{paddingHorizontal:13,minHeight:49,borderWidth:1,borderColor:'transparent',borderRadius:13,alignItems:'center',justifyContent:'center'},smallAction:{minHeight:34,paddingHorizontal:12},actionText:{fontSize:13,fontWeight:'900',textAlign:'center'},body:{color:C.ink,fontSize:13,lineHeight:22},footnote:{color:C.muted,fontSize:11,lineHeight:18},pillRow:{flexDirection:'row',gap:7,alignItems:'center',paddingVertical:5},dayPicker:{flexDirection:'row',alignItems:'center',gap:7,paddingVertical:7,paddingHorizontal:1},pill:{borderWidth:1,borderColor:C.line,backgroundColor:C.card,borderRadius:22,minHeight:36,paddingHorizontal:14,justifyContent:'center',alignItems:'center'},pillText:{fontSize:12,color:C.ink,fontWeight:'800'},
 statsRow:{flexDirection:'row',gap:8,justifyContent:'space-between',alignItems:'stretch'},stat:{flex:1,backgroundColor:C.card,borderRadius:16,paddingVertical:13,paddingHorizontal:9,alignItems:'center',gap:4},statNum:{color:C.ink,fontSize:22,fontWeight:'900'},
 wordRow:{minHeight:73,backgroundColor:C.card,borderWidth:1,borderColor:C.line,borderRadius:14,paddingHorizontal:15,paddingVertical:12,marginBottom:8,flexDirection:'row',alignItems:'center',gap:11},wordRowEn:{fontSize:17,fontWeight:'900',color:C.ink},wordRowKo:{fontSize:12,color:C.muted,marginTop:4},
 studyTop:{height:72,width:'100%',maxWidth:650,alignSelf:'center',flexDirection:'row',alignItems:'center',paddingHorizontal:11,gap:5},studyScroll:{flexGrow:1,padding:17,paddingTop:3,paddingBottom:22,justifyContent:'center',maxWidth:650,width:'100%',alignSelf:'center'},studyStage:{alignItems:'center',marginBottom:15},stageText:{color:C.muted,fontSize:12,fontWeight:'800',backgroundColor:'#F3EDDA',borderRadius:99,paddingHorizontal:14,paddingVertical:8,overflow:'hidden'},studyCard:{backgroundColor:C.card,borderRadius:25,borderWidth:1,borderColor:C.line,padding:20,...base},studyCardTop:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},audio:{minHeight:38,minWidth:65,backgroundColor:'#FAF6EC',borderRadius:99,alignItems:'center',justifyContent:'center',paddingHorizontal:11},audioText:{fontSize:12,fontWeight:'900',color:C.dark},studyCardWord:{minHeight:238,alignItems:'center',justifyContent:'center',gap:24},bigWord:{fontWeight:'800',color:C.ink,textAlign:'center',letterSpacing:-1},tapHint:{backgroundColor:'#F7F4EE',paddingVertical:8,paddingHorizontal:14,borderRadius:99,overflow:'hidden',fontSize:11,color:C.muted},revealed:{borderTopWidth:1,borderTopColor:C.line,paddingTop:18,alignItems:'center'},meaning:{color:C.ink,fontSize:19,fontWeight:'800',textAlign:'center',lineHeight:28},exampleBox:{width:'100%',backgroundColor:C.bg,borderLeftWidth:3,borderRadius:18,padding:15,marginTop:20,gap:7},exampleHeader:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:10},exampleTitle:{color:C.muted,fontSize:11,fontWeight:'900',flex:1},exampleEn:{color:C.ink,fontWeight:'700',fontSize:17,lineHeight:27},exampleKo:{fontSize:13,lineHeight:21,color:C.muted},qualityWarning:{color:'#966A17',fontSize:10,lineHeight:16,marginTop:4},exampleButtons:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginTop:8},answerArea:{backgroundColor:C.bg,borderTopWidth:1,borderTopColor:C.line,paddingHorizontal:17,paddingTop:11,paddingBottom:17,maxWidth:760,width:'100%',alignSelf:'center'},answerNote:{color:C.muted,fontSize:11,textAlign:'center',marginBottom:8},answerRow:{flexDirection:'row',gap:10},answerButton:{flex:1,minHeight:64,alignItems:'center',justifyContent:'center',borderRadius:14,gap:4},answerTitle:{color:C.ink,fontWeight:'900',fontSize:15},answerSub:{color:'#615B4E',fontSize:11},disabled:{opacity:.4},
 summaryIcon:{width:70,height:70,borderRadius:35,backgroundColor:'#E6F2E6',alignItems:'center',justifyContent:'center',alignSelf:'center'},searchInput:{borderRadius:15,backgroundColor:C.card,borderWidth:1,borderColor:C.line,paddingHorizontal:16,minHeight:50,fontSize:16,color:C.ink,marginTop:12,marginBottom:8},resultCount:{color:C.muted,fontSize:12,fontWeight:'800',paddingVertical:10},empty:{padding:20,textAlign:'center',fontSize:14,color:C.muted},saveBanner:{backgroundColor:'#FFF0D2',padding:11,flexDirection:'row',alignItems:'center',justifyContent:'space-between'}
});
