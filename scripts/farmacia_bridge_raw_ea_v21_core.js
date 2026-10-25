/* FH Bridge raw EA 0..N typed transport C2a.
 * Pure draft: NOT a production exporter, XLSX reader, F4.4 carrier or storage.
 * Old V2 core and WO8 are deliberately unchanged. */
(function (root) {
 'use strict';
 var VERSION='2.1.0-draft.1';
 var EXTRA=['fh_act_id','fh_patient_ref','ea_present','ea_episode_id','ea_observation_id',
   'ea_related_episode_id','ea_basis_observation_id','ea_medication_ref',
   'ea_evaluation_id','ea_evaluation_method','ea_record_status',
   'ea_evaluation_status','ea_payload_codec','ea_payload_json'];
 var ROLES=['validation','first_visit_line','followup_act','followup_line',
   'ea_observation','ea_suspicion','ea_evaluation'];
 var EA_ROLES=['ea_observation','ea_suspicion','ea_evaluation'];
 var LIMIT=32767;
 var REQUIRED=['bridge_status','event_schema_version','row_schema_version',
  'event_id','source_event_id','row_id','row_role','row_index','row_count','event_type',
  'event_status','occurred_at','recorded_at','demo_flag','patient_id','fh_act_id','fh_patient_ref'];
 var COMMON=['event_schema_version','event_id','source_event_id','event_type','event_status',
   'occurred_at','recorded_at','demo_flag','patient_id','identifier_system','identifier_value',
   'hospital_code','service_code','service_label','pathology_code','pathology_label',
   'professional_ref','professional_display','visit_id','visit_date','fh_act_id','fh_patient_ref'];
 var LINE_FIELDS=['rowKey','treatment_id','line_id','line_role','is_primary_line',
   'line_status_at_event','active_at_event','line_drug_name','line_active_ingredient',
   'line_presentation','line_dose_text','line_route','line_schedule_code',
   'line_schedule_label','line_schedule_other_text','line_selected_drug_id',
   'line_catalog_source','line_national_code','line_registration_number',
   'dispensation_status','dispensation_observations','specific_review_status',
   'specific_review_reason','therapeutic_movement_type','new_dose_text',
   'new_schedule_code','new_schedule_label','new_schedule_other_text','new_route',
   'movement_reason','movement_effective_date','suspension_status',
   'suspension_reason','suspension_effective_date','line_observations',
   'adherence_collection_status','adherence_instrument','adherence_result',
   'adherence_answers_json'];
 var COLS=EXTRA.slice();
 var DEFINITIONS=null;
 var EVENT_FIELDS=null;
 var EVENT_EXCLUDED=['bridge_status','bridge_processed_at','bridge_error_code','bridge_error_detail',
   'row_schema_version','row_id','row_role','row_index','row_count'];
 function error(code,msg,details) {
   var e=new Error(code+': '+msg);e.code=code;e.details=details||null;throw e;
 }
 function own(o,k) {return Object.prototype.hasOwnProperty.call(o,k);}
 function data(o,k) {var d=o&&Object.getOwnPropertyDescriptor(o,k);return !!d&&own(d,'value');}
 function text(v) {return typeof v==='string'&&v.trim().length>0;}
 function plain(v) {
   if (v===null||Object.prototype.toString.call(v)!=='[object Object]')return false;
   var p=Object.getPrototypeOf(v);return p===null||Object.getPrototypeOf(p)===null;
 }
 function deps(){
   var v=root.FarmaciaExportV2Core;
   var c=root.FarmaciaBridgeEaTypedCodec;
   var r=root.HubTools&&root.HubTools.farmaciaEaInvariants;
   if(!v||!Array.isArray(v.ROW_COLUMNS)||v.ROW_COLUMNS.length!==152||
      v.EVENT_SCHEMA_VERSION!=='2.0.0-draft.1')error('CORE_DEPENDENCY','Published V2 core required');
   if(!c||c.VERSION!=='fh-ea-typed-json/1')error('CODEC_DEPENDENCY','Typed EA codec required');
   if(!r||typeof r.validateObservations!=='function'||typeof r.validateNewEvents!=='function')
     error('R1_DEPENDENCY','Published EA invariants required');
   return {v:v,c:c,r:r};
 }
 function init(){
   var d=deps();
   if(COLS.length===EXTRA.length){
     COLS=Array.from(d.v.ROW_COLUMNS).concat(EXTRA);
     DEFINITIONS=d.v.FIELD_DEFINITIONS;
     EVENT_FIELDS=Array.from(d.v.ROW_COLUMNS).filter(function(k){
       return !EVENT_EXCLUDED.includes(k)&&!LINE_FIELDS.includes(k);
     });
     COMMON=EVENT_FIELDS.concat(['fh_act_id','fh_patient_ref']);
   }
   return d;
 }
 function clonePlain(x){
   if(Array.isArray(x))return x.map(clonePlain);
   if(plain(x)){var o={};Object.keys(x).forEach(function(k){Object.defineProperty(o,k,{
     value:clonePlain(x[k]),enumerable:true,writable:true,configurable:true});});return o;}
   return x;
 }
 function fieldTypeValid(name,value,d) {
   if(value===null)return d.nullable;
   if(d.type==='string')return typeof value==='string';
   if(d.type==='boolean')return typeof value==='boolean';
   if(d.type==='integer')return Number.isInteger(value);
   if(d.type==='json')return plain(value)||Array.isArray(value);
   return false;
 }
 function failValidation(msg,errors){error('INVALID_ROW',msg,errors);}
 function validateRow(row) {
   try{
    var d=init(),errors=[];
    if(!plain(row))return {valid:false,errors:[{code:'INVALID_ROW'}]};
    var keys=Object.keys(row);
    if(keys.length!==166||keys.some(function(k){return COLS.indexOf(k)===-1;}))
      errors.push({code:'ROW_COLUMNS_MISMATCH'});
    REQUIRED.forEach(function(k){if(!data(row,k)||row[k]===null||(typeof row[k]==='string'&&!text(row[k])))
      errors.push({code:'MISSING_REQUIRED',field:k});});
    if(row.event_schema_version!==VERSION||row.row_schema_version!==VERSION)
      errors.push({code:'INVALID_SCHEMA_VERSION'});
    if(ROLES.indexOf(row.row_role)===-1)errors.push({code:'INVALID_ROW_ROLE'});
    if(row.event_type!=='pharmacy_followup'&&row.event_type!=='pharmacy_validation'&&row.event_type!=='pharmacy_first_visit')
      errors.push({code:'INVALID_EVENT_TYPE'});
    if(row.event_type==='pharmacy_followup'&&['validation','first_visit_line'].includes(row.row_role))
      errors.push({code:'ROW_ROLE_EVENT_MISMATCH'});
    if(!Number.isInteger(row.row_index)||row.row_index<1||!Number.isInteger(row.row_count)||row.row_count<1
       ||row.row_index>row.row_count)errors.push({code:'INVALID_ROW_COUNT'});
    if(row.bridge_status!=='PENDIENTE')errors.push({code:'INVALID_BRIDGE_STATUS'});
    d.v.FIELD_DEFINITIONS.forEach(function(def){
      if(def.name==='event_schema_version'||def.name==='row_schema_version'||def.name==='row_role')return;
      if(!fieldTypeValid(def.name,row[def.name],def))errors.push({code:'INVALID_TYPE',field:def.name});
      if(row[def.name]!==null&&def.enum&&def.enum.indexOf(row[def.name])===-1)
        errors.push({code:'INVALID_ENUM',field:def.name});
    });
    if(row.ea_present!==null&&!['si','no','no_consta'].includes(row.ea_present))
      errors.push({code:'INVALID_EA_PRESENT'});
    if(row.ea_record_status!==null&&row.ea_record_status!=='incorporated')
      errors.push({code:'INVALID_EA_STATUS'});
    if(row.ea_payload_codec!==null&&row.ea_payload_codec!==d.c.VERSION)
      errors.push({code:'INVALID_EA_CODEC'});
    if(EA_ROLES.includes(row.row_role)){
      if(row.ea_payload_codec!==d.c.VERSION||typeof row.ea_payload_json!=='string')
        errors.push({code:'MISSING_EA_PAYLOAD'});
      if(!text(row.ea_episode_id)||!text(row.ea_observation_id))
        errors.push({code:'INVALID_EA_ID'});
      if(row.ea_present!==null||row.line_id!==null)errors.push({code:'MIXED_ROLE_FIELDS'});
      if(!errors.length){
        try{
          var payload=d.c.decode(row.ea_payload_json);
          var expected={patientRef:row.fh_patient_ref,episode_id:row.ea_episode_id};
          if(row.row_role==='ea_observation') {
            expected.actId=row.fh_act_id;
            expected.observation_id=row.ea_observation_id;
          } else if(row.row_role==='ea_evaluation') expected.actId=row.fh_act_id;
          if(row.row_role!=='ea_observation') {
            if((own(payload,'actId')&&payload.actId!==row.fh_act_id)||
               (own(payload,'observation_id')&&payload.observation_id!==row.ea_observation_id))
              errors.push({code:'PAYLOAD_ASSOCIATION_MISMATCH'});
          }
          Object.keys(expected).forEach(function(k){
            if(!data(payload,k)||payload[k]!==expected[k])
              errors.push({code:'PAYLOAD_INDEX_MISMATCH',field:k});
          });
          if(row.row_role==='ea_observation'){
            if(payload.status!=='incorporated'||!text(payload.description)||row.ea_record_status!=='incorporated')
              errors.push({code:'INVALID_OBSERVATION'});
            if(row.ea_medication_ref!==null||row.ea_evaluation_id!==null||
               row.ea_evaluation_method!==null||row.ea_evaluation_status!==null)
              errors.push({code:'MIXED_ROLE_FIELDS'});
            var basis=own(payload,'basis')&&plain(payload.basis)?payload.basis.observation_id:null;
            if(row.ea_basis_observation_id!==(basis||null))errors.push({code:'BASIS_INDEX_MISMATCH'});
            var related=own(payload,'relatedEpisodeId')?payload.relatedEpisodeId:null;
            if(row.ea_related_episode_id!==(related||null))errors.push({code:'RELATED_INDEX_MISMATCH'});
          } else {
            if(!text(payload.medicationRef)||row.ea_medication_ref!==payload.medicationRef)
              errors.push({code:'MEDICATION_INDEX_MISMATCH'});
            if(row.ea_record_status!==null||row.ea_basis_observation_id!==null||row.ea_related_episode_id!==null)
              errors.push({code:'MIXED_ROLE_FIELDS'});
            if(row.row_role==='ea_evaluation'){
              if(!text(payload.evaluation_id)||!text(payload.method)||
                 row.ea_evaluation_id!==payload.evaluation_id||row.ea_evaluation_method!==payload.method)
                errors.push({code:'EVALUATION_INDEX_MISMATCH'});
              var st=own(payload,'status')?payload.status:null;
              if(st!==null&&st!=='completado')errors.push({code:'EVALUATION_NOT_FINAL'});
              if(own(payload,'status')&&st!== 'completado')errors.push({code:'EVALUATION_NOT_FINAL'});
              if(row.ea_evaluation_status!==(st||null))errors.push({code:'EVALUATION_STATUS_MISMATCH'});
            } else if(row.ea_evaluation_id!==null||row.ea_evaluation_method!==null||
               row.ea_evaluation_status!==null) errors.push({code:'MIXED_ROLE_FIELDS'});
          }
        }catch(e){errors.push({code:e.code||'INVALID_EA_PAYLOAD'});}
      }
    } else {
      if(row.ea_payload_json!==null||row.ea_payload_codec!==null||row.ea_episode_id!==null||
         row.ea_observation_id!==null||row.ea_medication_ref!==null||
         row.ea_related_episode_id!==null||row.ea_basis_observation_id!==null||
         row.ea_evaluation_id!==null||row.ea_evaluation_method!==null||
         row.ea_evaluation_status!==null||row.ea_record_status!==null)
        errors.push({code:'UNEXPECTED_EA_PAYLOAD'});
      if(row.row_role==='followup_act'){
        if(!['si','no','no_consta'].includes(row.ea_present)||row.line_id!==null)
          errors.push({code:'INVALID_FOLLOWUP_ACT'});
      }else{
        if(row.ea_present!==null)errors.push({code:'UNEXPECTED_EA_PRESENT'});
        if(row.row_role==='followup_line'&&!text(row.line_id))
          errors.push({code:'MISSING_LINE_ID'});
      }
    }
    if(!text(row.row_id)||!text(row.source_event_id)||!text(row.event_id)||
       !text(row.patient_id)||!text(row.fh_act_id)||!text(row.fh_patient_ref))
      errors.push({code:'INVALID_ID'});
    return {valid:errors.length===0,errors:errors};
   }catch(e){return {valid:false,errors:[{code:e.code||'VALIDATION_EXCEPTION'}]};}
 }
 function validateRowSet(rows){
   try{
    var d=init(),errors=[],seenRows=Object.create(null),obs=Object.create(null),links=[];
    if(!Array.isArray(rows)||!rows.length)return {valid:false,errors:[{code:'EMPTY_ROW_SET'}]};
    var first=rows[0], actRows=0,seenLine=Object.create(null);
    rows.forEach(function(row,i){
      var v=validateRow(row);
      v.errors.forEach(function(err){errors.push(Object.assign({row:i+1},err));});
      if(!plain(row))return;
      if(seenRows[row.row_id])errors.push({code:'DUPLICATE_ROW_ID',row:i+1});
      seenRows[row.row_id]=true;
      if(row.row_count!==rows.length||row.row_index!==i+1)errors.push({code:'INCOMPLETE_EVENT',row:i+1});
      COMMON.forEach(function(k) {
        if(i>0&&d.v.stableStringify(row[k])!==d.v.stableStringify(first[k]))
          errors.push({code:'COMMON_IDENTITY_MISMATCH',field:k,row:i+1});
      });
      if(row.row_role!=='followup_line')LINE_FIELDS.forEach(function(k){
        if(k!=='rowKey'&&own(row,k)&&row[k]!==null)
          errors.push({code:'UNEXPECTED_LINE_FIELD',field:k,row:i+1});
      });
      if(row.row_role==='followup_act'){actRows++;if(i!==0)errors.push({code:'ACT_NOT_FIRST'});}
      if(row.row_role==='followup_line'){
        if(seenLine[row.line_id])errors.push({code:'DUPLICATE_LINE_ID'});
        seenLine[row.line_id]=true;
      }
      if(row.row_role==='ea_observation'){
        if(obs[row.ea_observation_id])errors.push({code:'DUPLICATE_OBSERVATION_ID'});
        obs[row.ea_observation_id]=row;
      }
      if(row.row_role==='ea_suspicion'||row.row_role==='ea_evaluation')links.push(row);
    });
    if(actRows!==1||!plain(first)||first.row_role!=='followup_act')errors.push({code:'FOLLOWUP_ACT_CARDINALITY'});
    if(plain(first)){
      // The new version must not weaken the published semantic checks for
      // dates, enums and V2 common-event fields.
      var previousEvent={};
      EVENT_FIELDS.forEach(function(k){if(first[k]!==null)previousEvent[k]=first[k];});
      previousEvent.event_schema_version=d.v.EVENT_SCHEMA_VERSION;
      var verifiedEvent=d.v.validateEvent(previousEvent);
      if(!verifiedEvent.valid)errors.push({code:'INVALID_V2_EVENT_CONTEXT',details:verifiedEvent.errors});
      var n=rows.filter(function(x){return plain(x)&&x.row_role==='ea_observation';}).length;
      if((first.ea_present==='si')!==(n>0))errors.push({code:'EA_STATE_CONTRADICTION'});
      if(rows.some(function(x){return !plain(x)||x.source_event_id!==first.source_event_id||
        x.event_type!=='pharmacy_followup';}))errors.push({code:'MULTI_EVENT'});
    }
    var evaluationIds=Object.create(null);
    links.forEach(function(row) {
      if(row.row_role==='ea_evaluation'){
        var scopedKey=JSON.stringify([row.ea_observation_id,row.ea_evaluation_id]);
        if(evaluationIds[scopedKey])errors.push({code:'DUPLICATE_EVALUATION_ID'});
        evaluationIds[scopedKey]=true;
      }
      var target=obs[row.ea_observation_id];
      if(!target||target.ea_episode_id!==row.ea_episode_id)
        errors.push({code:'ORPHAN_EA_ASSOCIATION',id:row.ea_observation_id});
      else {
        try {
          var event=d.c.decode(target.ea_payload_json);
          var targetField=row.row_role==='ea_suspicion'?'suspicions':'evaluations';
          if(!Array.isArray(event[targetField]))errors.push({code:'UNDECLARED_ASSOCIATION_ARRAY'});
        }catch(e){errors.push({code:e.code||'INVALID_EA_PAYLOAD'});}
      }
    });
    return {valid:errors.length===0,errors:errors};
   }catch(e){return {valid:false,errors:[{code:e.code||'VALIDATION_EXCEPTION'}]};}
 }
 function rowId(source,role,key){
   if(!text(source)||!text(role)||!text(key))error('INVALID_ROW_KEY','Explicit transport key required');
   return [source,role,key].map(encodeURIComponent).join('::');
 }
 function createRow(data, len, index){
   init();
   var o={};
   COLS.forEach(function(k){o[k]=own(data,k)?data[k]:null;});
   o.bridge_status='PENDIENTE';o.event_schema_version=VERSION;o.row_schema_version=VERSION;
   o.row_index=index+1;o.row_count=len;
   var v=validateRow(o);if(!v.valid)failValidation('Typed row invalid',v.errors);
   return o;
 }
 function tsvCell(v,d){
   if(v===null)return '';
   if(v===true)return 'TRUE';if(v===false)return 'FALSE';
   return d.v.stableStringify(v);
 }
 function serializeRowsToTsv(rows){
   var d=init(),v=validateRowSet(rows);
   if(!v.valid)error('INVALID_ROW_SET','Cannot serialize invalid rows',v.errors);
   return rows.map(function(row){
     return COLS.map(function(k) {
       var cell=tsvCell(row[k],d);
       if(cell.length>LIMIT)error('EXCEL_CELL_LIMIT','Excel cell exceeds 32767 characters',{field:k,row:row.row_index,length:cell.length});
       return cell;
     }).join('\t');
   }).join('\n');
 }
 function parseTsvRows(s){
   init();
   if(typeof s!=='string'||!s.length||s.includes('\r'))error('INVALID_TSV_ROWS','Invalid physical line separator');
   var rows=s.split('\n').map(function(line){
     var c=line.split('\t');
     if(c.length!==166)error('INVALID_TSV_COLUMN_COUNT','Expected 166 cells',{actual:c.length});
     var o={};
     COLS.forEach(function(k,i){
       var v=c[i];
       if(v==='')o[k]=null;
       else if(v==='TRUE')o[k]=true;
       else if(v==='FALSE')o[k]=false;
       else {try{o[k]=JSON.parse(v);}catch(e){error('INVALID_TSV_CELL','Unparseable canonical cell',{field:k});}}
     });
     return o;
   });
   var result=validateRowSet(rows);
   if(!result.valid)error('INVALID_ROW_SET','Typed rows invalid',result.errors);
   if(serializeRowsToTsv(rows)!==s)error('NON_CANONICAL_TSV','Cells were reformatted');
   return rows;
 }
 function buildFollowupRows(input){
   var d=init();
   if(!plain(input))error('INVALID_REQUEST','Input must be a plain record');
   var keys=['event','actId','patientRef','present','activeLines','adverse_events','history','selections'];
   keys.forEach(function(k){if(!data(input,k))error(k==='actId'?'INVALID_ACT_ID':k==='patientRef'?'INVALID_PATIENT_REF':'MISSING_INPUT','Explicit own data '+k+' is mandatory');});
   Object.keys(input).forEach(function(k){if(!keys.includes(k))error('UNKNOWN_INPUT','Unexpected top-level input '+k);});
   // Verify all nested descriptors before R1 or V2 can read input; never invoke
   // a caller-provided accessor or silently flatten non-JSON source values.
   d.c.inspect(input);
   if(!text(input.actId))error('INVALID_ACT_ID','Act identity required');
   if(!text(input.patientRef))error('INVALID_PATIENT_REF','Patient reference required');
   if(!plain(input.event))error('INVALID_EVENT','Event context must be explicit');
   if(input.event.event_type!=='pharmacy_followup'||!text(input.event.visit_id)||
      (own(input.event,'event_schema_version')&&input.event.event_schema_version!==VERSION))
      error('INVALID_EVENT','Explicit followup context required');
   if(input.event.adverse_event_id!==undefined&&input.event.adverse_event_id!==null)
      error('LEGACY_EA_COLLISION','Singular EA identity is not the EA collection');
   if(input.event.adverse_event_status!==undefined&&input.event.adverse_event_status!==null)
      error('LEGACY_EA_COLLISION','Singular EA status is not the EA collection');
   var v2Event={};
   Object.keys(input.event).forEach(function(k){v2Event[k]=input.event[k];});
   v2Event.event_schema_version=d.v.EVENT_SCHEMA_VERSION;
   var ve=d.v.validateEvent(v2Event);
   if(!ve.valid)error('INVALID_EVENT','V2 event context invalid',ve.errors);
   if(!Array.isArray(input.activeLines))error('INVALID_LINES','Explicit lines array required');
   var checked=d.r.validateObservations({patientRef:input.patientRef,actId:input.actId,
     present:input.present,adverse_events:input.adverse_events,
     history:input.history,selections:input.selections});
   if(!checked.ok)error(checked.error.code,checked.error.message);
   var base={};
   Object.keys(v2Event).forEach(function(k){if(COLS.includes(k)&&!['event_schema_version','row_role','row_index','row_count','row_id','row_schema_version'].includes(k))base[k]=v2Event[k];});
   base.fh_act_id=input.actId;base.fh_patient_ref=input.patientRef;
   var items=[],keysSeen=Object.create(null);
   function add(role,key,fields){
     var r=Object.assign({},base,fields,{row_role:role});
     r.row_id=rowId(base.source_event_id,role,key);
     if(keysSeen[r.row_id])error('DUPLICATE_ROW_ID','Duplicate transport row identity');
     keysSeen[r.row_id]=true;items.push(r);
   }
   add('followup_act','act',{ea_present:input.present});
   var lineSeen=Object.create(null);
   input.activeLines.forEach(function(line,i){
     if(!plain(line)||!text(line.rowKey)||!text(line.line_id))
       error('INVALID_LINE','Each line requires explicit rowKey and line_id');
     if(lineSeen[line.line_id])error('DUPLICATE_LINE_ID','Line ID reused');
     lineSeen[line.line_id]=true;
     Object.keys(line).forEach(function(k){if(!LINE_FIELDS.includes(k))error('UNKNOWN_LINE_FIELD','Unexpected '+k);});
     var fields={};Object.keys(line).forEach(function(k){if(k!=='rowKey')fields[k]=line[k];});
     add('followup_line',line.rowKey,fields);
   });
   checked.representation.adverse_events.forEach(function(obs,oi){
     // R1 has already validated and deep-copied the actual incorporated act.
     // Store association entities in separate rows; preserve the array
     // marker ([]/absent/null/scalar) on the observation itself.
     var reduced=clonePlain(obs);
     if(Array.isArray(reduced.suspicions))reduced.suspicions=[];
     if(Array.isArray(reduced.evaluations))reduced.evaluations=[];
     var common={ea_episode_id:obs.episode_id,ea_observation_id:obs.observation_id};
     add('ea_observation',obs.observation_id,Object.assign({},common,{
       ea_record_status:'incorporated',
       ea_related_episode_id:own(obs,'relatedEpisodeId')?obs.relatedEpisodeId:null,
       ea_basis_observation_id:own(obs,'basis')&&plain(obs.basis)?obs.basis.observation_id:null,
       ea_payload_codec:d.c.VERSION,ea_payload_json:d.c.encode(reduced)
     }));
     if(Array.isArray(obs.suspicions))obs.suspicions.forEach(function(s,j){
       // Association records carry observation identity from their containing
       // act; no synthetic clinical identity is introduced.
       add('ea_suspicion',obs.observation_id+'-S'+j,Object.assign({},common,{
         ea_medication_ref:s.medicationRef,
         ea_payload_codec:d.c.VERSION,ea_payload_json:d.c.encode(s)
       }));
     });
     if(Array.isArray(obs.evaluations))obs.evaluations.forEach(function(e,j){
       if(own(e,'status')&&e.status!=='completado')
         error('EVALUATION_NOT_FINAL','Only explicitly completed evaluations may declare a final status');
       add('ea_evaluation',obs.observation_id+'-E'+j,Object.assign({},common,{
         ea_medication_ref:e.medicationRef,ea_evaluation_id:e.evaluation_id,
         ea_evaluation_method:e.method,
         ea_evaluation_status:own(e,'status')?e.status:null,
         ea_payload_codec:d.c.VERSION,ea_payload_json:d.c.encode(e)
       }));
     });
   });
   var rows=items.map(function(item,i){return createRow(item,items.length,i);});
   var result=validateRowSet(rows);
   if(!result.valid)error('INVALID_ROW_SET','New typed group invalid',result.errors);
   serializeRowsToTsv(rows); // preflight Excel physical-cell limits BEFORE a copy.
   return rows;
 }
 function decodeFollowupRows(rows){
   var d=init();
   var validation=validateRowSet(rows);
   if(!validation.valid)error('INVALID_ROW_SET','Cannot reconstruct invalid rows',validation.errors);
   var first=rows[0],byId=Object.create(null),observations=[],lines=[];
   rows.forEach(function(row){
     if(row.row_role==='followup_line'){
       var line={};LINE_FIELDS.forEach(function(k){
         if(k!=='rowKey'&&own(row,k)&&row[k]!==null)line[k]=clonePlain(row[k]);
       });
       line.rowKey=decodeURIComponent(row.row_id.split('::').pop());
       lines.push(line);
     }
     if(row.row_role==='ea_observation'){
       var obs=d.c.decode(row.ea_payload_json);
       if(byId[obs.observation_id])error('DUPLICATE_OBSERVATION_ID','Identity reused');
       byId[obs.observation_id]=obs;observations.push(obs);
     }
   });
   rows.forEach(function(row) {
     if(row.row_role!=='ea_suspicion'&&row.row_role!=='ea_evaluation')return;
     var obs=byId[row.ea_observation_id],p=d.c.decode(row.ea_payload_json);
     var name=row.row_role==='ea_suspicion'?'suspicions':'evaluations';
     if(!obs||!Array.isArray(obs[name]))error('INVALID_ROW_SET','Missing explicit association array');
     // The encoded entity is the originally declared record: no synthesized
     // association fields to discard and no loss of explicitly present keys.
     obs[name].push(p);
   });
   var ne=d.r.validateNewEvents({patientRef:first.fh_patient_ref,actId:first.fh_act_id,
      present:first.ea_present,adverse_events:observations});
   if(!ne.ok)error(ne.error.code,ne.error.message);
   var event={};
   // Preserve old event data originally provided only where it exists,
   // without interpreting transport role fields or mapping to F4.4.
   EVENT_FIELDS.forEach(function(k){if(first[k]!==null)
     event[k]=clonePlain(first[k]);});
   event.event_schema_version=VERSION;
   return {event:event,actId:first.fh_act_id,patientRef:first.fh_patient_ref,
     present:first.ea_present,activeLines:lines,adverse_events:observations};
 }
 init();
 root.FarmaciaBridgeRawEaV21Core=Object.freeze({
   VERSION:VERSION,ROW_COLUMNS:Object.freeze(COLS.slice()),ROW_ROLES:Object.freeze(ROLES.slice()),
   validateRow:validateRow,validateRowSet:validateRowSet,buildFollowupRows:buildFollowupRows,
   serializeRowsToTsv:serializeRowsToTsv,parseTsvRows:parseTsvRows,decodeFollowupRows:decodeFollowupRows
 });
})(typeof window !== 'undefined' ? window : globalThis);
