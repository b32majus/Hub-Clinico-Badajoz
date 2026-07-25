#!/usr/bin/env python3
from pathlib import Path
import hashlib

PATH = Path('scripts/farmacia_multitreatment_core.js')
EXPECTED_INPUT_BLOB = 'eae62d7e57992166da5fb17a5ce5c1c0dab6eddf'
EXPECTED_OUTPUT_BLOB = '62c985675ba89417c3d95d323a2b51388a514b06'


def git_blob_sha(data: bytes) -> str:
    return hashlib.sha1(b'blob ' + str(len(data)).encode() + b'\0' + data).hexdigest()


def replace_once(source: str, old: str, new: str) -> str:
    if source.count(old) != 1:
        raise SystemExit(f'expected exactly one match, found {source.count(old)}: {old[:80]!r}')
    return source.replace(old, new, 1)

raw = PATH.read_bytes()
if git_blob_sha(raw) != EXPECTED_INPUT_BLOB:
    raise SystemExit(f'unexpected input blob: {git_blob_sha(raw)}')
s = raw.decode('utf-8')

s = replace_once(
    s,
    'var MOVEMENT_TYPES = ["switch", "add_on", "suspension", "pause", "resume", "optimization", "completion"];',
    'var MOVEMENT_TYPES = ["start", "switch", "add_on", "suspension", "pause", "resume", "optimization", "completion"];'
)

s = replace_once(
    s,
    '''        if (["suspension", "pause", "resume", "optimization", "completion"].indexOf(type) !== -1 && !target) {\n            throw new Error(type + " requires target_line_id");\n        }\n        return {''',
    '''        if (type === "start") {\n            if (!target) throw new Error("start requires target_line_id");\n            if (!text(source.effective_at)) throw new Error("start requires effective_at");\n            if (!text(source.validation_act_id)) throw new Error("start requires validation_act_id");\n            if (!text(source.declared_by_demo)) throw new Error("start requires declared_by_demo");\n            if (from || to || base) throw new Error("start cannot include from_line_id, to_line_id, or base_line_id");\n        }\n        if (["suspension", "pause", "resume", "optimization", "completion"].indexOf(type) !== -1 && !target) {\n            throw new Error(type + " requires target_line_id");\n        }\n        return {'''
)

s = replace_once(
    s,
    '''        if (line.provenance === "validated_in_hub") {\n            return line.status === "validated_not_started" && !!line.source_request_id && !!line.source_validation_act_id;\n        }''',
    '''        if (line.provenance === "validated_in_hub") {\n            var supportedStatus = line.status === "validated_not_started" || line.status === "active";\n            var startDateCoherent = line.status === "active" ? !!line.start_date : line.start_date === "";\n            return supportedStatus && startDateCoherent && !!line.source_request_id && !!line.source_validation_act_id;\n        }'''
)

s = replace_once(
    s,
    '''        if (movement.movement_type === "add_on" && (!movement.base_line_id || !(movement.target_line_id || movement.to_line_id))) return false;\n        if (["suspension", "pause", "resume", "optimization", "completion"].indexOf(movement.movement_type) !== -1 && !movement.target_line_id) return false;\n        return true;''',
    '''        if (movement.movement_type === "add_on" && (!movement.base_line_id || !(movement.target_line_id || movement.to_line_id))) return false;\n        if (movement.movement_type === "start") {\n            if (!movement.target_line_id || !movement.effective_at || !movement.validation_act_id || !movement.declared_by_demo) return false;\n            if (movement.from_line_id || movement.to_line_id || movement.base_line_id) return false;\n        }\n        if (["suspension", "pause", "resume", "optimization", "completion"].indexOf(movement.movement_type) !== -1 && !movement.target_line_id) return false;\n        return true;'''
)

s = replace_once(
    s,
    '''        Object.keys(patient.movements).forEach(function (key) {\n            var movement = patient.movements[key];\n            [movement.target_line_id, movement.from_line_id, movement.to_line_id, movement.base_line_id].filter(Boolean).forEach(function (lineId) {\n                if (!own(patient.lines, lineId)) errors.push("movement has dangling line reference");\n            });\n            if (movement.validation_act_id && !own(patient.validation_acts, movement.validation_act_id)) errors.push("movement has dangling validation reference");\n        });\n        if (patient.selected_line_id && !own(patient.lines, patient.selected_line_id)) errors.push("selected line does not belong to patient");''',
    '''        Object.keys(patient.movements).forEach(function (key) {\n            var movement = patient.movements[key];\n            [movement.target_line_id, movement.from_line_id, movement.to_line_id, movement.base_line_id].filter(Boolean).forEach(function (lineId) {\n                if (!own(patient.lines, lineId)) errors.push("movement has dangling line reference");\n            });\n            if (movement.validation_act_id && !own(patient.validation_acts, movement.validation_act_id)) errors.push("movement has dangling validation reference");\n            if (movement.movement_type === "start") {\n                var startedLine = patient.lines[movement.target_line_id];\n                if (!startedLine || startedLine.provenance !== "validated_in_hub") errors.push("start movement requires validated-in-Hub line");\n                else {\n                    if (startedLine.status !== "active") errors.push("start movement target must be active");\n                    if (startedLine.start_date !== movement.effective_at) errors.push("start movement date must match line start_date");\n                    if (startedLine.source_validation_act_id !== movement.validation_act_id) errors.push("start movement validation reference mismatch");\n                }\n            }\n        });\n        Object.keys(patient.lines).forEach(function (key) {\n            var line = patient.lines[key];\n            if (line.provenance !== "validated_in_hub") return;\n            var starts = Object.keys(patient.movements).map(function (movementId) {\n                return patient.movements[movementId];\n            }).filter(function (movement) {\n                return movement.movement_type === "start" && movement.target_line_id === line.line_id;\n            });\n            if (line.status === "validated_not_started") {\n                if (line.start_date) errors.push("validated_not_started line cannot have start_date");\n                if (starts.length) errors.push("validated_not_started line cannot have start movement");\n            }\n            if (line.status === "active") {\n                if (!line.start_date) errors.push("active validated-in-Hub line requires start_date");\n                if (starts.length !== 1) errors.push("active validated-in-Hub line requires exactly one start movement");\n                if (starts.length === 1) {\n                    if (starts[0].effective_at !== line.start_date) errors.push("active line and start movement dates differ");\n                    if (starts[0].validation_act_id !== line.source_validation_act_id) errors.push("active line and start movement validation differ");\n                }\n            }\n        });\n        if (patient.selected_line_id && !own(patient.lines, patient.selected_line_id)) errors.push("selected line does not belong to patient");'''
)

confirm = '''\n    function confirmTreatmentStart(input, options) {\n        var source = isRecord(input) ? input : {};\n        var store = source.store;\n        if (!store || typeof store.load !== "function" || typeof store.save !== "function") {\n            throw new Error("store is required");\n        }\n        var patientId = requireText(source.patient_id, "patient_id");\n        var lineId = requireText(source.line_id, "line_id");\n        var startDate = requireText(source.start_date, "start_date");\n        var declaredBy = requireText(source.declared_by_demo, "declared_by_demo");\n        var createdAt = requireText(source.created_at, "created_at");\n        var state = store.load();\n        if (!sessionStateIsValid(state)) throw new Error("invalid session state");\n        var patient = state.patients[patientId];\n        if (!patient) throw new Error("patient not found");\n        var line = patient.lines[lineId];\n        if (!line) throw new Error("line not found");\n        if (line.patient_id !== patientId) throw new Error("line patient mismatch");\n        if (line.provenance !== "validated_in_hub") throw new Error("only validated-in-Hub line can be started");\n        var act = patient.validation_acts[line.source_validation_act_id];\n        if (!act || act.result !== "validated" || act.produced_line_id !== line.line_id) {\n            throw new Error("positive validation for line is required");\n        }\n        var existingStarts = Object.keys(patient.movements).map(function (movementId) {\n            return patient.movements[movementId];\n        }).filter(function (movement) {\n            return movement.movement_type === "start" && movement.target_line_id === lineId;\n        });\n        if (line.status === "active") {\n            if (line.start_date !== startDate) throw new Error("active line start_date cannot be changed");\n            if (existingStarts.length !== 1) throw new Error("active line must have exactly one start movement");\n            return {\n                state: clone(state),\n                line: clone(line),\n                movement: clone(existingStarts[0]),\n                idempotent: true\n            };\n        }\n        if (line.status !== "validated_not_started") throw new Error("line is not pending explicit start");\n        if (line.start_date) throw new Error("line already has start_date");\n        if (existingStarts.length) throw new Error("line already has start movement");\n        var next = clone(state);\n        var nextPatient = next.patients[patientId];\n        var nextLine = nextPatient.lines[lineId];\n        nextLine.status = "active";\n        nextLine.start_date = startDate;\n        nextLine.updated_at = createdAt;\n        var movement = createTreatmentMovement({\n            patient_id: patientId,\n            movement_type: "start",\n            target_line_id: lineId,\n            effective_at: startDate,\n            validation_act_id: line.source_validation_act_id,\n            declared_by_demo: declaredBy,\n            created_at: createdAt\n        }, options);\n        nextPatient.movements[movement.movement_id] = movement;\n        if (!sessionStateIsValid(next)) throw new Error("invalid treatment start transaction");\n        var saved = store.save(next);\n        return {\n            state: clone(saved),\n            line: clone(saved.patients[patientId].lines[lineId]),\n            movement: clone(saved.patients[patientId].movements[movement.movement_id]),\n            idempotent: false\n        };\n    }\n'''
s = replace_once(s, '    function createSessionStore(storage) {', confirm + '\n    function createSessionStore(storage) {')
s = replace_once(
    s,
    '        createTreatmentMovement: createTreatmentMovement,\n        createEmptySessionState: createEmptySessionState,',
    '        createTreatmentMovement: createTreatmentMovement,\n        confirmTreatmentStart: confirmTreatmentStart,\n        createEmptySessionState: createEmptySessionState,'
)

out = s.encode('utf-8')
if git_blob_sha(out) != EXPECTED_OUTPUT_BLOB:
    raise SystemExit(f'unexpected output blob: {git_blob_sha(out)}')
PATH.write_bytes(out)
print(f'patched {PATH} -> {EXPECTED_OUTPUT_BLOB}')
