/* Farmacia Excel Bridge v2 raw reader. */
(function (root) {
    'use strict';

    var READER_VERSION = '1.0.0';
    var REQUIRED_SHEETS = ['01_DERMA', '03_DIGESTIVO'];
    var SOURCE_TABLES = {
        '01_DERMA': 'tblBridgeDermaInput',
        '03_DIGESTIVO': 'tblBridgeDigestivoInput'
    };

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
            xlsx: requireDependency(settings.xlsx || root.XLSX, 'SheetJS (XLSX)')
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
        REQUIRED_SHEETS.forEach(function (sheetName) {
            var sheet = workbook.Sheets[sheetName];
            if (!sheet) {
                errors.push({ code: 'BRIDGE_REQUIRED_SHEET_MISSING', source_sheet: sheetName });
                return;
            }
            var header = getHeader(sheet, xlsx);
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
            if (header.length !== core.ROW_COLUMNS.length) {
                errors.push({
                    code: 'BRIDGE_HEADER_COUNT_MISMATCH',
                    source_sheet: sheetName,
                    expected: core.ROW_COLUMNS.length,
                    actual: header.length
                });
                return;
            }
            for (var index = 0; index < core.ROW_COLUMNS.length; index++) {
                if (header[index] !== core.ROW_COLUMNS[index]) {
                    errors.push({
                        code: 'BRIDGE_HEADER_MISMATCH',
                        source_sheet: sheetName,
                        column_number: index + 1,
                        expected: core.ROW_COLUMNS[index],
                        actual: header[index]
                    });
                    break;
                }
            }
        });
        return { kind: 'bridge_v2', valid: errors.length === 0, errors: errors };
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

    function parsePhysicalRows(sheet, sheetName, core, xlsx) {
        var range = getRange(sheet, xlsx);
        var parsed = [];
        var errors = [];
        var expectedCount = core.ROW_COLUMNS.length;

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

            var tsv = cells.slice(0, expectedCount).map(function (value) {
                return value === undefined ? '' : value;
            }).join('\t');
            try {
                var canonicalRow = core.parseTsvRow(tsv);
                var validation = core.validateRow(canonicalRow);
                if (!validation.valid || core.serializeRowToTsv(canonicalRow) !== tsv) {
                    errors.push({ code: 'BRIDGE_INVALID_CANONICAL_CELL', source_sheet: sheetName, physical_row_number: rowIndex + 1 });
                    continue;
                }
                parsed.push({
                    source_sheet: sheetName,
                    source_table: SOURCE_TABLES[sheetName],
                    physical_row_number: rowIndex + 1,
                    canonical_row: canonicalRow
                });
            } catch (error) {
                errors.push({
                    code: coreErrorContains(error, 'INVALID_SCHEMA_VERSION') ? 'BRIDGE_UNSUPPORTED_VERSION' : 'BRIDGE_INVALID_CANONICAL_CELL',
                    source_sheet: sheetName,
                    physical_row_number: rowIndex + 1,
                    core_code: error && error.code ? error.code : 'UNKNOWN'
                });
            }
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

    function buildReadModel(entries, metadata, core) {
        var groups = Object.create(null);
        var groupOrder = [];
        var errors = [];
        entries.forEach(function (entry) {
            var sourceEventId = entry.canonical_row.source_event_id;
            if (!groups[sourceEventId]) {
                groups[sourceEventId] = {
                    source_event_id: sourceEventId,
                    source_sheet: entry.source_sheet,
                    source_table: entry.source_table,
                    entries: []
                };
                groupOrder.push(sourceEventId);
            } else if (groups[sourceEventId].source_sheet !== entry.source_sheet) {
                errors.push({ code: 'BRIDGE_SOURCE_EVENT_CONFLICT', source_event_id: sourceEventId, source_sheets: [groups[sourceEventId].source_sheet, entry.source_sheet] });
            }
            groups[sourceEventId].entries.push(entry);
        });

        var eventIdToSource = Object.create(null);
        groupOrder.forEach(function (sourceEventId) {
            var group = groups[sourceEventId];
            group.entries.sort(function (left, right) { return left.canonical_row.row_index - right.canonical_row.row_index; });
            var rows = group.entries.map(function (entry) { return entry.canonical_row; });
            var validation = core.validateRowSet(rows);
            if (!validation.valid) {
                validation.errors.forEach(function (error) { errors.push(mapRowSetError(error, group)); });
            }
            var eventIds = [];
            rows.forEach(function (row) {
                if (eventIds.indexOf(row.event_id) === -1) eventIds.push(row.event_id);
            });
            if (eventIds.length > 1) {
                errors.push({ code: 'BRIDGE_EVENT_ID_CONFLICT', source_event_id: sourceEventId, source_sheet: group.source_sheet });
            }
            if (eventIds.length === 1) {
                var eventId = eventIds[0];
                if (eventIdToSource[eventId] && eventIdToSource[eventId] !== sourceEventId) {
                    errors.push({ code: 'BRIDGE_DUPLICATE_SOURCE_EVENT', event_id: eventId, source_event_ids: [eventIdToSource[eventId], sourceEventId] });
                } else {
                    eventIdToSource[eventId] = sourceEventId;
                }
            }
        });
        if (errors.length) throwErrors(errors);

        var model = {
            read_model_version: READER_VERSION,
            metadata: metadata,
            patients: Object.create(null),
            identifiers: [],
            events: [],
            indexes: { by_patient_id: Object.create(null), by_identifier: Object.create(null) },
            source_errors: [],
            warnings: [],
            excluded_events: []
        };
        var identifierOwners = Object.create(null);
        var patientIdentifiers = Object.create(null);

        groupOrder.forEach(function (sourceEventId) {
            var group = groups[sourceEventId];
            var first = group.entries[0].canonical_row;
            var traceRows = group.entries.map(function (entry) {
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
                physical_row_numbers: group.entries.map(function (entry) { return entry.physical_row_number; }),
                rows: traceRows
            };
            if (group.entries.some(function (entry) { return entry.canonical_row.bridge_status === 'ERROR'; })) {
                eventRecord.exclusion_code = 'BRIDGE_EVENT_STATUS_ERROR';
                model.excluded_events.push(eventRecord);
                return;
            }

            var system = first.identifier_system;
            var value = first.identifier_value;
            var patientId = first.patient_id;
            if ((system === null) !== (value === null)) {
                model.warnings.push({ code: 'IDENTIFIER_PAIR_INCOMPLETE', source_event_id: sourceEventId, patient_id: patientId });
            }
            if (system !== null && value !== null) {
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
            if (system !== null && value !== null && !model.patients[patientId].identifiers.some(function (identifier) {
                return identifier.identifier_system === system && identifier.identifier_value === value;
            })) {
                var identifier = { identifier_system: system, identifier_value: value };
                model.patients[patientId].identifiers.push(identifier);
                model.identifiers.push({ identifier_system: system, identifier_value: value, patient_id: patientId });
            }
            model.patients[patientId].source_event_ids.push(sourceEventId);
            model.indexes.by_patient_id[patientId].push(sourceEventId);
            if (system !== null && value !== null) addIdentifierIndex(model.indexes.by_identifier, system, value, patientId, sourceEventId);
            model.events.push(eventRecord);
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
            var result = parsePhysicalRows(workbook.Sheets[sheetName], sheetName, dependencies.core, dependencies.xlsx);
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
            file_name: settings.fileName || '',
            imported_at: settings.importedAt || new Date().toISOString(),
            event_schema_version: dependencies.core.EVENT_SCHEMA_VERSION,
            row_schema_version: dependencies.core.ROW_SCHEMA_VERSION,
            sheet_names: (workbook.SheetNames || []).slice(),
            sheets: sheetMetadata
        }, dependencies.core);
    }

    root.FarmaciaBridgeV2Reader = Object.freeze({
        READER_VERSION: READER_VERSION,
        REQUIRED_SHEETS: Object.freeze(REQUIRED_SHEETS.slice()),
        BridgeReaderError: BridgeReaderError,
        inspectWorkbook: inspectWorkbook,
        readWorkbook: readWorkbook
    });
})(typeof window !== 'undefined' ? window : globalThis);
