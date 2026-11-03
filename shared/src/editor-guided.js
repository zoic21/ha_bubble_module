/* @include shared/src/editor-base.js */
// UI adapters only. Stored keys and card runtimes stay independent of this form.
if (typeof customElements !== 'undefined' && !customElements.get('ha-form-signature_guided_v1')) {
  const same = (a,b) => JSON.stringify(a) === JSON.stringify(b);
  const object = value => value && typeof value === 'object' && !Array.isArray(value);
  const template = value => typeof value === 'string' && /\{[\{%#]/.test(value);
  const text = label => ({label,selector:{text:{}}});
  const numeric = (label,min,max,step=1) => ({label,selector:{number:{mode:'box',...(min==null?{}:{min}),...(max==null?{}:{max}),step}}});
  const select = (label,options) => ({label,selector:{select:{options:options.map(([value,label])=>({value,label})),mode:'dropdown'}}});
  const bool = label => ({label,selector:{boolean:{}}});
  const colors = [['blue','Bleu'],['teal','Turquoise'],['green','Vert'],['orange','Orange'],['amber','Ambre'],['yellow','Jaune'],['red','Rouge'],['pink','Rose'],['purple','Violet'],['grey','Gris']];
  const color = label => ({...select(label,colors),selector:{select:{options:colors.map(([value,label])=>({value,label})),custom_value:true}}});
  const leaf = (label,ui_kind,extra={}) => ({label,ui_kind,selector:{object:{}},...extra});
  const entity = label => ({label,selector:{entity:{}}});
  const many = label => ({label,selector:{entity:{multiple:true}}});
  const rgb = value => {
    if (typeof value !== 'string') return null;
    const short = /^#([a-f\d])([a-f\d])([a-f\d])$/i.exec(value);
    if (short) return short.slice(1).map(x=>parseInt(x+x,16));
    const hex = /^#([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(value);
    if (hex) return hex.slice(1).map(x=>parseInt(x,16));
    const css = /^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/i.exec(value);
    return css && css.slice(1).every(x=>Number(x)<=255) ? css.slice(1).map(Number) : null;
  };
  const hex = value => '#'+value.map(x=>Math.round(x).toString(16).padStart(2,'0')).join('');
  const cardFor = form => {
    if (form._engine?._cardConfig) return form._engine._cardConfig;
    for (let node=form,depth=0;node&&depth<20;depth++) {
      node=node.getRootNode?.()?.host;
      if (node?._config) return node._config;
    }
    return {};
  };
  const targets = form => {
    const card=cardFor(form),sub=card.sub_button,buttons=[];
    const collect = list => {
      const items=Array.isArray(list)?list.filter(Boolean):[];
      items.forEach(item=>{if(Array.isArray(item.group))buttons.push(...item.group.filter(Boolean));});
      items.forEach(item=>{if(!Array.isArray(item.group))buttons.push(item);});
    };
    if(card.card_type!=='sub-buttons')collect(Array.isArray(sub)?sub:sub?.main);
    collect(Array.isArray(sub)?[]:sub?.bottom);
    const normalize = value => String(value).toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').trim().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
    return buttons.map((button,index)=>({value:button.css_class?normalize(button.css_class):String(index+1),label:`${index+1} — ${button.name||form.hass?.states?.[button.entity||card.entity]?.attributes?.friendly_name||button.entity||'Sous-bouton'}`}));
  };
  const presets = {
    illustration: {
      image:text('Image par défaut — URL ou template'),image_light:text('Image en thème clair'),image_dark:text('Image en thème sombre'),
      columns:numeric('Colonnes de la planche',1),rows:numeric('Lignes de la planche',1),
      index:leaf('Case de la planche (à partir de 0)','number',{ui_selector:{number:{min:0,step:1,mode:'box'}}}),
      index_dark:leaf('Case en thème sombre','number',{ui_selector:{number:{min:0,step:1,mode:'box'}}}),
      offset_x:leaf('Cadrage horizontal (%)','number',{ui_selector:{number:{min:-50,max:50,step:1,mode:'box'}}}),
      offset_y:leaf('Cadrage vertical (%)','number',{ui_selector:{number:{min:-50,max:50,step:1,mode:'box'}}}),
      offset_y_dark:leaf('Cadrage vertical sombre (%)','number',{ui_selector:{number:{min:-50,max:50,step:1,mode:'box'}}}),
      width_ratio:numeric('Largeur réservée (ratio)',0.01,1,0.01),media_artwork:bool('Privilégier la pochette du lecteur')
    },
    thresholds: {
      enabled:{...bool('Activer les seuils'),default:true},background:{...bool('Colorer aussi le fond'),default:true},
      transition:{...select('Transition',[['smooth','Progressive'],['hard','Par paliers']]),default:'smooth'},
      values:leaf('Seuils','list',{ui_fields:{value:numeric('Valeur'),color:leaf('Couleur','rgb')},ui_label_field:'value'}),
      entity:entity('Autre entité source (facultatif)'),attribute:{label:'Attribut source (facultatif)',selector:{attribute:{}}}
    },
    fill:{enabled:{...bool('Activer le remplissage'),default:true},ui_reference:select('Référence',[['entity','Entité du total'],['max','Maximum fixe']]),reference_entity:entity('Entité du total'),max:numeric('Maximum fixe'),color:leaf('Couleur','color')},
    progress:{value:leaf('Progression (%)','number',{ui_selector:{number:{min:0,max:100,step:1,mode:'box'}}}),color:leaf('Couleur','color')},
    style:{
      type:select('Présentation',[['default','Standard'],['badge','Badge'],['command','Commande avec libellé'],['switch','Interrupteur'],['mode_badge','Badge Auto / Manuel']]),
      color:leaf('Couleur','color'),background:leaf('Fond','background'),icon_color:leaf('Couleur de l’icône','color'),
      active:leaf('Commande active','bool'),disabled:leaf('Commande désactivée','bool'),opacity:leaf('Opacité','number',{ui_selector:{number:{min:0,max:1,step:0.05,mode:'slider'}}}),
      color_thresholds:leaf('Couleurs selon la valeur','thresholds'),position:select('Position du badge',[['default','Standard'],['bottom-right','En bas à droite']]),column:numeric('Colonne du bandeau',1,3)
    },
    information:{
      entity:entity('Entité'),name:text('Libellé — texte ou template'),state:leaf('Valeur personnalisée','text'),secondary:leaf('Détail','text'),
      icon:leaf('Icône','icon'),color:leaf('Couleur','color'),enabled:leaf('Afficher cette information','bool'),
      tap_action:{label:'Action au clic',selector:{ui_action:{}}},statistics:leaf('Statistiques de la valeur','statistics'),secondary_statistics:leaf('Statistiques du détail','statistics')
    },
    statistics:{statistic_ids:many('Compteurs à additionner'),subtract_statistic_ids:many('Compteurs à soustraire'),part_statistic_ids:many('Compteurs de la part'),operation:select('Calcul',[['sum','Somme'],['remaining_percentage','Pourcentage restant']]),unit:text('Unité'),decimals:numeric('Décimales',0,6),factor:numeric('Multiplicateur',0.001,null,0.001),time_zone:text('Fuseau horaire (vide : Home Assistant)')},
    animation:{ui_custom:bool('Personnaliser l’animation de cet emplacement'),speed:numeric('Vitesse (px/s)',1),max_arrows:numeric('Nombre maximal de flèches',1,12),reference:numeric('Référence pour le maximum de flèches',1)}
  };
  for (const [name,field] of Object.entries(presets.illustration)) if(!['image','image_light','image_dark'].includes(name))field.group='Planche et cadrage (avancé)';
  for(const name of ['entity','attribute'])presets.thresholds[name].group='Source avancée';
  for(const name of ['position','column','opacity','icon_color','color_thresholds'])presets.style[name].group='Apparence avancée';
  for(const name of ['tap_action','statistics','secondary_statistics'])presets.information[name].group='Actions et statistiques (avancé)';
  for(const [name,field] of Object.entries(presets.animation))if(name!=='ui_custom'){
    field.visible_if='item.ui_custom === true';field.ui_clear_empty=true;field.description='Vide : hériter de l’animation commune.';
  }
  const scalar = kind => ['bool','number','color','background','text','source','icon','rgb','palette','strings','json'].includes(kind);
  const modeFor = (kind,data) => {
    if(data===undefined||data===null)return 'auto';
    if(kind==='background'&&data===false)return 'none';
    if(template(data))return 'template';
    if(kind==='source')return typeof data==='string'?(/^[a-z_][a-z0-9_]*\.[a-z0-9_]+$/.test(data)?'entity':'value'):'yaml';
    if(kind==='bool')return typeof data==='boolean'?'value':'yaml';
    if(kind==='number')return typeof data==='number'&&Number.isFinite(data)?'value':'yaml';
    if(kind==='rgb')return rgb(data)?'value':'yaml';
    if(kind==='palette')return typeof data==='string'&&data.split(',').length===3&&data.split(',').every(x=>rgb(x.trim()))?'value':'yaml';
    if(kind==='strings')return Array.isArray(data)&&data.every(x=>typeof x==='string')?'value':'yaml';
    return typeof data==='string'?'value':'yaml';
  };
  const displayObject = (original,schema) => {
    const out=object(original)?{...original}:{};
    for(const [key,field]of Object.entries(schema.fields||{}))if(out[key]===undefined&&field.default!==undefined&&!field.ui_kind)out[key]=field.default;
    if(schema.ui_profile==='flow_slot')out.enabled=!!original&&original.enabled!==false;
    if(schema.fields?.value_presentation?.ui_only)out.value_presentation=out.compact_mode!=='value'?'standard':out.value_style!=='button'?'large':out.value_background===false?'plain':'pill';
    return out;
  };
  const cleanObject = (value,original,schema,baseline=displayObject(original,schema)) => {
    const out=object(original)?{...original}:{};
    for(const [key,input]of Object.entries(value||{})){
      const field=schema.fields?.[key];
      if(key.startsWith('ui_')||field?.ui_only||same(input,baseline[key]))continue;
      if(input===undefined||(field?.ui_clear_empty&&(input===null||input==='')))delete out[key];else out[key]=input;
    }
    if(value.value_presentation!==undefined&&!same(value.value_presentation,baseline.value_presentation)){
      const view=value.value_presentation;
      out.compact_mode=view==='standard'?'default':'value';
      if(view!=='standard')out.value_style=view==='large'?'text':'button';
      if(view==='pill'||view==='plain')out.value_background=view==='pill';
    }
    return out;
  };
  const display = form => {
    const kind=form.schema.ui_kind,data=form._draftBase===form.data&&form._draft!==undefined?form._draft:form.data;
    if(!kind)return displayObject(data,form.schema);
    if(['list','styles'].includes(kind)){
      const valid=data===undefined||(kind==='list'?Array.isArray(data):object(data));
      return {edit_mode:valid?(form._mode||'form'):'yaml',raw:data};
    }
    if(scalar(kind)){
      const mode=form._mode||modeFor(kind,data),out={input_mode:mode,raw:data,template:typeof data==='string'?data:''};
      out.value=data==null?(form.schema.ui_default??(kind==='bool'?false:undefined)):data;
      if(kind==='rgb')out.value=rgb(data)||[128,128,128];
      if(kind==='palette')for(let i=0;i<3;i++)out['color_'+i]=rgb(typeof data==='string'?data.split(',')[i]?.trim():'')||[128,128,128];
      return out;
    }
    const out=displayObject(kind==='source_object'&&typeof data==='string'?{entity:data}:data,form.schema);
    const supported=object(data)||(kind==='source_object'&&typeof data==='string')||(kind==='segments'&&Array.isArray(data));
    out.edit_mode=form._mode||(data!==undefined&&!supported?'yaml':'form');out.raw=data;
    if(kind==='fill')out.ui_reference=form._reference||(out.reference_entity?'entity':'max');
    if(kind==='animation')out.ui_custom=form._custom??['speed','max_arrows','reference'].some(key=>data?.[key]!=null);
    if(kind==='locals')out.ui_sources=form._sources||Object.keys(data||{}).filter(key=>form.schema.ui_source_names?.[key]);
    if(kind==='segments')for(const [i,name]of ['network','solar','battery'].entries())out[name]=data?.[i]||{};
    return out;
  };
  const fieldsFor = form => {
    const schema=form.schema,kind=schema.ui_kind;
    if(scalar(kind)){
      const choices=[['auto','Par défaut'],['value',kind==='source'?'Texte fixe':'Valeur simple']];
      if(kind==='background')choices.push(['none','Sans fond']);
      if(kind==='source')choices.push(['entity','Entité']);
      if(schema.ui_template!==false&&!['rgb','strings'].includes(kind))choices.push(['template','Template Jinja']);
      choices.push(['yaml','YAML avancé']);
      const fields={input_mode:select('Source / mode',choices)};
      let field=kind==='bool'?bool('Valeur'):kind==='number'?{label:'Valeur',selector:schema.ui_selector||{number:{mode:'box',step:'any'}}}:['color','background'].includes(kind)?{label:'Couleur',selector:schema.ui_selector?.select?schema.ui_selector:color('Couleur').selector}:kind==='icon'?{label:'Icône',selector:{icon:{}}}:kind==='rgb'?{label:'Couleur',selector:{color_rgb:{}}}:kind==='strings'?{label:'Éléments',selector:{select:{multiple:true,custom_value:true,options:(Array.isArray(form.data)?form.data:[]).map(value=>({value,label:value}))}}}:text('Valeur');
      if(kind==='palette')for(let i=0;i<3;i++)fields['color_'+i]={label:'Couleur '+(i+1),selector:{color_rgb:{}},visible_if:"item.input_mode === 'value'"};
      else fields.value={...field,visible_if:"item.input_mode === 'value'"};
      if(kind==='source')fields.value={...entity('Entité'),visible_if:"item.input_mode === 'entity'"},fields.fixed={...text('Texte fixe'),visible_if:"item.input_mode === 'value'"};
      fields.template={label:'Template Jinja',selector:{template:{}},visible_if:"item.input_mode === 'template'"};
      fields.raw={label:'Valeur YAML',selector:{object:{}},visible_if:"item.input_mode === 'yaml'"};
      return fields;
    }
    let fields={...(schema.ui_fields||presets[kind]||{})};
    if(kind==='illustration'){
      const module=cardFor(form).modules||[];
      if(!module.includes('signature_panel')){delete fields.width_ratio;delete fields.media_artwork;}
      if(!module.includes('signature_panel')&&!module.includes('signature_square')){delete fields.index_dark;delete fields.offset_y_dark;}
    }
    if(kind==='style'){
      const modules=cardFor(form).modules||[];
      const allowed=['default','badge',...(modules.some(x=>['signature_room','signature_panel'].includes(x))?['command']:[]),...(modules.includes('signature_compact')?['switch','mode_badge']:[])];
      fields.type={...fields.type,selector:{select:{options:presets.style.type.selector.select.options.filter(x=>allowed.includes(x.value)||x.value===form.data?.type),custom_value:true}}};
      for(const key of ['active','disabled'])fields[key]={...fields[key],visible_if:"item.type === 'command'"};
      if(!modules.includes('signature_panel')){delete fields.position;delete fields.column;}
    }
    if(kind==='fill'){
      fields.reference_entity={...fields.reference_entity,visible_if:"item.ui_reference === 'entity'"};fields.max={...fields.max,visible_if:"item.ui_reference === 'max'"};
    }
    if(kind==='locals'){
      fields.ui_sources={...select('Ajouter ou retirer des mesures locales',Object.entries(schema.ui_source_names||{})),selector:{select:{multiple:true,options:Object.entries(schema.ui_source_names||{}).map(([value,label])=>({value,label}))}}};
      for(const [key,field]of Object.entries(fields))if(key!=='ui_sources')fields[key]={...field,visible_if:`(item.ui_sources || []).includes('${key}')`};
    }
    if(kind==='segments')fields=Object.fromEntries(['network','solar','battery'].map((name,i)=>[name,leaf(['Réseau','Solaire','Batterie'][i],'object',{ui_fields:{name:text('Nom'),color:leaf('Couleur','color')}})]));
    const normal={};
    for(const [key,field]of Object.entries(fields))normal[key]={...field,visible_if:field.visible_if?`item.edit_mode !== 'yaml' && (${field.visible_if})`:"item.edit_mode !== 'yaml'"};
    return {edit_mode:{...select('Édition',[['form','Formulaire'],['yaml','YAML avancé']]),ui_only:true},...normal,raw:{label:'Valeur YAML complète',ui_only:true,selector:{object:{}},visible_if:"item.edit_mode === 'yaml'"}};
  };
  const clean = (form,value) => {
    const kind=form.schema.ui_kind,original=form._draftBase===form.data&&form._draft!==undefined?form._draft:form.data,baseline=display(form);
    if(['list','styles'].includes(kind)){form._mode=value.edit_mode||baseline.edit_mode;return form._mode==='yaml'?value.raw:original;}
    if(!kind)return cleanObject(value,original,form.schema,baseline);
    if(scalar(kind)){
      const mode=value.input_mode||baseline.input_mode;form._mode=mode;
      if(mode==='auto')return undefined;
      if(mode==='none')return false;
      if(mode==='yaml')return value.raw;
      if(mode==='template')return same(value.template,baseline.template)?original:value.template||undefined;
      if(kind==='palette'){
        const parts=typeof original==='string'?original.split(','):[];
        if(parts.length===3&&[0,1,2].every(i=>rgb(parts[i].trim())&&same(value['color_'+i],baseline['color_'+i])))return original;
        return [0,1,2].map(i=>same(value['color_'+i],baseline['color_'+i])&&rgb(parts[i]?.trim())?parts[i].trim():hex(value['color_'+i]||[128,128,128])).join(',');
      }
      if(kind==='rgb')return same(value.value,baseline.value)?original:value.value==null?undefined:hex(value.value);
      if(kind==='source')return mode==='entity'?value.value:value.fixed;
      return value.value;
    }
    form._mode=value.edit_mode||baseline.edit_mode;
    if(form._mode==='yaml')return value.raw;
    if(kind==='fill')form._reference=value.ui_reference;
    if(kind==='animation')form._custom=value.ui_custom;
    if(kind==='locals')form._sources=value.ui_sources||[];
    const edited=Object.keys(value).some(key=>!['edit_mode','raw','ui_reference','ui_custom','ui_sources'].includes(key)&&!same(value[key],baseline[key]));
    const fixed=kind==='fill'&&value.ui_reference==='max'&&baseline.ui_reference!=='max'&&original?.max!=null;
    if(!edited&&!fixed&&!(kind==='animation'&&value.ui_custom===false&&baseline.ui_custom!==false)&&!(kind==='locals'&&!same(value.ui_sources,baseline.ui_sources)))return original;
    const normalized=kind==='source_object'&&typeof original==='string'?{entity:original}:original;
    const out=cleanObject(value,normalized,form.schema,baseline);
    if(kind==='fill'){
      form._reference=value.ui_reference;
      if(value.ui_reference==='max'&&(fixed||!same(value.max,baseline.max)))delete out.reference_entity;
    }
    if(kind==='animation'){
      form._custom=value.ui_custom;
      if(value.ui_custom===false)for(const key of ['speed','max_arrows','reference'])delete out[key];
    }
    if(kind==='locals'){
      form._sources=value.ui_sources||[];
      for(const key of Object.keys(form.schema.ui_source_names||{}))if(!form._sources.includes(key))delete out[key];
    }
    if(kind==='segments'){
      const entries=Array.isArray(original)?[...original]:[];
      for(const [i,key]of ['network','solar','battery'].entries())if(!same(value[key],baseline[key])){while(entries.length<=i)entries.push({});entries[i]=value[key];}
      return entries.length?entries:undefined;
    }
    if(kind==='source_object'){
      if(!out.entity)delete out.entity;
      if(typeof original==='string'&&Object.keys(out).every(key=>key==='entity'))return out.entity;
    }
    return Object.keys(out).length?out:object(original)&&!Object.keys(original).length?original:undefined;
  };
  const expand = (form,entries,fields) => entries.map(field=>{
    if(field.schema)return {...field,type:field.type==='bc_group'&&customElements.get('ha-form-signature_group')?'signature_group':field.type,schema:expand(form,field.schema,fields)};
    const spec=fields?.[field.name];
    if(spec?.ui_kind){
      const {selector,...rest}=field,{selector:input,...meta}=spec;
      // HA chooses its selector renderer when selector is present, even if a
      // custom type exists. Only the guided component may own this field.
      return {...rest,...meta,ui_default:spec.default,...(input?.select?{ui_selector:input}:{}),...(spec.ui_fields?{}:spec.fields?{ui_fields:spec.fields}:{}),type:'signature_guided_v1',fields:{},show_label:true};
    }
    if(spec?.ui_unit_from&&field.selector?.number){const unit=form.hass?.states?.[form.data?.[spec.ui_unit_from]]?.attributes?.unit_of_measurement;return {...field,selector:{number:{...field.selector.number,...(unit?{unit_of_measurement:unit}:{})}}};}
    return field;
  });
  registerOptionsForm('ha-form-signature_guided_v1',{
    _setup(){
      this._errorEl=document.createElement('ha-alert');this._errorEl.setAttribute('alert-type','error');this._errorEl.hidden=true;
      this._summary=document.createElement('div');this._summary.setAttribute('style','color:var(--secondary-text-color);font-size:13px;margin:8px 0');
      this.shadowRoot.append(this._errorEl,this._summary);
    },
    _renderSpecial(){
      const kind=this.schema.ui_kind;
      const key=JSON.stringify(this.data);
      if(this._seenValue!==key&&this._emittedValue!==key){this._mode=undefined;this._custom=undefined;this._reference=undefined;this._sources=undefined;}
      this._seenValue=key;
      if(kind&&kind!=='list'&&kind!=='styles')this._schema={...this.schema,fields:fieldsFor(this)};
      if(kind==='list'||kind==='styles'){
        this._schema={...this.schema,fields:{edit_mode:{...select('Édition',[['form','Formulaire'],['yaml','YAML avancé']]),ui_only:true},raw:{label:'Valeur YAML complète',selector:{object:{}},visible_if:"item.edit_mode === 'yaml'"}}};
        const normal=display(this).edit_mode==='form';
        if(normal)this._updateList();if(this._list)this._list.hidden=!normal;
      }
      this._form.hidden=false;
      const profile=this.schema.ui_profile,card=cardFor(this);
      this._summary.textContent=profile==='group'?'Popup source : '+(this.data?.popup||card.button_action?.tap_action?.navigation_path||card.hash||'non définie'):'';
      return false;
    },
    _display(){const value=display(this);if(this.schema.ui_kind==='source')value.fixed=typeof this.data==='string'?this.data:'';return value;},
    _valueChanged(event){
      event.stopPropagation();if(this.disabled)return;
      const value=event.detail.value||{},kind=this.schema.ui_kind;
      const validRgb=value=>Array.isArray(value)&&value.length===3&&value.every(x=>typeof x==='number'&&Number.isFinite(x)&&x>=0&&x<=255);
      if(value.input_mode==='value'&&((kind==='palette'&&![0,1,2].every(i=>validRgb(value['color_'+i])))||(kind==='rgb'&&value.value!=null&&!validRgb(value.value)))){
        this._errorEl.textContent='Renseigner des couleurs RGB valides.';this._errorEl.hidden=false;return;
      }
      this._errorEl.hidden=true;
      const result=clean(this,value);
      if(this.schema.ui_kind==='number'&&typeof result==='number'&&!Number.isFinite(result))return;
      if(this.schema.ui_profile==='energy'){
        const groups=['imports','exports','solar','charges','discharges'];
        if(groups.some(key=>!same(result[key],this.data?.[key]))){
          const ids=groups.flatMap(key=>result[key]||[]);
          const error=ids.length>16?'16 sources au maximum.':new Set(ids).size!==ids.length?'Un compteur ne peut pas appartenir à plusieurs groupes.':'';
          this._errorEl.textContent=error;this._errorEl.hidden=!error;
          if(error){this._draftBase=this.data;this._draft=result;this._scheduleUpdate();return;}
          this._draft=undefined;
        }
      }
      this._scheduleUpdate();
      if(!same(result,this.data)){this._emittedValue=JSON.stringify(result);this._emit(result);}
    },
    _expand(entries,fields){return expand(this,entries,fields);},
    _updateList(){
      const mapping=this.schema.ui_kind==='styles';
      if(!this._list){
        this._list=document.createElement('ha-selector-bc_object');
        const generate=this._list._generateSchema.bind(this._list);
        this._list._generateSchema=(fields,data,index)=>expand(this,generate(fields,data,index),fields);
        this._list.getRootNode=()=>this.getRootNode();
        this._list.addEventListener('value-changed',event=>{
          event.stopPropagation();if(this.disabled)return;
          this._rows=event.detail.value||[];this._list.value=this._rows;
          const out=mapping?{}:[],keys=new Set();let error='';
          for(const row of this._rows){
            if(mapping){
              if(!row.target)continue;
              if(keys.has(row.target)){error='Chaque sous-bouton doit apparaître une seule fois.';break;}
              keys.add(row.target);Object.defineProperty(out,row.target,{value:row.settings??{},enumerable:true,writable:true,configurable:true});
            }else{
              if(!row||!Object.keys(row).length)continue;
              out.push(row);
            }
          }
          if(this.schema.ui_max&&out.length>this.schema.ui_max)error=`${this.schema.ui_max} informations au maximum.`;
          this._errorEl.textContent=error;this._errorEl.hidden=!error;
          if(!error&&!same(out,this.data??(mapping?{}:[]))){this._listData=out;this._emit(out);}
        });this.shadowRoot.append(this._list);
      }
      if(this._listData!==this.data){this._listData=this.data;this._rows=mapping?Object.entries(this.data||{}).map(([target,settings])=>({target,settings})):this.data||[];}
      let fields=this.schema.ui_fields||presets[this.schema.ui_item_kind]||{};
      if(mapping){
        const choices=new Map(targets(this).map(x=>[x.value,x]));
        for(const row of this._rows)if(row.target&&!choices.has(row.target))choices.set(row.target,{value:row.target,label:row.target});
        fields={target:{label:'Sous-bouton',selector:{select:{options:[...choices.values()],custom_value:true}}},settings:leaf('Style','style')};
      }
      Object.assign(this._list,{hass:this.hass,disabled:this.disabled,value:this._rows,selector:{bc_object:{multiple:true,label_field:mapping?'target':this.schema.ui_label_field,fields}},localizeValue:this.localizeValue});
    }
  });
  customElements.get('ha-form-signature_guided_v1').guided={expand,displayObject,cleanObject,targets,cardFor,same};
}
const guidedEditor = typeof customElements === 'undefined' ? {} : customElements.get('ha-form-signature_guided_v1').guided;
