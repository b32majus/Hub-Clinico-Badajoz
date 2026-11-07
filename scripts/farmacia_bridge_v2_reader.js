/* Farmacia Excel Bridge v2 raw reader. */
(function (root) {
    'use strict';

    var READER_VERSION = '1.0.0';
    var REQUIRED_SHEETS = ['01_DERMA', '03_DIGESTIVO'];
    var SOURCE_TABLES = {
        '01_DERMA': 'tblBridgeDermaInput',
        '03_DIGESTIVO': 'tblBridgeDigestivoInput'
    };
    // Adenda C1 (29-10-2026): the mixed header is the V2 prefix (152 columns)
    // plus the 14 typed columns published by the Bridge 166 core.
    var MIXED_HEADER_COLUMN_COUNT = 166;

    function BridgeReaderError(code, message, details) {
        this.name = 'FarmaciaBridgeV2ReaderError';
        this.code = code;
        this.message = '[' + code + '] ' + message;
        this.details = details || null;
        if (Error.captureStackTrace) Error.captureStackTrace(this, BridgeReaderError);
    }
    BridgeReaderError.prototype = Object.create(Error.prototype);
    BridgeReaderError.prototype.constructor = BridgeReaderError;

    function requireDependency(value, name) {
        if (!value) throw new BridgeReaderError('BRIDGE_DEPENDENCY_MISSING', name + ' no está disponible.');
        return value;
    }

    function getDependencies(options) {
        var settings = options || {};
        return {
            core: requireDependency(settings.core || root.FarmaciaExportV2Core, 'FarmaciaExportV2Core'),
            xlsx: requireDependency(settings.xlsx || root.XLSX, 'SheetJS (XLSX)'),
            // Optional: only a 166-column header needs the typed 166 core.
            typedCore: settings.typedCore || root.FarmaciaBridgeRawEaV21Core || null
        };
    }

    function hasPhysicalValue(cell) {
        return !!(cell && (cell.f || (cell.v !== undefined && cell.v !== null)));
    }

    function getRange(sheet, xlsx) {
        if (!sheet || !sheet['!ref']) return { s: { r: 0, c: 0 }, e: { r: 0, c: 0 } };
        return xlsx.utils.decode_range(sheet['!ref']);
    }

    function getHeader(sheet, xlsx) {
        var range = getRange(sheet, xlsx);
        var lastColumn = -1;
        var values = [];
        for (var column = 0; column <= range.e.c; column++) {
            var cell = sheet[xlsx.utils.encode_cell({ r: 0, c: column })];
            if (hasPhysicalValue(cell)) lastColumn = column;
            values[column] = cell && cell.v !== undefined && cell.v !== null ? cell.v : '';
        }
        return lastColumn < 0 ? [] : values.slice(0, lastColumn + 1);
    }

    function countContractHeaderSignals(workbook, core, xlsx) {
        var expected = Object.create(null);
        var legacyShared = Object.create(null);
        legacyShared[core.ROW_COLUMNS[16]] = true;
        legacyShared[core.ROW_COLUMNS[17]] = true;
        core.ROW_COLUMNS.forEach(function (name) {
            if (!legacyShared[name]) expected[name] = true;
        });
        var highest = 0;
        (workbook.SheetNames || []).forEach(function (sheetName) {
            var header = getHeader(workbook.Sheets[sheetName], xlsx);
            var matches = 0;
            header.forEach(function (value) {
                if (typeof value === 'string' && expected[value]) matches++;
            });
            if (matches > highest) highest = matches;
        });
        return highest;
    }

    function headerColumnsFor(dependencies, header) {
        var core = dependencies.core;
        if (header.length === core.ROW_COLUMNS.length) return core.ROW_COLUMNS;
        if (dependencies.typedCore && header.length === dependencies.typedCore.ROW_COLUMNS.length) {
            return dependencies.typedCore.ROW_COLUMNS;
        }
        return null;
    }

    function inspectWorkbook(workbook, options) {
        var dependencies = getDependencies(options);
        var core = dependencies.core;
        var xlsx = dependencies.xlsx;
        if (!workbook || !Array.isArray(workbook.SheetNames) || !workbook.Sheets) {
            throw new BridgeReaderError('BRIDGE_INVALID_WORKBOOK', 'El workbook no tiene una estructura SheetJS válida.');
        }

        var headerSignals = countContractHeaderSignals(workbook, core, xlsx);
        // The published legacy workbook shares sheet names plus two generic
        // columns with Bridge. Any other canonical header is a Bridge signal.
        if (headerSignals === 0) return { kind: 'legacy', valid: true, errors: [] };

        var errors = [];
        var headers = Object.create(null);
        var headerColumnCount = null;
        REQUIRED_SHEETS.forEach(function (sheetName) {
            var sheet = workbook.Sheets[sheetName];
            if (!sheet) {
                errors.push({ code: 'BRIDGE_REQUIRED_SHEET_MISSING', source_sheet: sheetName });
                headers[sheetName] = null;
                return;
            }
            headers[sheetName] = getHeader(sheet, xlsx);
        });
        REQUIRED_SHEETS.forEach(function (sheetName) {
            var header = headers[sheetName];
            if (!header) return;
            // The typed core is mandatory as soon as one required sheet
            // declares the 166-column header, even when nothing is read yet.
            if (header.length !== core.ROW_COLUMNS.length && !dependencies.typedCore
                && header.length === MIXED_HEADER_COLUMN_COUNT) {
                requireDependency(dependencies.typedCore, 'FarmaciaBridgeRawEaV21Core');
            }
            if (headerColumnCount === null) {
                headerColumnCount = header.length;
                return;
            }
            if (header.length !== headerColumnCount) {
                errors.push({
                    code: 'BRIDGE_HEADER_COUNT_MISMATCH',
                    source_sheet: sheetName,
                    expected: headerColumnCount,
                    actual: header.length
                });
            }
        });
        if (headerColumnCount === null) headerColumnCount = core.ROW_COLUMNS.length;

        REQUIRED_SHEETS.forEach(function (sheetName) {
            var sheet = workbook.Sheets[sheetName];
            if (!sheet) return;
            var header = headers[sheetName];
            var headerRange = getRange(sheet, xlsx);
            for (var headerColumn = 0; headerColumn <= headerRange.e.c; headerColumn++) {
                var headerCell = sheet[xlsx.utils.encode_cell({ r: 0, c: headerColumn })];
                if (headerCell && headerCell.f) {
                    errors.push({ code: 'BRIDGE_FORMULA_DETECTED', source_sheet: sheetName, physical_row_number: 1, column_number: headerColumn + 1 });
                }
            }
            var duplicates = [];
            var seen = Object.create(null);
            header.forEach(function (value) {
                if (typeof value !== 'string' || !value) return;
                if (seen[value] && duplicates.indexOf(value) === -1) duplicates.push(value);
                seen[value] = true;
            });
            if (duplicates.length) {
                errors.push({ code: 'BRIDGE_DUPLICATE_HEADER', source_sheet: sheetName, headers: duplicates });
            }
            // Both required sheets must declare the same published contract and
            // exactly the same number of columns.
            var columns = headerColumnsFor(dependencies, header);
            if (!columns) {
                errors.push({
                    code: 'BRIDGE_HEADER_COUNT_MISMATCH',
                    source_sheet: sheetName,
                    expected: core.ROW_COLUMNS.length,
                    actual: header.length
                });
                return;
            }
            for (var index = 0; index < columns.length; index++) {
                if (header[index] !== columns[index]) {
                    errors.push({
                        code: 'BRIDGE_HEADER_MISMATCH',
                        source_sheet: sheetName,
                        column_number: index + 1,
                        expected: columns[index],
                        actual: header[index]
                    });
                    break;
                }
            }
        });
        return { kind: 'bridge_v2', valid: errors.length === 0, errors: errors, headerColumnCount: headerColumnCount };
    }

    function throwErrors(errors, message) {
        var first = errors[0] || { code: 'BRIDGE_IMPORT_REJECTED' };
        throw new BridgeReaderError(first.code, message || 'Importación Bridge rechazada de forma segura.', errors);
    }

    function coreErrorContains(error, code) {
        if (!error) return false;
        if (error.code === code) return true;
        if (Array.isArray(error.details)) {
            return error.details.some(function (detail) { return coreErrorContains(detail, code); });
        }
        return false;
    }

    function hasOwn(object, key) {
        return Object.prototype.hasOwnProperty.call(object, key);
    }

    // Cell values of a typed row are canonical JSON; the reader never rewrites
    // them, it only copies them so nothing shares references with the source.
    function cloneCellValue(value) {
        if (value === null || value === undefined) return null;
        if (typeof value !== 'object') return value;
        return JSON.parse(JSON.stringify(value));
    }

    function cellJson(value) {
        if (typeof value !== 'string' || value === '') return { ok: false, value: null };
        try {
            return { ok: true, value: JSON.parse(value) };
        } catch (error) {
            return { ok: false, value: null };
        }
    }

    function declaredRowVersion(cells, versionColumn) {
        var decoded = cellJson(cells[versionColumn]);
        return decoded.ok && typeof decoded.value === 'string' ? decoded.value : null;
    }

    function hasExtraColumnValue(cells, start) {
        for (var index = start; index < cells.length; index++) {
            if (cells[index] !== undefined && cells[index] !== '') return true;
        }
        return false;
    }

    function pushV2Row(parsed, errors, tsv, sheetName, physicalRowNumber, core) {
        try {
            var canonicalRow = core.parseTsvRow(tsv);
            var validation = core.validateRow(canonicalRow);
            if (!validation.valid || core.serializeRowToTsv(canonicalRow) !== tsv) {
                errors.push({ code: 'BRIDGE_INVALID_CANONICAL_CELL', source_sheet: sheetName, physical_row_number: physicalRowNumber });
                return;
            }
            parsed.push({
                source_sheet: sheetName,
                source_table: SOURCE_TABLES[sheetName],
                physical_row_number: physicalRowNumber,
                row_version: 'v2',
                canonical_row: canonicalRow
            });
        } catch (error) {
            errors.push({
                code: coreErrorContains(error, 'INVALID_SCHEMA_VERSION') ? 'BRIDGE_UNSUPPORTED_VERSION' : 'BRIDGE_INVALID_CANONICAL_CELL',
                source_sheet: sheetName,
                physical_row_number: physicalRowNumber,
                core_code: error && error.code ? error.code : 'UNKNOWN'
            });
        }
    }

    function parsePhysicalRows(sheet, sheetName, dependencies, headerColumnCount) {
        var core = dependencies.core;
        var typedCore = dependencies.typedCore;
        var xlsx = dependencies.xlsx;
        var range = getRange(sheet, xlsx);
        var parsed = [];
        var errors = [];
        var expectedCount = headerColumnCount;
        var v2Header = expectedCount === core.ROW_COLUMNS.length;
        var versionColumn = core.ROW_COLUMNS.indexOf('row_schema_version');
        var sourceColumn = core.ROW_COLUMNS.indexOf('source_event_id');
        var indexColumn = core.ROW_COLUMNS.indexOf('row_index');

        for (var rowIndex = 1; rowIndex <= range.e.r; rowIndex++) {
            var cells = [];
            var rowHasValue = false;
            var rowInvalid = false;
            for (var column = 0; column <= Math.max(range.e.c, expectedCount - 1); column++) {
                var address = xlsx.utils.encode_cell({ r: rowIndex, c: column });
                var cell = sheet[address];
                if (!hasPhysicalValue(cell)) {
                    if (column < expectedCount) cells[column] = '';
                    continue;
                }
                rowHasValue = true;
                if (cell.f) {
                    errors.push({ code: 'BRIDGE_FORMULA_DETECTED', source_sheet: sheetName, physical_row_number: rowIndex + 1, column_number: column + 1 });
                    rowInvalid = true;
                    continue;
                }
                if (column >= expectedCount) {
                    errors.push({ code: 'BRIDGE_INVALID_CANONICAL_CELL', source_sheet: sheetName, physical_row_number: rowIndex + 1, column_number: column + 1 });
                    rowInvalid = true;
                    continue;
                }
                if (typeof cell.v === 'string') {
                    cells[column] = cell.v;
                } else if (typeof cell.v === 'number' || typeof cell.v === 'boolean') {
                    errors.push({ code: 'BRIDGE_CELL_COERCED', source_sheet: sheetName, physical_row_number: rowIndex + 1, column_number: column + 1, excel_type: typeof cell.v });
                    rowInvalid = true;
                } else {
                    errors.push({ code: 'BRIDGE_INVALID_CANONICAL_CELL', source_sheet: sheetName, physical_row_number: rowIndex + 1, column_number: column + 1 });
                    rowInvalid = true;
                }
            }
            if (!rowHasValue) continue;
            if (rowInvalid) continue;

            // A V2 row is always its published 152-cell prefix, also inside a
            // mixed header; a typed row keeps all 166 physical cells.
            var v2Tsv = cells.slice(0, core.ROW_COLUMNS.length).map(function (value) {
                return value === undefined ? '' : value;
            }).join('\t');
            var tsv = v2Header ? v2Tsv : cells.slice(0, expectedCount).map(function (value) {
                return value === undefined ? '' : value;
            }).join('\t');
            var physicalRowNumber = rowIndex + 1;
            if (v2Header) {
                pushV2Row(parsed, errors, v2Tsv, sheetName, physicalRowNumber, core);
                continue;
            }

            // Mixed header: the row version is only what the row declares.
            var declared = declaredRowVersion(cells, versionColumn);
            if (declared === core.ROW_SCHEMA_VERSION) {
                if (hasExtraColumnValue(cells, core.ROW_COLUMNS.length)) {
                    errors.push({ code: 'BRIDGE_V2_ROW_EXTRA_COLUMNS', source_sheet: sheetName, physical_row_number: physicalRowNumber });
                    continue;
                }
                pushV2Row(parsed, errors, v2Tsv, sheetName, physicalRowNumber, core);
                continue;
            }
            if (typedCore && declared === typedCore.VERSION) {
                var sourceCell = cellJson(cells[sourceColumn]);
                var indexCell = cellJson(cells[indexColumn]);
                if (!sourceCell.ok || typeof sourceCell.value !== 'string' || !sourceCell.value
                    || !indexCell.ok || !Number.isInteger(indexCell.value)) {
                    errors.push({ code: 'BRIDGE_INVALID_CANONICAL_CELL', source_sheet: sheetName, physical_row_number: physicalRowNumber });
                    continue;
                }
                // Typed rows are parsed as a whole act later: their physical
                // cells are kept verbatim so the published core decodes them.
                parsed.push({
                    source_sheet: sheetName,
                    source_table: SOURCE_TABLES[sheetName],
                    physical_row_number: physicalRowNumber,
                    row_version: 'typed',
                    typed_tsv: tsv,
                    source_event_id: sourceCell.value,
                    row_index: indexCell.value
                });
                continue;
            }
            errors.push({
                code: 'BRIDGE_UNSUPPORTED_VERSION',
                source_sheet: sheetName,
                physical_row_number: physicalRowNumber,
                declared_version: declared
            });
        }
        return { rows: parsed, errors: errors };
    }

    function mapRowSetError(error, group) {
        var code = error.code;
        if (code === 'COMMON_IDENTITY_MISMATCH' && error.field === 'event_id') code = 'BRIDGE_EVENT_ID_CONFLICT';
        else if (code === 'DUPLICATE_ROW_ID') code = 'BRIDGE_DUPLICATE_ROW_ID';
        else if (code === 'ROW_COUNT_MISMATCH' || code === 'ROW_INDEX_SEQUENCE' || code === 'ROW_INDEX_OUT_OF_RANGE' || code === 'INVALID_ROW_INDEX' || code === 'INVALID_ROW_COUNT') code = 'BRIDGE_INCOMPLETE_EVENT';
        else if (code === 'COMMON_IDENTITY_MISMATCH') code = 'BRIDGE_INCONSISTENT_EVENT';
        return {
            code: code,
            source_event_id: group.source_event_id,
            source_sheet: group.source_sheet,
            row: error.row || null,
            field: error.field || null,
            core_code: error.code
        };
    }

    function addIdentifierIndex(index, system, value, patientId, sourceEventId) {
        if (!index[system]) index[system] = Object.create(null);
        if (!index[system][value]) index[system][value] = { patient_id: patientId, source_event_ids: [] };
        if (index[system][value].source_event_ids.indexOf(sourceEventId) === -1) {
            index[system][value].source_event_ids.push(sourceEventId);
        }
    }

    function isIdentifierAbsent(value) {
        return value === null || value === '';
    }

    function checkGroupEventIds(rows, group, errors, eventIdToSource) {
        var eventIds = [];
        rows.forEach(function (row) {
            if (eventIds.indexOf(row.event_id) === -1) eventIds.push(row.event_id);
        });
        if (eventIds.length > 1) {
            errors.push({ code: 'BRIDGE_EVENT_ID_CONFLICT', source_event_id: group.source_event_id, source_sheet: group.source_sheet });
        }
        if (eventIds.length === 1) {
            var eventId = eventIds[0];
            if (eventIdToSource[eventId] && eventIdToSource[eventId] !== group.source_event_id) {
                errors.push({ code: 'BRIDGE_DUPLICATE_SOURCE_EVENT', event_id: eventId, source_event_ids: [eventIdToSource[eventId], group.source_event_id] });
            } else {
                eventIdToSource[eventId] = group.source_event_id;
            }
        }
    }

    // A typed act is decoded as a whole: row_count, row_index and the declared
    // manifest are only verifiable over the complete set.
    function parseTypedGroup(group, typedCore, errors) {
        var entries = group.entries.slice().sort(function (left, right) {
            return left.row_index - right.row_index;
        });
        var tsv = entries.map(function (entry) { return entry.typed_tsv; }).join('\n');
        try {
            var rows = typedCore.parseTsvRows(tsv);
            var validation = typedCore.validateRowSet(rows);
            if (!validation.valid) {
                errors.push({ code: 'BRIDGE_INVALID_TYPED_EVENT', source_event_id: group.source_event_id, source_sheet: group.source_sheet });
                return null;
            }
            for (var index = 0; index < rows.length; index++) {
                if (!typedCore.validateRow(rows[index]).valid) {
                    errors.push({ code: 'BRIDGE_INVALID_CANONICAL_CELL', source_sheet: group.source_sheet, physical_row_number: entries[index].physical_row_number });
                    return null;
                }
            }
            typedCore.decodeFollowupRows(rows);
            return { rows: rows, entries: entries };
        } catch (error) {
            errors.push({
                code: 'BRIDGE_INVALID_TYPED_EVENT',
                source_event_id: group.source_event_id,
                source_sheet: group.source_sheet,
                core_code: error && error.code ? error.code : 'UNKNOWN'
            });
            return null;
        }
    }

    // The old path only sees what a typed follow-up act declares explicitly:
    // the V2 prefix of its own act and line rows, never its EA rows.
    function projectLegacyRow(row, core) {
        var projected = {};
        core.ROW_COLUMNS.forEach(function (column) {
            projected[column] = hasOwn(row, column) ? cloneCellValue(row[column]) : null;
        });
        return projected;
    }

    function buildReadModel(entries, metadata, core, typedCore) {
        var groups = Object.create(null);
        var groupOrder = [];
        var errors = [];
        entries.forEach(function (entry) {
            var version = entry.row_version === 'typed' ? 'typed' : 'v2';
            var sourceEventId = version === 'typed' ? entry.source_event_id : entry.canonical_row.source_event_id;
            if (!groups[sourceEventId]) {
                groups[sourceEventId] = {
                    source_event_id: sourceEventId,
                    source_sheet: entry.source_sheet,
                    source_table: entry.source_table,
                    version: version,
                    mixed: false,
                    entries: []
                };
                groupOrder.push(sourceEventId);
            } else if (groups[sourceEventId].source_sheet !== entry.source_sheet) {
                errors.push({ code: 'BRIDGE_SOURCE_EVENT_CONFLICT', source_event_id: sourceEventId, source_sheets: [groups[sourceEventId].source_sheet, entry.source_sheet] });
            }
            var group = groups[sourceEventId];
            // One act, one version: the whole group is rejected otherwise.
            if (group.version !== version && !group.mixed) {
                group.mixed = true;
                errors.push({ code: 'BRIDGE_MIXED_EVENT_VERSION', source_event_id: sourceEventId, source_sheet: entry.source_sheet });
            }
            group.entries.push(entry);
        });

        var typedGroups = Object.create(null);
        var eventIdToSource = Object.create(null);
        groupOrder.forEach(function (sourceEventId) {
            var group = groups[sourceEventId];
            if (group.mixed) return;
            if (group.version === 'typed') {
                var typed = parseTypedGroup(group, typedCore, errors);
                if (typed) {
                    typedGroups[sourceEventId] = typed;
                    checkGroupEventIds(typed.rows, group, errors, eventIdToSource);
                }
                return;
            }
            group.entries.sort(function (left, right) { return left.canonical_row.row_index - right.canonical_row.row_index; });
            var rows = group.entries.map(function (entry) { return entry.canonical_row; });
            var validation = core.validateRowSet(rows);
            if (!validation.valid) {
                validation.errors.forEach(function (error) { errors.push(mapRowSetError(error, group)); });
            }
            checkGroupEventIds(rows, group, errors, eventIdToSource);
        });
        if (errors.length) throwErrors(errors);

        var model = {
            read_model_version: READER_VERSION,
            metadata: metadata,
            patients: Object.create(null),
            identifiers: [],
            events: [],
            typed_rows: [],
            patient_refs: Object.create(null),
            indexes: { by_patient_id: Object.create(null), by_identifier: Object.create(null) },
            source_errors: [],
            warnings: [],
            excluded_events: []
        };
        var identifierOwners = Object.create(null);
        var patientIdentifiers = Object.create(null);
        var patientRefsByPatient = Object.create(null);
        var patientsByRef = Object.create(null);

        // Declared identity of a 166 row, never inferred from CIP or patient_id.
        function registerPatientRef(patientId, patientRef) {
            var previousRef = patientRefsByPatient[patientId];
            if (previousRef !== undefined && previousRef !== patientRef) {
                errors.push({ code: 'BRIDGE_PATIENT_REF_CONFLICT', patient_id: patientId, fh_patient_refs: [previousRef, patientRef] });
                return;
            }
            var previousPatient = patientsByRef[patientRef];
            if (previousPatient !== undefined && previousPatient !== patientId) {
                errors.push({ code: 'BRIDGE_PATIENT_REF_CONFLICT', fh_patient_ref: patientRef, patient_ids: [previousPatient, patientId] });
                return;
            }
            patientRefsByPatient[patientId] = patientRef;
            patientsByRef[patientRef] = patientId;
            model.patient_refs[patientId] = patientRef;
        }

        groupOrder.forEach(function (sourceEventId) {
            var group = groups[sourceEventId];
            var typed = typedGroups[sourceEventId] || null;
            var groupRows = typed ? typed.rows : group.entries.map(function (entry) { return entry.canonical_row; });
            var groupEntries = typed ? typed.entries : group.entries;
            var first = groupRows[0];
            var traceRows = typed ? groupRows.reduce(function (accumulator, row, index) {
                if (row.row_role !== 'followup_act' && row.row_role !== 'followup_line') return accumulator;
                accumulator.push({
                    source_sheet: group.source_sheet,
                    source_table: group.source_table,
                    physical_row_number: groupEntries[index].physical_row_number,
                    canonical_row: projectLegacyRow(row, core)
                });
                return accumulator;
            }, []) : group.entries.map(function (entry) {
                return {
                    source_sheet: entry.source_sheet,
                    source_table: entry.source_table,
                    physical_row_number: entry.physical_row_number,
                    canonical_row: entry.canonical_row
                };
            });
            var eventRecord = {
                source_event_id: sourceEventId,
                event_id: first.event_id,
                event_type: first.event_type,
                patient_id: first.patient_id,
                source_sheet: group.source_sheet,
                source_table: group.source_table,
                physical_row_numbers: groupEntries.map(function (entry) { return entry.physical_row_number; }),
                rows: traceRows
            };
            if (groupRows.some(function (row) { return row.bridge_status === 'ERROR'; })) {
                groupRows.forEach(function (row, index) {
                    if (row.bridge_status !== 'ERROR') return;
                    model.source_errors.push({
                        source_event_id: row.source_event_id,
                        event_id: row.event_id,
                        row_id: row.row_id,
                        source_sheet: groupEntries[index].source_sheet,
                        source_table: groupEntries[index].source_table,
                        physical_row_number: groupEntries[index].physical_row_number,
                        bridge_error_code: row.bridge_error_code,
                        bridge_error_detail: row.bridge_error_detail
                    });
                });
                eventRecord.exclusion_code = 'BRIDGE_EVENT_STATUS_ERROR';
                model.excluded_events.push(eventRecord);
                return;
            }

            var system = first.identifier_system;
            var value = first.identifier_value;
            var patientId = first.patient_id;
            var systemAbsent = isIdentifierAbsent(system);
            var valueAbsent = isIdentifierAbsent(value);
            if (systemAbsent !== valueAbsent) {
                model.warnings.push({ code: 'IDENTIFIER_PAIR_INCOMPLETE', source_event_id: sourceEventId, patient_id: patientId });
            }
            if (!systemAbsent && !valueAbsent) {
                var pairKey = JSON.stringify([system, value]);
                if (identifierOwners[pairKey] && identifierOwners[pairKey] !== patientId) {
                    errors.push({ code: 'IDENTIFIER_MAPPING_CONFLICT', identifier_system: system, identifier_value: value, patient_ids: [identifierOwners[pairKey], patientId] });
                } else {
                    identifierOwners[pairKey] = patientId;
                }
                if (patientIdentifiers[patientId] && patientIdentifiers[patientId] !== pairKey) {
                    errors.push({ code: 'PATIENT_IDENTITY_CONFLICT', patient_id: patientId });
                } else {
                    patientIdentifiers[patientId] = pairKey;
                }
            }

            if (!model.patients[patientId]) {
                model.patients[patientId] = { patient_id: patientId, identifiers: [], source_event_ids: [] };
                model.indexes.by_patient_id[patientId] = [];
            }
            if (!systemAbsent && !valueAbsent && !model.patients[patientId].identifiers.some(function (identifier) {
                return identifier.identifier_system === system && identifier.identifier_value === value;
            })) {
                var identifier = { identifier_system: system, identifier_value: value };
                model.patients[patientId].identifiers.push(identifier);
                model.identifiers.push({ identifier_system: system, identifier_value: value, patient_id: patientId });
            }
            model.patients[patientId].source_event_ids.push(sourceEventId);
            model.indexes.by_patient_id[patientId].push(sourceEventId);
            if (!systemAbsent && !valueAbsent) addIdentifierIndex(model.indexes.by_identifier, system, value, patientId, sourceEventId);
            model.events.push(eventRecord);
            if (typed) {
                registerPatientRef(patientId, first.fh_patient_ref);
                groupRows.forEach(function (row) { model.typed_rows.push(cloneCellValue(row)); });
            }
        });
        if (errors.length) throwErrors(errors);

        metadata.row_count = entries.length;
        metadata.event_count = model.events.length;
        metadata.patient_count = Object.keys(model.patients).length;
        metadata.excluded_event_count = model.excluded_events.length;
        return model;
    }

    function readWorkbook(workbook, options) {
        var settings = options || {};
        var dependencies = getDependencies(settings);
        var inspection = inspectWorkbook(workbook, settings);
        if (inspection.kind === 'legacy') return null;
        if (!inspection.valid) throwErrors(inspection.errors, 'La estructura Bridge está incompleta o alterada.');

        var entries = [];
        var errors = [];
        var sheetMetadata = [];
        REQUIRED_SHEETS.forEach(function (sheetName) {
            var result = parsePhysicalRows(workbook.Sheets[sheetName], sheetName, dependencies, inspection.headerColumnCount);
            entries = entries.concat(result.rows);
            errors = errors.concat(result.errors);
            sheetMetadata.push({
                source_sheet: sheetName,
                source_table: SOURCE_TABLES[sheetName],
                physical_data_row_count: result.rows.length
            });
        });
        if (errors.length) throwErrors(errors);

        return buildReadModel(entries, {
            format: 'farmacia_bridge_v2_raw',
            reader_version: READER_VERSION,
            header_column_count: inspection.headerColumnCount,
            file_name: settings.fileName || '',
            imported_at: settings.importedAt || new Date().toISOString(),
            event_schema_version: dependencies.core.EVENT_SCHEMA_VERSION,
            row_schema_version: dependencies.core.ROW_SCHEMA_VERSION,
            sheet_names: (workbook.SheetNames || []).slice(),
            sheets: sheetMetadata
        }, dependencies.core, dependencies.typedCore);
    }

    root.FarmaciaBridgeV2Reader = Object.freeze({
        READER_VERSION: READER_VERSION,
        REQUIRED_SHEETS: Object.freeze(REQUIRED_SHEETS.slice()),
        BridgeReaderError: BridgeReaderError,
        inspectWorkbook: inspectWorkbook,
        readWorkbook: readWorkbook
    });
})(typeof window !== 'undefined' ? window : globalThis);
