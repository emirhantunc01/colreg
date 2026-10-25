import {useEffect, useRef, useState} from 'react';
import {ArrowUpRight, Search, ChevronRight} from 'lucide-react';
import {parseReference, searchRules, sourceHref, type Reference} from './reference';
import './reference.css';

type Props = {
 selectedId?: string;
 onSelect: (id:string)=>void;
 onEncounter: (id:string)=>void;
 encounters: {id:string; title:string; ruleIds?:string[]}[];
};

export default function ReferenceLibrary({selectedId='rule-1',onSelect,onEncounter,encounters}:Props) {
 const [data,setData]=useState<Reference|null>(null);
 const [error,setError]=useState('');
 const [query,setQuery]=useState('');
 const [part,setPart]=useState('All');
 const [retry,setRetry]=useState(0);
 const [indexOpen,setIndexOpen]=useState(()=>!window.matchMedia('(max-width: 720px)').matches);
 const article=useRef<HTMLElement>(null);
 useEffect(()=>{
  const abort=new AbortController();
  setError('');
  fetch(`${import.meta.env.BASE_URL}content/rules.json`,{signal:abort.signal})
   .then(response=>{if(!response.ok)throw Error('The reference library could not load.');return response.json()})
   .then(raw=>setData(parseReference(raw)))
   .catch(reason=>{if(reason.name!=='AbortError')setError(reason.name==='ZodError'?'The source index contains invalid data.':reason.message)});
  return()=>abort.abort();
 },[retry]);
 useEffect(()=>{
  const media=window.matchMedia('(max-width: 720px)');
  const change=()=>setIndexOpen(!media.matches);
  media.addEventListener('change',change);
  return()=>media.removeEventListener('change',change);
 },[]);
 const records=data?searchRules(data.records,query).filter(record=>part==='All'||(part==='Annexes'?record.id.startsWith('annex'):record.part===part)):[];
 const active=data?.records.find(record=>record.id===selectedId);
 const relatedEncounters=encounters.filter(encounter=>encounter.ruleIds?.includes(selectedId));
 const select=(id:string)=>{
  onSelect(id);
  if(window.matchMedia('(max-width: 720px)').matches){setIndexOpen(false);article.current?.scrollIntoView({block:'start',behavior:'instant'})}
 };
 return <main className="reference-library">
  <div className="reference-layout">
   <aside className="reference-index" aria-label="Rule index">
    <h1>Rules</h1>
    <p>41 rules and four annexes.<br/>Read the source. Return to the scene.</p>
    <label className="reference-search"><Search size={18}/><input type="search" value={query} onChange={event=>{setQuery(event.target.value);setIndexOpen(true)}} placeholder="Number, title or term" aria-label="Search rules"/></label>
    <label className="reference-filter">Browse <select value={part} onChange={event=>{setPart(event.target.value);setIndexOpen(true)}}><option>All</option>{['A','B','C','D','E','F'].map(value=><option key={value} value={value}>Part {value}</option>)}<option>Annexes</option></select></label>
    <details className="rule-index-records" open={indexOpen} onToggle={event=>setIndexOpen(event.currentTarget.open)}>
     <summary>{records.length} reference entries</summary>
     <nav aria-label="Rules and annexes">{records.map(record=><button key={record.id} aria-current={selectedId===record.id?'page':undefined} onClick={()=>select(record.id)}><span>{record.id.startsWith('annex')?'Annex':'Rule'} {record.number}</span><strong>{record.title}</strong><ChevronRight size={14}/></button>)}</nav>
     {!records.length&&data&&<p className="reference-empty">No matches. Try another rule number or term.</p>}
    </details>
   </aside>
   <article className="reference-article" ref={article} aria-live="polite">
    {error?<div className="reference-error" role="alert"><h2>Reference unavailable</h2><p>{error}</p><button onClick={()=>setRetry(value=>value+1)}>Try again</button></div>:!data?<p role="status">Loading source material…</p>:!active?<div className="reference-error"><h2>Reference not found</h2><p>This address does not match a rule or annex in the source index.</p><button onClick={()=>select('rule-1')}>Open Rule 1</button></div>:<>
     <header className="reference-article-heading"><h2><span>{active.id.startsWith('annex')?'Annex':'Rule'} {active.number}</span>{active.title}</h2><p>{active.id.startsWith('annex')?'Technical reference':`Part ${active.part}`} · English learning explanation</p></header>
     <p className="reference-lede">{active.summary}</p>
     {[['When it applies',active.conditions],['What the rule requires',active.duties],['Conditions & exceptions',active.exceptions]].map(([title,items])=>(items as string[]).length>0&&<section key={title as string}><h3>{title as string}</h3><ul>{(items as string[]).map((text,index)=><li key={index}>{text}</li>)}</ul></section>)}
     <section className="reference-source"><h3>Original source</h3><p>{data.source.title} · PDF pages {active.pages.join(', ')}</p><p className="source-explanation">The Turkish text is preserved below. The explanation above is authored for this learning tool.</p>{active.notes.map(note=><p className="reference-discrepancy" key={note}>{note}</p>)}
      <div className="reference-page-links">{active.pages.map(page=><a key={page} href={sourceHref(import.meta.env.BASE_URL,data.source.file,page)} target="_blank" rel="noreferrer">PDF page {page}<ArrowUpRight size={15}/></a>)}</div>
      <details><summary>Read Turkish source · {active.clauses.length} segments</summary><div lang="tr">{active.clauses.map(clause=><section key={clause.id}><small>{clause.id} · p. {clause.pages.join(', ')}</small><p>{clause.text}</p></section>)}</div></details>
      <details><summary>Original page layout, tables & figures</summary>{active.pages.map(page=><figure key={page}><a href={sourceHref(import.meta.env.BASE_URL,data.source.file,page)} target="_blank" rel="noreferrer"><img loading="lazy" src={`${import.meta.env.BASE_URL}content/pages/page-${page}.webp`} alt={`Original Turkish source, PDF page ${page}`}/></a><figcaption>PDF page {page} · open PDF for full resolution</figcaption></figure>)}</details>
     </section>
    </>}
   </article>
   {active&&<aside className="reference-connections" aria-label="Related scenes and source">
    {relatedEncounters.length>0&&<section><h3>Explore in motion</h3><div className="reference-encounters">{relatedEncounters.map(encounter=><button key={encounter.id} onClick={()=>onEncounter(encounter.id)}>{encounter.title}<ArrowUpRight size={17}/></button>)}</div></section>}
    {active.related.length>0&&<section><h3>Read together</h3><div className="reference-related">{active.related.map(id=><button key={id} onClick={()=>{select(id);setPart('All');setQuery('')}}>{data?.records.find(record=>record.id===id)?.title??id}<ChevronRight size={15}/></button>)}</div></section>}
    <section><h3>Source pages</h3><div className="reference-page-links">{active.pages.map(page=><a key={page} href={sourceHref(import.meta.env.BASE_URL,data!.source.file,page)} target="_blank" rel="noreferrer">PDF page {page}<ArrowUpRight size={15}/></a>)}</div><p>Original Turkish source. English explanations and animation assumptions are separate.</p></section>
   </aside>}
  </div>
 </main>;
}
