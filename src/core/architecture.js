const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const mean=(values)=>values.length?values.reduce((sum,value)=>sum+value,0)/values.length:0;
export class CognitiveArchitecture{
  constructor(scenario){
    this.scenario=scenario;this.cycle=0;this.memory=new Map();this.edges=new Map();this.attention=new Set();this.threads=[];this.lastReflection='';this.lastStrengthened=[];this.lastCandidates=[];
    scenario.nodes.forEach((node)=>this.memory.set(node.name,{...node,activation:node.base??0}));
    scenario.edges.forEach(([a,b,weight])=>this._setEdge(a,b,weight));
    scenario.seedAttention.forEach((name)=>this.attention.add(name));
  }
  step(inputText='',params={}){
    const novelty=params.novelty??0.55;const constraint=params.constraint??0.45;const metacognition=params.metacognition??0.5;const decay=params.decay??0.12;
    this.cycle+=1;this._decay(decay);const inputHits=this._ingestInput(inputText,novelty);const search=this._spreadActivation(constraint);this.lastCandidates=Object.entries(search).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([name,score])=>({name,score}));
    const selected=this._selectFocus(search,params.focusSize??4);selected.forEach((name)=>this.attention.add(name));const thread=this._composeThread([...inputHits,...selected],metacognition);this.threads.unshift(thread);this.threads=this.threads.slice(0,8);this._learnFromCoactivity(thread.nodes,novelty);this.lastReflection=this._reflect(metacognition,constraint);return this.snapshot();
  }
  snapshot(){
    const nodes=[...this.memory.values()].map((node)=>({...node})).sort((a,b)=>b.activation-a.activation);
    return{cycle:this.cycle,nodes,attention:[...this.attention],threads:this.threads,lastReflection:this.lastReflection,lastStrengthened:this.lastStrengthened,lastCandidates:this.lastCandidates,topEdges:this.getTopEdges(12)};
  }
  getTopEdges(limit=12){
    return[...this.edges.entries()].map(([key,weight])=>{const[a,b]=key.split('|');return{a,b,weight,active:this.attention.has(a)||this.attention.has(b),primed:this.memory.get(a)?.activation>0.45&&this.memory.get(b)?.activation>0.45};}).sort((x,y)=>y.weight-x.weight).slice(0,limit);
  }
  _decay(amount){this.memory.forEach((node)=>{node.activation=clamp(node.activation*(1-amount)+((node.base??0)*amount),0,1);});if(this.attention.size>6){this.attention=new Set([...this.attention].slice(-6));}}
  _ingestInput(text,novelty){const hits=[];const normalized=text.toLowerCase();this.memory.forEach((node,name)=>{const terms=[name,...(node.tags??[])].map((term)=>term.toLowerCase());if(terms.some((term)=>normalized.includes(term))){node.activation=clamp(node.activation+0.28+novelty*0.18,0,1);this.attention.add(name);hits.push(name);}});return hits;}
  _spreadActivation(constraint){const scores={};this.edges.forEach((weight,key)=>{const[a,b]=key.split('|');const nodeA=this.memory.get(a);const nodeB=this.memory.get(b);if(!nodeA||!nodeB)return;const bidirectional=weight*(0.45+constraint*0.55);scores[b]=(scores[b]??0)+nodeA.activation*bidirectional;scores[a]=(scores[a]??0)+nodeB.activation*bidirectional;});return scores;}
  _selectFocus(scores,focusSize){return Object.entries(scores).sort((a,b)=>b[1]-a[1]).slice(0,focusSize).map(([name])=>{const node=this.memory.get(name);node.activation=clamp(node.activation+0.18,0,1);return name;});}
  _composeThread(candidates,metacognition){const unique=[...new Set(candidates)].filter((name)=>this.memory.has(name));const active=unique.length?unique:[...this.memory.values()].sort((a,b)=>b.activation-a.activation).slice(0,3).map((node)=>node.name);const averageActivation=mean(active.map((name)=>this.memory.get(name).activation));const tension=this._findTension(active);const integration=clamp(averageActivation*(0.65+metacognition*0.35)-(tension?0.08:0),0,1);return{cycle:this.cycle,nodes:active,integration,tension,summary:this._summarize(active,integration,tension)};}
  _summarize(nodes,integration,tension){const labels=nodes.map((name)=>this.memory.get(name)?.label??name);const phrase=labels.slice(0,3).join(' + ');if(tension)return`${phrase} are active, with unresolved pressure around ${tension}.`;if(integration>0.68)return`${phrase} are cohering into a stable interpretation.`;return`${phrase} are being compared through iterative updating.`;}
  _findTension(nodes){for(const a of nodes){for(const b of nodes){if(a===b)continue;const edge=this._getEdge(a,b);if(edge<0)return`${a} / ${b}`;}}return'';}
  _learnFromCoactivity(nodes,novelty){this.lastStrengthened=[];for(let i=0;i<nodes.length;i++){for(let j=i+1;j<nodes.length;j++){const changed=this._strengthen(nodes[i],nodes[j],0.02+novelty*0.03);if(changed)this.lastStrengthened.push(changed);}}this.lastStrengthened.sort((a,b)=>b.delta-a.delta);}
  _reflect(metacognition,constraint){const top=[...this.memory.values()].sort((a,b)=>b.activation-a.activation).slice(0,3).map((node)=>node.label);const openness=metacognition>0.58?'watching its own updates':'updating through association';const pressure=constraint>0.6?'while constraints narrow the search':'while possibilities remain broad';return`The system is ${openness}, holding ${top.join(', ')} ${pressure}.`;}
  _key(a,b){return[a,b].sort().join('|');}
  _getEdge(a,b){return this.edges.get(this._key(a,b))??0;}
  _setEdge(a,b,weight){this.edges.set(this._key(a,b),weight);}
  _strengthen(a,b,delta){const key=this._key(a,b);const before=this.edges.get(key)??0;const after=clamp(before+delta,-1,1);this.edges.set(key,after);return{a,b,before,after,delta:after-before};}
}
