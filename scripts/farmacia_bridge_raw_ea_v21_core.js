/* FH Bridge raw EA 0..N typed transport C2a-R1.
 * Pure draft: NOT a production exporter, XLSX reader, F4.4 carrier or storage.
 * Old V2 core and WO8 are deliberately unchanged.
 *
 * Integrity contract (C1 adenda ratificada 25-10-2026):
 *  - A followup line is an ACTIVE line. Suspended/inactive or incoherent lines
 *    are rejected both when building a set and when validating imported rows,
 *    because a manually edited workbook has no trusted producer upstream.
 *  - The act row carries a TECHNICAL manifest with transport cardinality
 *    (lines, observations, suspicions, evaluations). Each observation declares
 *    the cardinality of its own association rows. Counts are independent of
 *    row_count/row_index, so deleting rows and renumbering is detected.
 *  - Counts are consistency metadata, NOT authenticity: a coherent rewrite of
 *    an unsigned editable workbook cannot be detected and is not claimed. */
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
 var EA_INDEX_FIELDS=['ea_episode_id','ea_observation_id','ea_related_episode_id',
   'ea_basis_observation_id','ea_medication_ref','ea_evaluation_id',
   'ea_evaluation_method','ea_record_status','ea_evaluation_status'];
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
 // Published V2 follow-up adapter semantics, expressed over the typed columns.
 var LINE_ROLES=['principal','additional'];
 var PLACEHOLDERS=['—','no informado'];
 var LINE_REQUIRED_TEXT=['line_id','treatment_id','line_role','line_status_at_event'];
 var LINE_SNAPSHOT_TEXT=['line_drug_name','line_active_ingredient','line_presentation',
   'line_dose_text','line_route','line_schedule_code','line_schedule_label',
   'line_schedule_other_text','line_selected_drug_id','line_catalog_source',
   'line_national_code','line_registration_number'];
 var MANIFEST_CODES={lines:'EXPECTED_LINE_COUNT_MISMATCH',
   observations:'EXPECTED_OBSERVATION_COUNT_MISMATCH',
   suspicions:'EXPECTED_SUSPICION_COUNT_MISMATCH',
   evaluations:'EXPECTED_EVALUATION_COUNT_MISMATCH'};
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
 function normalizedKey(v) {
   if (v===null||v===undefined)return '';
   return String(v).trim().toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g,'');
 }
 function isPlaceholder(v) {
   return typeof v==='string'&&PLACEHOLDERS.indexOf(normalizedKey(v))!==-1;
 }
 function deps(){
   var v=root.FarmaciaExportV2Core;
   var c=root.FarmaciaBridgeEaTypedCodec;
   var r=root.HubTools&&root.HubTools.farmaciaEaInvariants;
   if(!v||!Array.isArray(v.ROW_COLUMNS)||v.ROW_COLUMNS.length!==152||
      v.EVENT_SCHEMA_VERSION!=='2.0.0-draft.1')error('CORE_DEPENDENCY','Published V2 core required');
   if(!c||c.VERSION!=='fh-ea-typed-json/1'||c.OBSERVATION_CODEC!=='fh-ea-typed-json/2'||
      c.MANIFEST_CODEC!=='fh-ea-bridge-manifest/1'||typeof c.decodeObservation!=='function'||
      typeof c.decodeManifest!=='function')
     error('CODEC_DEPENDENCY','Versioned typed EA codec required');
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
 // Line invariants of the published V2 follow-up adapter, over typed columns.
 function lineInvariants(line,errors) {
   LINE_REQUIRED_TEXT.forEach(function(field){
     if(!text(line[field])) errors.push({code:'MISSING_REQUIRED',field:field});
     else if(isPlaceholder(line[field])) errors.push({code:'PLACEHOLDER_NOT_ALLOWED',field:field});
   });
   if(typeof line.is_primary_line!=='boolean') errors.push({code:'MISSING_REQUIRED',field:'is_primary_line'});
   if(typeof line.active_at_event!=='boolean') errors.push({code:'MISSING_REQUIRED',field:'active_at_event'});
   else if(line.active_at_event!==true) errors.push({code:'FOLLOWUP_LINE_MUST_BE_ACTIVE',field:'active_at_event'});
   if(text(line.line_status_at_event)&&line.line_status_at_event!=='active')
     errors.push({code:'FOLLOWUP_LINE_STATUS',field:'line_status_at_event'});
   if(text(line.line_role)&&LINE_ROLES.indexOf(line.line_role)===-1)
     errors.push({code:'INVALID_LINE_ROLE',field:'line_role'});
   if(text(line.line_role)&&LINE_ROLES.indexOf(line.line_role)!==-1&&
      typeof line.is_primary_line==='boolean'&&
      ((line.line_role==='principal')!==line.is_primary_line))
     errors.push({code:'INVALID_PRIMARY_COHERENCE',field:'line_role'});
   var identifiable=[line.line_drug_name,line.line_active_ingredient].some(function(v){
     return text(v)&&!isPlaceholder(v);
   });
   if(!identifiable) errors.push({code:'LINE_NOT_IDENTIFIABLE'});
   LINE_SNAPSHOT_TEXT.forEach(function(field){
     if(isPlaceholder(line[field])) errors.push({code:'PLACEHOLDER_NOT_ALLOWED',field:field});
   });
 }
 // row_id is technical identity: <encoded source>::<row_role>::<encoded key>.
 // It is parsed BEFORE any decoding so a malformed cell fails closed.
 function parseRowId(row) {
   if(!text(row.row_id)||!text(row.row_role)) return null;
   var parts=String(row.row_id).split('::');
   if(parts.length!==3) return null;
   var decoded=[];
   for(var i=0;i<3;i++) {
     if(!parts[i]) return null;
     var value;
     try{value=decodeURIComponent(parts[i]);}catch(e){return null;}
     if(encodeURIComponent(value)!==parts[i]) return null;
     decoded.push(value);
   }
   return {source:decoded[0],role:decoded[1],key:decoded[2]};
 }
 function associationKey(parsed) {
   var match=/^(.*)-([SE])(\d+)$/.exec(parsed.key);
   if(!match) return null;
   return {observationId:match[1],field:match[2]==='S'?'suspicions':'evaluations',index:Number(match[3])};
 }
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
    var parsedId=parseRowId(row);
    if(!parsedId) errors.push({code:'INVALID_ROW_ID'});
    else {
      if(parsedId.role!==row.row_role) errors.push({code:'ROW_ID_ROLE_MISMATCH'});
      if(parsedId.source!==row.source_event_id) errors.push({code:'ROW_ID_SOURCE_MISMATCH'});
      if(row.row_role==='ea_observation'&&parsedId.key!==row.ea_observation_id)
        errors.push({code:'ROW_ID_KEY_MISMATCH'});
      if(row.row_role==='ea_suspicion'||row.row_role==='ea_evaluation'){
        var association=associationKey(parsedId);
        if(!association||association.observationId!==row.ea_observation_id||
           association.field!==(row.row_role==='ea_suspicion'?'suspicions':'evaluations'))
          errors.push({code:'ASSOCIATION_INDEX_MISMATCH'});
      }
    }
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
    if(EA_ROLES.includes(row.row_role)){
      var expectedCodec=row.row_role==='ea_observation'?d.c.OBSERVATION_CODEC:d.c.VERSION;
      if(row.ea_payload_codec!==expectedCodec||typeof row.ea_payload_json!=='string')
        errors.push({code:'INVALID_EA_CODEC',field:'ea_payload_codec'});
      if(!text(row.ea_episode_id)||!text(row.ea_observation_id))
        errors.push({code:'INVALID_EA_ID'});
      if(row.ea_present!==null||row.line_id!==null)errors.push({code:'MIXED_ROLE_FIELDS'});
      if(!errors.length){
        try{
          var decoded=row.row_role==='ea_observation'
            ?d.c.decodeObservation(row.ea_payload_json)
            :{value:d.c.decode(row.ea_payload_json),associations:null};
          var payload=decoded.value;
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
              if(row.ea_evaluation_status!==(st||null))errors.push({code:'EVALUATION_STATUS_MISMATCH'});
            } else if(row.ea_evaluation_id!==null||row.ea_evaluation_method!==null||
               row.ea_evaluation_status!==null) errors.push({code:'MIXED_ROLE_FIELDS'});
          }
        }catch(e){errors.push({code:e.code||'INVALID_EA_PAYLOAD'});}
      }
    } else {
      if(row.row_role==='followup_act'){
        if(!['si','no','no_consta'].includes(row.ea_present)||row.line_id!==null)
          errors.push({code:'INVALID_FOLLOWUP_ACT'});
        if(row.ea_payload_codec!==d.c.MANIFEST_CODEC||typeof row.ea_payload_json!=='string')
          errors.push({code:'INVALID_ACT_MANIFEST',field:'ea_payload_codec'});
        else {
          try{d.c.decodeManifest(row.ea_payload_json);}
          catch(e){errors.push({code:'INVALID_ACT_MANIFEST',details:e.code||'INVALID_MANIFEST'});}
        }
        EA_INDEX_FIELDS.forEach(function(field){
          if(row[field]!==null)errors.push({code:'MIXED_ROLE_FIELDS',field:field});
        });
      }else{
        if(row.ea_present!==null)errors.push({code:'UNEXPECTED_EA_PRESENT'});
        if(row.ea_payload_json!==null||row.ea_payload_codec!==null||
           EA_INDEX_FIELDS.some(function(field){return row[field]!==null;}))
          errors.push({code:'UNEXPECTED_EA_PAYLOAD'});
        if(row.row_role==='followup_line') lineInvariants(row,errors);
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
    var obsAssociations=Object.create(null),associationIndexes=Object.create(null);
    if(!Array.isArray(rows)||!rows.length)return {valid:false,errors:[{code:'EMPTY_ROW_SET'}]};
    var first=rows[0], actRows=0,seenLine=Object.create(null),primaryCount=0;
    var counts={lines:0,observations:0,suspicions:0,evaluations:0};
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
        counts.lines++;
        if(row.is_primary_line===true)primaryCount++;
        if(seenLine[row.line_id])errors.push({code:'DUPLICATE_LINE_ID'});
        seenLine[row.line_id]=true;
      }
      if(row.row_role==='ea_observation'){
        counts.observations++;
        if(obs[row.ea_observation_id])errors.push({code:'DUPLICATE_OBSERVATION_ID'});
        obs[row.ea_observation_id]=row;
        try{
          obsAssociations[row.ea_observation_id]=
            d.c.decodeObservation(row.ea_payload_json).associations;
        }catch(e){/* already reported by validateRow */}
      }
      if(row.row_role==='ea_suspicion'||row.row_role==='ea_evaluation'){
        if(row.row_role==='ea_suspicion')counts.suspicions++;
        else counts.evaluations++;
        links.push({row:row,index:i+1});
        var parsed=parseRowId(row);
        var association=parsed?associationKey(parsed):null;
        if(association){
          var bucket=JSON.stringify([association.observationId,association.field]);
          if(!associationIndexes[bucket])associationIndexes[bucket]=[];
          associationIndexes[bucket].push(association.index);
        }
      }
    });
    if(primaryCount>1)errors.push({code:'MULTIPLE_PRIMARY_LINES',actual:primaryCount});
    if(actRows!==1||!plain(first)||first.row_role!=='followup_act')errors.push({code:'FOLLOWUP_ACT_CARDINALITY'});
    if(plain(first)&&first.row_role==='followup_act'&&typeof first.ea_payload_json==='string'){
      var manifest=null;
      try{manifest=d.c.decodeManifest(first.ea_payload_json);}catch(e){manifest=null;}
      if(!manifest)errors.push({code:'INVALID_ACT_MANIFEST'});
      else Object.keys(MANIFEST_CODES).forEach(function(key){
        if(manifest[key]!==counts[key])
          errors.push({code:MANIFEST_CODES[key],expected:manifest[key],actual:counts[key]});
      });
    }
    // Declared per-observation cardinality is the proof that association rows
    // were not silently dropped or injected, independently of row_count.
    Object.keys(obsAssociations).forEach(function(observationId){
      var declared=obsAssociations[observationId];
      [['suspicions','EXPECTED_SUSPICION_COUNT_MISMATCH'],
       ['evaluations','EXPECTED_EVALUATION_COUNT_MISMATCH']].forEach(function(entry){
        var field=entry[0],code=entry[1];
        var actual=(associationIndexes[JSON.stringify([observationId,field])]||[]).length;
        if(!own(declared,field)){
          if(actual>0)errors.push({code:'UNDECLARED_ASSOCIATION_ARRAY',id:observationId,field:field});
          return;
        }
        if(declared[field].count!==actual)
          errors.push({code:code,id:observationId,expected:declared[field].count,actual:actual});
      });
    });
    Object.keys(associationIndexes).forEach(function(bucket){
      var indexes=associationIndexes[bucket].slice().sort(function(a,b){return a-b;});
      for(var i=0;i<indexes.length;i++){
        if(i>0&&indexes[i]===indexes[i-1]){
          errors.push({code:'ASSOCIATION_INDEX_DUPLICATE',id:bucket,index:indexes[i]});
          continue;
        }
        if(indexes[i]!==i)errors.push({code:'ASSOCIATION_INDEX_GAP',id:bucket,expected:i,actual:indexes[i]});
      }
    });
    var evaluationIds=Object.create(null);
    links.forEach(function(entry) {
      var row=entry.row;
      if(row.row_role==='ea_evaluation'){
        var scopedKey=JSON.stringify([row.ea_observation_id,row.ea_evaluation_id]);
        if(evaluationIds[scopedKey])errors.push({code:'DUPLICATE_EVALUATION_ID'});
        evaluationIds[scopedKey]=true;
      }
      var target=obs[row.ea_observation_id];
      if(!target||target.ea_episode_id!==row.ea_episode_id)
        errors.push({code:'ORPHAN_EA_ASSOCIATION',id:row.ea_observation_id});
    });
    if(plain(first)){
      // The new version must not weaken the published semantic checks for
      // dates, enums and V2 common-event fields.
      var previousEvent={};
      EVENT_FIELDS.forEach(function(k){if(first[k]!==null)previousEvent[k]=first[k];});
      previousEvent.event_schema_version=d.v.EVENT_SCHEMA_VERSION;
      var verifiedEvent=d.v.validateEvent(previousEvent);
      if(!verifiedEvent.valid)errors.push({code:'INVALID_V2_EVENT_CONTEXT',details:verifiedEvent.errors});
      var n=counts.observations;
      if((first.ea_present==='si')!==(n>0))errors.push({code:'EA_STATE_CONTRADICTION'});
      if(rows.some(function(x){return !plain(x)||x.source_event_id!==first.source_event_id||
        x.event_type!=='pharmacy_followup';}))errors.push({code:'MULTI_EVENT'});
    }
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
   // The act row is created first and receives the technical manifest at the end.
   add('followup_act','act',{ea_present:input.present});
   var lineSeen=Object.create(null),primaryCount=0;
   input.activeLines.forEach(function(line){
     if(!plain(line))error('INVALID_LINE','Each line must be an explicit record');
     if(!text(line.rowKey))error('INVALID_LINE','Each line requires an explicit rowKey');
     if(isPlaceholder(line.rowKey))error('PLACEHOLDER_NOT_ALLOWED','Line rowKey cannot be a placeholder');
     Object.keys(line).forEach(function(k){if(!LINE_FIELDS.includes(k))error('UNKNOWN_LINE_FIELD','Unexpected '+k);});
     var problems=[];
     lineInvariants(line,problems);
     if(problems.length)error(problems[0].code,'Line invariants failed',problems);
     if(lineSeen[line.line_id])error('DUPLICATE_LINE_ID','Line ID reused');
     lineSeen[line.line_id]=true;
     if(line.is_primary_line===true)primaryCount++;
     var fields={};Object.keys(line).forEach(function(k){if(k!=='rowKey')fields[k]=line[k];});
     add('followup_line',line.rowKey,fields);
   });
   if(primaryCount>1)error('MULTIPLE_PRIMARY_LINES','At most one primary line per act');
   checked.representation.adverse_events.forEach(function(obs){
     // R1 has already validated and deep-copied the actual incorporated act.
     // Association arrays travel as their own rows; the observed declares only
     // how many rows it owns and never loses the shape of the clinical field.
     var reduced=clonePlain(obs);
     var declared={};
     ['suspicions','evaluations'].forEach(function(field){
       if(!own(reduced,field))return;
       if(Array.isArray(reduced[field])){
         declared[field]={count:reduced[field].length};
         delete reduced[field];
         return;
       }
       // absent / own undefined / null / scalar markers stay inside the
       // clinical entity untouched: the typed codec already preserves them.
     });
     var common={ea_episode_id:obs.episode_id,ea_observation_id:obs.observation_id};
     add('ea_observation',obs.observation_id,Object.assign({},common,{
       ea_record_status:'incorporated',
       ea_related_episode_id:own(obs,'relatedEpisodeId')?obs.relatedEpisodeId:null,
       ea_basis_observation_id:own(obs,'basis')&&plain(obs.basis)?obs.basis.observation_id:null,
       ea_payload_codec:d.c.OBSERVATION_CODEC,
       ea_payload_json:d.c.encodeObservation(reduced,declared)
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
   var manifest={evaluations:0,lines:0,observations:0,suspicions:0};
   items.forEach(function(item){
     if(item.row_role==='followup_line')manifest.lines++;
     else if(item.row_role==='ea_observation')manifest.observations++;
     else if(item.row_role==='ea_suspicion')manifest.suspicions++;
     else if(item.row_role==='ea_evaluation')manifest.evaluations++;
   });
   items[0].ea_payload_codec=d.c.MANIFEST_CODEC;
   items[0].ea_payload_json=d.c.encodeManifest(manifest);
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
       var parsed=parseRowId(row);
       if(!parsed)error('INVALID_ROW_ID','Unreadable transport identity');
       var line={};LINE_FIELDS.forEach(function(k){
         if(k!=='rowKey'&&own(row,k)&&row[k]!==null)line[k]=clonePlain(row[k]);
       });
       line.rowKey=parsed.key;
       lines.push(line);
     }
     if(row.row_role==='ea_observation'){
       var envelope=d.c.decodeObservation(row.ea_payload_json);
       var obs=envelope.value;
       if(byId[obs.observation_id])error('DUPLICATE_OBSERVATION_ID','Identity reused');
       byId[obs.observation_id]=obs;observations.push(obs);
     }
   });
   // S/E suffixes identify logical array positions. Excel row order is only
   // transport order and must not silently reorder clinical associations.
   var associationRows=rows.filter(function(row){
     return row.row_role==='ea_suspicion'||row.row_role==='ea_evaluation';
   });
   associationRows.sort(function(a,b){
     return associationKey(parseRowId(a)).index-associationKey(parseRowId(b)).index;
   });
   associationRows.forEach(function(row) {
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
   LINE_ROLES:Object.freeze(LINE_ROLES.slice()),PLACEHOLDERS:Object.freeze(PLACEHOLDERS.slice()),
   validateRow:validateRow,validateRowSet:validateRowSet,buildFollowupRows:buildFollowupRows,
   serializeRowsToTsv:serializeRowsToTsv,parseTsvRows:parseTsvRows,decodeFollowupRows:decodeFollowupRows
 });
})(typeof window !== 'undefined' ? window : globalThis);
