/* FH Bridge raw EA codec. Pure typed JSON.
 *
 * Three versioned codecs, one per transport role, so a payload is never
 * reinterpreted silently:
 *   fh-ea-typed-json/1        ONE clinical entity (suspicion / evaluation).
 *   fh-ea-typed-json/2        ONE observation entity + declared association
 *                             cardinality. The clinical arrays travel as
 *                             separate rows, never inside the entity.
 *   fh-ea-bridge-manifest/1   technical manifest of the act row: transport
 *                             cardinality only, never clinical content.
 * NO Pharmacy Act carrier, storage, DOM, parser execution, or clinical inference. */
(function (root) {
  'use strict';
  var CODEC = 'fh-ea-typed-json/1';
  var OBSERVATION_CODEC = 'fh-ea-typed-json/2';
  var MANIFEST_CODEC = 'fh-ea-bridge-manifest/1';
  var ASSOCIATION_KEYS = ['evaluations', 'suspicions'];
  var MANIFEST_KEYS = ['evaluations', 'lines', 'observations', 'suspicions'];
  function fault(code, reason) {
    var e = new Error(code + ': ' + reason); e.code = code; throw e;
  }
  function own(o,k) { return Object.prototype.hasOwnProperty.call(o,k); }
  function plain(v) {
    if (v === null || Object.prototype.toString.call(v) !== '[object Object]') return false;
    var p = Object.getPrototypeOf(v);
    return p === null || Object.getPrototypeOf(p) === null;
  }
  function token(k) { return String(k).replace(/~/g,'~0').replace(/\//g,'~1'); }
  function untoken(k) {
    if (/~(?![01])/.test(k)) fault('INVALID_CODEC','Invalid JSON pointer escape');
    return k.replace(/~1/g,'/').replace(/~0/g,'~');
  }
  function rejectKey(k) {
    if (k === '__proto__' || k === 'prototype' || k === 'constructor') fault('UNSUPPORTED_STRUCTURE','Dangerous property');
  }
  function capture(input) {
    if (!plain(input)) fault('UNSUPPORTED_STRUCTURE','Entity root must be a plain record');
    var undefinedPaths=[],ancestors=[];
    function walk(v,p) {
      if (v === undefined) { undefinedPaths.push(p); return null; }
      if (v === null || typeof v === 'string' || typeof v === 'boolean') return v;
      if (typeof v === 'number') {
        if (!Number.isFinite(v)) fault('UNSUPPORTED_STRUCTURE','Non-finite number');
        return v;
      }
      if (!Array.isArray(v) && !plain(v)) fault('UNSUPPORTED_STRUCTURE','Only plain records and dense arrays');
      if (ancestors.indexOf(v)!==-1) fault('UNSUPPORTED_STRUCTURE','Cyclic structure');
      ancestors.push(v);
      try {
        if (Array.isArray(v)) {
          if (Object.getOwnPropertySymbols(v).length) fault('UNSUPPORTED_STRUCTURE','Symbol array property');
          var ds=Object.getOwnPropertyDescriptors(v);
          var keys=Object.keys(ds);
          for (var ki=0;ki<keys.length;ki++) {
            if (keys[ki]!=='length' && (!/^(0|[1-9]\d*)$/.test(keys[ki]) ||
                 Number(keys[ki])>=v.length)) fault('UNSUPPORTED_STRUCTURE','Array has extra keys');
          }
          var arr=[];
          for (var i=0;i<v.length;i++) {
            if (!own(ds,String(i)) || !own(ds[String(i)],'value') || !ds[String(i)].enumerable)
              fault('UNSUPPORTED_STRUCTURE','Sparse/accessor/non-enumerable array');
            arr.push(walk(ds[String(i)].value,p+'/'+i));
          }
          return arr;
        }
        var obj=Object.create(null);
        if (Object.getOwnPropertySymbols(v).length) fault('UNSUPPORTED_STRUCTURE','Symbol own property');
        var d=Object.getOwnPropertyDescriptors(v);
        Object.keys(d).sort().forEach(function(k){
          rejectKey(k);
          if (!own(d[k],'value') || !d[k].enumerable) fault('UNSUPPORTED_STRUCTURE','Accessor/non-enumerable property');
          Object.defineProperty(obj,k,{value:walk(d[k].value,p+'/'+token(k)),enumerable:true,writable:true,configurable:true});
        });
        return obj;
      } finally { ancestors.pop(); }
    }
    return {value:walk(input,''),undefinedPaths:undefinedPaths.sort()};
  }
  function restore(wire) {
    if (!wire || !plain(wire) || Object.keys(wire).sort().join(',')!=='undefinedPaths,value' ||
        !Array.isArray(wire.undefinedPaths) || !plain(wire.value)) fault('INVALID_CODEC','Invalid envelope');
    var refs=wire.undefinedPaths;
    var used=new Set();
    var cloned;
    // JSON.parse(JSON.stringify) is safe here only after explicit validation of all keys.
    function verify(v) {
      if (v===null||typeof v==='string'||typeof v==='boolean') return;
      if (typeof v==='number'&&Number.isFinite(v)) return;
      if (Array.isArray(v)) { for (var i=0;i<v.length;i++) {
        if (!own(v,i)) fault('INVALID_CODEC','Sparse array');
        verify(v[i]);
      } return; }
      if (!plain(v)) fault('INVALID_CODEC','Malformed tree');
      Object.keys(v).forEach(function(k){rejectKeyForDecode(k);verify(v[k]);});
    }
    function rejectKeyForDecode(k) {
      if (k==='__proto__'||k==='prototype'||k==='constructor') fault('INVALID_CODEC','Dangerous key');
    }
    verify(wire.value);
    function copy(v) {
      if (Array.isArray(v)) return v.map(copy);
      if (plain(v)) {var o=Object.create(null);Object.keys(v).forEach(function(k){
        Object.defineProperty(o,k,{value:copy(v[k]),enumerable:true,configurable:true,writable:true});
      });return o;}
      return v;
    }
    cloned=copy(wire.value);
    refs.forEach(function(path) {
      if (typeof path!=='string' || !path.startsWith('/') || used.has(path)) fault('INVALID_CODEC','Duplicate or invalid path');
      used.add(path);
      var parts=path.slice(1).split('/').map(untoken);
      var target=cloned;
      for (var i=0;i<parts.length-1;i++) {
        var key=parts[i];rejectKeyForDecode(key);
        if (Array.isArray(target) && !/^(0|[1-9]\d*)$/.test(key)) fault('INVALID_CODEC','Array index');
        if (!own(target,key) || target[key]===null || typeof target[key]!=='object') fault('INVALID_CODEC','Path missing');
        target=target[key];
      }
      var last=parts[parts.length-1];rejectKeyForDecode(last);
      if (Array.isArray(target) && (!/^(0|[1-9]\d*)$/.test(last) || Number(last)>=target.length))
        fault('INVALID_CODEC','Invalid array position');
      if (!own(target,last) || target[last]!==null) fault('INVALID_CODEC','Undefined placeholder must exist and be null');
      Object.defineProperty(target,last,{value:undefined,enumerable:true,writable:true,configurable:true});
    });
    return cloned;
  }
  function encode(value) {
    var v=capture(value);
    return JSON.stringify({value:v.value,undefinedPaths:v.undefinedPaths});
  }
  function decode(text) {
    if (typeof text!=='string') fault('INVALID_CODEC','Payload must be text');
    var v;
    try {v=JSON.parse(text);} catch(e){fault('INVALID_CODEC','Malformed JSON');}
    var decoded=restore(v);
    if (encode(decoded)!==text) fault('INVALID_CODEC','Non-canonical or ambiguous JSON payload');
    return decoded;
  }
  function sortedClone(value) {
    if (Array.isArray(value)) return value.map(sortedClone);
    if (plain(value)) {
      var out=Object.create(null);
      Object.keys(value).sort().forEach(function(k){
        rejectKey(k);
        Object.defineProperty(out,k,{value:sortedClone(value[k]),enumerable:true,writable:true,configurable:true});
      });
      return out;
    }
    return value;
  }
  function exactKeys(o,allowed,code) {
    if (!plain(o)) fault(code,'Envelope must be a plain record');
    var keys=Object.keys(o).sort();
    if (keys.join(',')!==allowed.slice().sort().join(',')) fault(code,'Unexpected envelope keys');
    return keys;
  }
  // Association metadata declares HOW MANY rows the observation owns and
  // whether the clinical field was an array at all. It never carries a
  // clinical value, and it is never merged into the clinical entity.
  function captureAssociations(associations) {
    if (associations===undefined) return Object.create(null);
    if (!plain(associations)) fault('INVALID_CODEC','associations must be a plain record');
    var out=Object.create(null);
    Object.keys(associations).forEach(function(key){
      if (ASSOCIATION_KEYS.indexOf(key)===-1) fault('INVALID_CODEC','Unknown association field '+key);
      var declared=associations[key];
      if (!plain(declared)) fault('INVALID_CODEC','Association metadata must be a plain record');
      if (Object.keys(declared).join(',')!=='count') fault('INVALID_CODEC','Association metadata admits only count');
      if (!Number.isInteger(declared.count)||declared.count<0)
        fault('INVALID_CODEC','Association count must be a non-negative integer');
      var entry=Object.create(null);
      entry.count=declared.count;
      out[key]=entry;
    });
    // Sorted insertion keeps the wire canonical without relying on parse order.
    var sorted=Object.create(null);
    Object.keys(out).sort().forEach(function(key){sorted[key]=out[key];});
    return sorted;
  }
  function encodeObservation(entity, associations) {
    if (!plain(entity)) fault('UNSUPPORTED_STRUCTURE','Observation must be a plain record');
    var v=capture(entity);
    var declared=captureAssociations(associations);
    ASSOCIATION_KEYS.forEach(function(key){
      if (!own(v.value,key)) return;
      if (Array.isArray(v.value[key]))
        fault('UNSUPPORTED_STRUCTURE','Association array '+key+' must travel as its own rows, not inside the entity');
      if (own(declared,key)) fault('INVALID_CODEC','Declared association '+key+' cannot also exist inside the entity');
    });
    return JSON.stringify({associations:declared,undefinedPaths:v.undefinedPaths,value:v.value});
  }
  function decodeObservation(text) {
    if (typeof text!=='string') fault('INVALID_CODEC','Payload must be text');
    var wire;
    try {wire=JSON.parse(text);} catch(e){fault('INVALID_CODEC','Malformed JSON');}
    exactKeys(wire,['associations','undefinedPaths','value'],'INVALID_CODEC');
    var declared=captureAssociations(wire.associations);
    if (JSON.stringify(sortedClone(wire.associations))!==JSON.stringify(declared))
      fault('INVALID_CODEC','Non-canonical association metadata');
    if (!plain(wire.value)) fault('INVALID_CODEC','Observation value must be a plain record');
    if (!Array.isArray(wire.undefinedPaths)) fault('INVALID_CODEC','undefinedPaths must be an array');
    // Canonical form is checked BEFORE restoring placeholders or arrays.
    var canonical=JSON.stringify({associations:declared,undefinedPaths:sortedClone(wire.undefinedPaths),
      value:sortedClone(wire.value)});
    if (canonical!==text) fault('INVALID_CODEC','Non-canonical or ambiguous JSON payload');
    var restoreWire={};
    restoreWire.value=wire.value;
    restoreWire.undefinedPaths=wire.undefinedPaths;
    var value=restore(restoreWire);
    Object.keys(declared).forEach(function(key){
      if (own(value,key)) fault('INVALID_CODEC','Declared association already present in the entity');
      Object.defineProperty(value,key,{value:[],enumerable:true,writable:true,configurable:true});
    });
    return {value:value,associations:declared};
  }
  function encodeManifest(manifest) {
    if (!plain(manifest)) fault('INVALID_MANIFEST','Manifest must be a plain record');
    var wire=Object.create(null);
    Object.keys(manifest).forEach(function(key){
      if (MANIFEST_KEYS.indexOf(key)===-1) fault('INVALID_MANIFEST','Unknown manifest field '+key);
      if (!Number.isInteger(manifest[key])||manifest[key]<0)
        fault('INVALID_MANIFEST','Manifest counts must be non-negative integers');
    });
    MANIFEST_KEYS.forEach(function(key){
      if (!own(manifest,key)) fault('INVALID_MANIFEST','Manifest requires '+key);
      wire[key]=manifest[key];
    });
    return JSON.stringify(wire);
  }
  function decodeManifest(text) {
    if (typeof text!=='string') fault('INVALID_MANIFEST','Manifest must be text');
    var wire;
    try {wire=JSON.parse(text);} catch(e){fault('INVALID_MANIFEST','Malformed manifest JSON');}
    if (!plain(wire)) fault('INVALID_MANIFEST','Manifest must be a plain record');
    var keys=Object.keys(wire).sort();
    if (keys.join(',')!==MANIFEST_KEYS.slice().sort().join(','))
      fault('INVALID_MANIFEST','Manifest requires exactly '+MANIFEST_KEYS.join(', '));
    MANIFEST_KEYS.forEach(function(key){
      if (!Number.isInteger(wire[key])||wire[key]<0)
        fault('INVALID_MANIFEST','Manifest counts must be non-negative integers');
    });
    if (JSON.stringify(wire)!==encodeManifest(wire)) fault('INVALID_MANIFEST','Non-canonical manifest');
    return wire;
  }
  root.FarmaciaBridgeEaTypedCodec=Object.freeze({
    VERSION:CODEC,OBSERVATION_CODEC:OBSERVATION_CODEC,MANIFEST_CODEC:MANIFEST_CODEC,
    ASSOCIATION_FIELDS:Object.freeze(ASSOCIATION_KEYS.slice()),
    encode:encode,decode:decode,inspect:capture,
    encodeObservation:encodeObservation,decodeObservation:decodeObservation,
    encodeManifest:encodeManifest,decodeManifest:decodeManifest
  });
})(typeof window !== 'undefined' ? window : globalThis);
