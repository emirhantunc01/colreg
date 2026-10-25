import {z} from 'zod';
const pages=z.array(z.number().int().positive()).min(1);
const ruleSchema=z.object({id:z.string().regex(/^(rule-\d+|annex-[1-4])$/),number:z.union([z.number(),z.string()]),title:z.string().min(1),part:z.string(),summary:z.string().min(1),conditions:z.array(z.string()),duties:z.array(z.string()),exceptions:z.array(z.string()),related:z.array(z.string()),keywords:z.array(z.string()),notes:z.array(z.string()).default([]),pages,clauses:z.array(z.object({id:z.string(),text:z.string(),pages})).min(1),sourceText:z.string().min(1)});
const referenceSchema=z.object({source:z.object({title:z.string(),file:z.string().regex(/^content\/[-a-z0-9]+\.pdf$/),sha256:z.string().regex(/^[a-f0-9]{64}$/),pages:z.number().int().positive()}),records:z.array(ruleSchema).refine(a=>new Set(a.map(r=>r.id)).size===a.length,'Duplicate source identifiers')}).superRefine((data,ctx)=>{for(const r of data.records){if([...r.pages,...r.clauses.flatMap(c=>c.pages)].some(p=>p>data.source.pages))ctx.addIssue({code:'custom',message:'Source page out of range'});for(const id of r.related)if(!data.records.some(other=>other.id===id))ctx.addIssue({code:'custom',message:`Unknown related rule ${id}`});}});
export type RuleRecord=z.infer<typeof ruleSchema>;
export type Reference=z.infer<typeof referenceSchema>;
export const parseReference=(input:unknown):Reference=>referenceSchema.parse(input);
export function searchRules(records:RuleRecord[],query:string){const q=query.toLocaleLowerCase().trim();return records.filter(r=>`${r.id} ${r.number} ${r.title} ${r.summary} ${r.keywords.join(' ')}`.toLocaleLowerCase().includes(q));}
export const sourceHref=(base:string,file:string,page:number)=>`${base.replace(/\/?$/,'/')}${file}#page=${page}`;
