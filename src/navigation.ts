export type LearningSection='encounters'|'lights'|'signals'|'rules';
export type AppRoute={section:'intro'}|{section:'encounters';encounterId?:string}|{section:'lights';profileId?:string}|{section:'signals';signalId?:string}|{section:'rules';ruleId?:string};
export function parseRoute(hash:string):AppRoute{
 if(!hash||hash==='#')return {section:'intro'};
 if(hash==='#studio')return {section:'encounters',encounterId:'head-on-powered'};
 try{
  const [base,section,id,...rest]=hash.replace(/^#/,'').split('/').map(decodeURIComponent);
  if(base!=='studio'||rest.length||(id&&!/^[a-z0-9-]+$/.test(id)))return {section:'encounters'};
  switch(section){
   case 'encounters':return id?{section,encounterId:id}:{section};
   case 'lights':return id?{section,profileId:id}:{section};
   case 'signals':return id?{section,signalId:id}:{section};
   case 'rules':return id?{section,ruleId:id}:{section};
   default:return {section:'encounters'};
  }
 }catch{return {section:'encounters'};}
}
export function routeHash(route:AppRoute){
 if(route.section==='intro')return '';
 const id=route.section==='encounters'?route.encounterId:route.section==='lights'?route.profileId:route.section==='signals'?route.signalId:route.ruleId;
 return `#studio/${route.section}${id?`/${encodeURIComponent(id)}`:''}`;
}
