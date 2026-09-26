#!/usr/bin/env node
'use strict';
/**
 * Offline build-time code generator for the PROMueve Nexus Home schema
 * validators (F3.2 WU-A).
 *
 * Reads the four accepted deployment schemas under schemas/deployment/ and
 * emits a single self-contained classic browser script that attaches
 * PromueveHome.SchemaValidators = { registry, profile, manifest, readiness },
 * where each value is a function(doc) -> array of error strings ([] = valid).
 *
 * The generated file embeds the schemas as data plus one generic JSON Schema
 * (draft 2020-12 subset) interpreter. There is no runtime schema compiler, no
 * import/export, no CDN and no remote configuration: the artifact is a
 * deterministic function of the committed schemas. Dependency-free by design
 * (Node built-ins only); the repository devDependency "ajv" is not required
 * here.
 *
 * Usage:
 *   node tools/home_validators_build.mjs [--schema-dir <dir>] [--out <path>]
 *
 * --schema-dir defaults to schemas/deployment and --out defaults to
 * modules/home/home-schema-validators.generated.js. The generator runs a
 * fail-closed keyword gate over the raw schemas before writing anything: any
 * schema keyword outside the explicitly supported set aborts the build with a
 * deterministic error naming the offending schema file and keyword, and no
 * output file is created. The gate is also form-aware for `items`: the emitted
 * interpreter implements `items` only as a single schema, so the array (tuple)
 * form is rejected with its own deterministic message instead of being
 * descended into and silently becoming a no-op. This keeps the generated
 * interpreter and the accepted schemas from silently drifting apart. Running
 * the generator twice over the same schemas produces byte-identical output.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_SCHEMA_DIR = path.join(ROOT, 'schemas', 'deployment');
const DEFAULT_OUT = path.join(ROOT, 'modules', 'home', 'home-schema-validators.generated.js');

const SCHEMA_FILES = {
  registry: 'module-registry.schema.json',
  profile: 'deployment-profile.schema.json',
  manifest: 'deployment-manifest.schema.json',
  readiness: 'module-readiness.schema.json',
};

// Annotation-only keywords: they document the schema but carry no validation
// semantics. Dropping them keeps the generated artifact free of prose that is
// irrelevant to the browser runtime. The build gate recognizes the full set so
// an annotation can never fail the build.
const ANNOTATION_KEYS = new Set([
  '$schema', '$id', 'title', 'description', '$comment', 'default', 'examples',
  'deprecated', 'readOnly', 'writeOnly',
]);

// Non-annotation keywords the generated interpreter actually implements, plus
// the two schema-container keywords whose values are themselves schema maps.
// Anything outside this set is a silent no-op at runtime and therefore fails
// the build gate fail-closed.
const SUPPORTED_KEYWORDS = new Set([
  'type', 'const', 'enum', 'pattern', 'minLength', 'maxLength', 'minItems',
  'maxItems', 'uniqueItems', 'items', 'properties', 'required',
  'additionalProperties', '$ref', '$defs', 'definitions',
]);

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

// Recursively classify every keyword of every JSON Schema node. Boolean schema
// nodes are valid; containers (properties, additionalProperties, single-schema
// items, $defs/definitions) are descended into; leaf validation keywords are
// not. An `items` value that is a JSON array is the unsupported tuple form: it
// is recorded as a problem carrying its form and its elements are NOT
// descended into, because the runtime treats the whole array as a single
// (invalid) schema and therefore as a silent no-op.
function collectUnsupportedKeywords(node, schemaFile, pointer, problems) {
  if (typeof node === 'boolean') return;
  if (node === null || typeof node !== 'object' || Array.isArray(node)) return;
  for (const key of Object.keys(node)) {
    const value = node[key];
    if (ANNOTATION_KEYS.has(key)) continue;
    if (key === '$defs' || key === 'definitions') {
      if (isPlainObject(value)) {
        for (const defName of Object.keys(value)) {
          collectUnsupportedKeywords(value[defName], schemaFile, `${pointer}/${key}/${defName}`, problems);
        }
      }
      continue;
    }
    if (key === 'properties') {
      if (isPlainObject(value)) {
        for (const propName of Object.keys(value)) {
          collectUnsupportedKeywords(value[propName], schemaFile, `${pointer}/properties/${propName}`, problems);
        }
      }
      continue;
    }
    if (key === 'additionalProperties') {
      if (isPlainObject(value)) collectUnsupportedKeywords(value, schemaFile, `${pointer}/additionalProperties`, problems);
      continue;
    }
    if (key === 'items') {
      if (Array.isArray(value)) {
        // Tuple form: unsupported as a whole. Record the offending form and do
        // not descend into the elements (they are not separate schema nodes).
        problems.push({ schemaFile, keyword: key, pointer: `${pointer}/items`, form: 'array' });
      } else {
        collectUnsupportedKeywords(value, schemaFile, `${pointer}/items`, problems);
      }
      continue;
    }
    if (SUPPORTED_KEYWORDS.has(key)) continue;
    problems.push({ schemaFile, keyword: key, pointer });
  }
}

function readRawSchemas(schemaDir) {
  const rawSchemas = {};
  for (const [name, file] of Object.entries(SCHEMA_FILES)) {
    const raw = JSON.parse(fs.readFileSync(path.join(schemaDir, file), 'utf8'));
    rawSchemas[name] = { file, raw };
  }
  return rawSchemas;
}

function gateSchemas(rawSchemas) {
  const problems = [];
  for (const { file, raw } of Object.values(rawSchemas)) {
    collectUnsupportedKeywords(raw, file, '#', problems);
  }
  problems.sort((a, b) =>
    a.schemaFile.localeCompare(b.schemaFile) ||
    a.pointer.localeCompare(b.pointer) ||
    a.keyword.localeCompare(b.keyword) ||
    (a.form || '').localeCompare(b.form || '')
  );
  return problems;
}

function stripAnnotations(node) {
  if (Array.isArray(node)) return node.map(stripAnnotations);
  if (node !== null && typeof node === 'object') {
    const out = {};
    for (const key of Object.keys(node)) {
      if (ANNOTATION_KEYS.has(key)) continue;
      out[key] = stripAnnotations(node[key]);
    }
    return out;
  }
  return node;
}

function loadSchemas(schemaDir) {
  const schemas = {};
  for (const [name, file] of Object.entries(SCHEMA_FILES)) {
    const raw = JSON.parse(fs.readFileSync(path.join(schemaDir, file), 'utf8'));
    schemas[name] = stripAnnotations(raw);
  }
  return schemas;
}

// Generic draft 2020-12 subset interpreter. It implements exactly the
// keywords the four accepted schemas use (type, const, enum, pattern,
// minLength/maxLength, minItems/maxItems, uniqueItems, items, properties,
// required, additionalProperties and local $ref), so the schema-specific
// behaviour is data, never hand-copied logic.
const RUNTIME = `  function isPlainObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }

  // JSON Schema minLength/maxLength count Unicode code points, not UTF-16 code
  // units. Combining a surrogate pair into one count keeps astral characters
  // (e.g. emoji or mathematical alphanumerics) from being double counted.
  function codePointLength(value) {
    var count = 0;
    for (var i = 0; i < value.length; i++) {
      var code = value.charCodeAt(i);
      if (code >= 0xD800 && code <= 0xDBFF && i + 1 < value.length) {
        var next = value.charCodeAt(i + 1);
        if (next >= 0xDC00 && next <= 0xDFFF) i += 1;
      }
      count += 1;
    }
    return count;
  }

  function typeMatches(typeName, value) {
    switch (typeName) {
      case 'object': return isPlainObject(value);
      case 'array': return Array.isArray(value);
      case 'string': return typeof value === 'string';
      case 'boolean': return typeof value === 'boolean';
      case 'number': return typeof value === 'number' && isFinite(value);
      case 'integer': return typeof value === 'number' && isFinite(value) && value % 1 === 0;
      case 'null': return value === null;
      default: return true;
    }
  }

  function resolveRef(schema, rootSchema) {
    var schemaRef = schema;
    var hops = 0;
    while (schemaRef && typeof schemaRef.$ref === 'string' && hops < 32) {
      var pointer = schemaRef.$ref;
      if (pointer.charAt(0) !== '#') return null;
      var segments = pointer.slice(1).split('/');
      var target = rootSchema;
      for (var i = 0; i < segments.length; i++) {
        var segment = segments[i];
        if (segment === '') continue;
        segment = segment.replace(/~1/g, '/').replace(/~0/g, '~');
        if (target === null || typeof target !== 'object' ||
            !Object.prototype.hasOwnProperty.call(target, segment)) {
          return null;
        }
        target = target[segment];
      }
      schemaRef = target;
      hops += 1;
    }
    return schemaRef;
  }

  function sameValue(a, b) {
    if (a === b) return true;
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return false;
      for (var i = 0; i < a.length; i++) {
        if (!sameValue(a[i], b[i])) return false;
      }
      return true;
    }
    if (isPlainObject(a) && isPlainObject(b)) {
      var aKeys = Object.keys(a);
      var bKeys = Object.keys(b);
      if (aKeys.length !== bKeys.length) return false;
      for (var j = 0; j < aKeys.length; j++) {
        var key = aKeys[j];
        if (!Object.prototype.hasOwnProperty.call(b, key) || !sameValue(a[key], b[key])) return false;
      }
      return true;
    }
    return false;
  }

  function pushError(errors, pointer, message) {
    errors.push(pointer + ': ' + message);
  }

  function validate(schema, value, rootSchema, pointer, errors) {
    if (schema === true || schema === undefined) return;
    if (schema === false) {
      pushError(errors, pointer, 'is not allowed');
      return;
    }
    var resolved = resolveRef(schema, rootSchema);
    if (resolved === null || resolved === undefined) {
      pushError(errors, pointer, 'references an unknown schema');
      return;
    }
    schema = resolved;

    if (Object.prototype.hasOwnProperty.call(schema, 'type')) {
      var typeOk = false;
      if (Array.isArray(schema.type)) {
        for (var t = 0; t < schema.type.length; t++) {
          if (typeMatches(schema.type[t], value)) { typeOk = true; break; }
        }
      } else {
        typeOk = typeMatches(schema.type, value);
      }
      if (!typeOk) {
        var expected = Array.isArray(schema.type) ? schema.type.join(' or ') : schema.type;
        pushError(errors, pointer, 'must be of type ' + expected);
        return;
      }
    }

    if (Object.prototype.hasOwnProperty.call(schema, 'const') && value !== schema.const) {
      pushError(errors, pointer, 'must equal the constant value');
    }

    if (Array.isArray(schema.enum)) {
      var inEnum = false;
      for (var e = 0; e < schema.enum.length; e++) {
        if (value === schema.enum[e]) { inEnum = true; break; }
      }
      if (!inEnum) pushError(errors, pointer, 'must be one of the allowed values');
    }

    if (typeof value === 'string') {
      if (typeof schema.minLength === 'number' && codePointLength(value) < schema.minLength) {
        pushError(errors, pointer, 'is shorter than the minimum length');
      }
      if (typeof schema.maxLength === 'number' && codePointLength(value) > schema.maxLength) {
        pushError(errors, pointer, 'is longer than the maximum length');
      }
      if (typeof schema.pattern === 'string') {
        var compiled = null;
        try { compiled = new RegExp(schema.pattern); } catch (err) { compiled = null; }
        if (compiled && !compiled.test(value)) {
          pushError(errors, pointer, 'does not match the required pattern');
        }
      }
    }

    if (Array.isArray(value)) {
      if (typeof schema.minItems === 'number' && value.length < schema.minItems) {
        pushError(errors, pointer, 'has fewer items than allowed');
      }
      if (typeof schema.maxItems === 'number' && value.length > schema.maxItems) {
        pushError(errors, pointer, 'has more items than allowed');
      }
      if (schema.uniqueItems === true) {
        var duplicate = false;
        for (var a = 0; a < value.length && !duplicate; a++) {
          for (var b = a + 1; b < value.length; b++) {
            if (sameValue(value[a], value[b])) { duplicate = true; break; }
          }
        }
        if (duplicate) pushError(errors, pointer, 'contains duplicate items');
      }
      if (schema.items !== undefined) {
        for (var idx = 0; idx < value.length; idx++) {
          validate(schema.items, value[idx], rootSchema, pointer + '/' + idx, errors);
        }
      }
    }

    if (isPlainObject(value)) {
      if (Array.isArray(schema.required)) {
        for (var r = 0; r < schema.required.length; r++) {
          if (!Object.prototype.hasOwnProperty.call(value, schema.required[r])) {
            pushError(errors, pointer, 'is missing required property "' + schema.required[r] + '"');
          }
        }
      }
      var properties = isPlainObject(schema.properties) ? schema.properties : {};
      for (var name in properties) {
        if (Object.prototype.hasOwnProperty.call(properties, name) &&
            Object.prototype.hasOwnProperty.call(value, name)) {
          validate(properties[name], value[name], rootSchema, pointer + '/' + name, errors);
        }
      }
      if (schema.additionalProperties === false) {
        for (var key in value) {
          if (Object.prototype.hasOwnProperty.call(value, key) &&
              !Object.prototype.hasOwnProperty.call(properties, key)) {
            pushError(errors, pointer, 'has an unknown property "' + key + '"');
          }
        }
      } else if (isPlainObject(schema.additionalProperties)) {
        for (var extraKey in value) {
          if (Object.prototype.hasOwnProperty.call(value, extraKey) &&
              !Object.prototype.hasOwnProperty.call(properties, extraKey)) {
            validate(schema.additionalProperties, value[extraKey], rootSchema, pointer + '/' + extraKey, errors);
          }
        }
      }
    }
  }

  function makeValidator(schemaName) {
    return function (doc) {
      var errors = [];
      try {
        validate(SCHEMAS[schemaName], doc, SCHEMAS[schemaName], '$', errors);
      } catch (err) {
        errors.push('$: validator failure: ' + (err && err.message ? err.message : String(err)));
      }
      return errors;
    };
  }`;

function generateSource(schemas) {
  const schemaJson = JSON.stringify(schemas, null, 2);
  return `/* Generated by tools/home_validators_build.mjs — DO NOT EDIT BY HAND.
 *
 * Offline build-time code generation from schemas/deployment/*.json.
 * Self-contained classic browser script: no imports, no exports, no CDN,
 * no remote configuration and no runtime schema compiler. It attaches
 * PromueveHome.SchemaValidators = { registry, profile, manifest, readiness },
 * where each value is function(doc) -> array of error strings ([] = valid).
 *
 * Regenerate with: node tools/home_validators_build.mjs [--out <path>]
 */
(function (root) {
  'use strict';

  var SCHEMAS = ${schemaJson};

${RUNTIME}

  root.PromueveHome = root.PromueveHome || {};
  root.PromueveHome.SchemaValidators = {
    registry: makeValidator('registry'),
    profile: makeValidator('profile'),
    manifest: makeValidator('manifest'),
    readiness: makeValidator('readiness')
  };
})(typeof window !== 'undefined' ? window : globalThis);
`;
}

function parseArgs(argv) {
  let out = DEFAULT_OUT;
  let schemaDir = DEFAULT_SCHEMA_DIR;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--out') {
      if (!argv[i + 1]) throw new Error('--out requires a path argument');
      out = argv[i + 1];
      i += 1;
    } else if (arg.startsWith('--out=')) {
      out = arg.slice('--out='.length);
      if (!out) throw new Error('--out requires a path argument');
    } else if (arg === '--schema-dir') {
      if (!argv[i + 1]) throw new Error('--schema-dir requires a path argument');
      schemaDir = argv[i + 1];
      i += 1;
    } else if (arg.startsWith('--schema-dir=')) {
      schemaDir = arg.slice('--schema-dir='.length);
      if (!schemaDir) throw new Error('--schema-dir requires a path argument');
    } else {
      throw new Error(`unknown argument: ${arg}`);
    }
  }
  return { out, schemaDir };
}

function main() {
  const { out, schemaDir } = parseArgs(process.argv.slice(2));
  const problems = gateSchemas(readRawSchemas(schemaDir));
  if (problems.length > 0) {
    for (const problem of problems) {
      if (problem.form) {
        process.stderr.write(
          `home_validators_build: unsupported schema keyword "${problem.keyword}" form "${problem.form}" in ${problem.schemaFile} at ${problem.pointer}\n`
        );
      } else {
        process.stderr.write(
          `home_validators_build: unsupported schema keyword "${problem.keyword}" in ${problem.schemaFile} at ${problem.pointer}\n`
        );
      }
    }
    process.stderr.write(
      `home_validators_build: ${problems.length} unsupported schema keyword(s); refusing to write ${out}\n`
    );
    process.exit(1);
  }
  const source = generateSource(loadSchemas(schemaDir));
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, source);
  process.stderr.write(`home_validators_build: wrote ${path.relative(ROOT, out)}\n`);
}

main();
