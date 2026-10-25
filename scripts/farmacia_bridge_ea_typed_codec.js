/* FH Bridge raw EA codec v1. Pure typed JSON for ONE EA entity per row.
 * NO Pharmacy Act carrier, storage, DOM, parser execution, or clinical inference. */
(function (root) {
  'use strict';
  var CODEC = 'fh-ea-typed-json/1';
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
  root.FarmaciaBridgeEaTypedCodec=Object.freeze({
    VERSION:CODEC,encode:encode,decode:decode,inspect:capture
  });
})(typeof window !== 'undefined' ? window : globalThis);
