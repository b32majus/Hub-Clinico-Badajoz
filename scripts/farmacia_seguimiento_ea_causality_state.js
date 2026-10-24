/* Borradores en memoria de causalidad G0 por paciente, visita, episodio, referencia y método. */
(function (root) {
    'use strict';

    var STATUS_NO_EVALUADO = 'no_evaluado';
    var STATUS_BORRADOR = 'borrador_en_edicion';
    var SIN_VISITA = {};

    var editingPatient = null;
    var hasEditingPatient = false;
    var editingVisit = SIN_VISITA;

    var visits = new Map();

    function copyAnswers(answers) {
        var copy = {};
        Object.keys(answers).forEach(function (questionId) {
            copy[questionId] = answers[questionId];
        });
        return copy;
    }

    function visitStore(create) {
        var store = visits.get(editingVisit);
        if (!store && create) {
            store = { marks: new Map(), drafts: new Map(), history: [] };
            visits.set(editingVisit, store);
        }
        return store || null;
    }

    function isMarkedIn(store, episodeId, suspectRef) {
        var suspects = store.marks.get(episodeId);
        return !!(suspects && suspects.has(suspectRef));
    }

    function retireDrafts(store, episodeId, suspectRef) {
        var draftBySuspect = store.drafts.get(episodeId);
        if (!draftBySuspect) return;
        var methodDrafts = draftBySuspect.get(suspectRef);
        if (!methodDrafts) return;
        methodDrafts.forEach(function (answers, method) {
            if (!Object.keys(answers).length) return;
            store.history.push({
                episodeId: episodeId,
                suspectRef: suspectRef,
                method: method,
                answers: copyAnswers(answers)
            });
        });
        draftBySuspect.delete(suspectRef);
        if (!draftBySuspect.size) store.drafts.delete(episodeId);
    }

    function setEditingPatient(patientRef) {
        if (hasEditingPatient && editingPatient === patientRef) return;
        editingPatient = patientRef;
        hasEditingPatient = true;
        visits.clear();
    }

    function setEditingVisit(visitIdentity) {
        editingVisit = visitIdentity === undefined ? SIN_VISITA : visitIdentity;
    }

    function setSuspectMarked(episodeId, suspectRef, marked) {
        var store = visitStore(marked === true);
        if (!store) return false;
        var suspects = store.marks.get(episodeId);
        if (marked === true) {
            if (!suspects) {
                suspects = new Set();
                store.marks.set(episodeId, suspects);
            }
            suspects.add(suspectRef);
            return true;
        }
        if (!suspects || !suspects.has(suspectRef)) return false;
        suspects.delete(suspectRef);
        if (!suspects.size) store.marks.delete(episodeId);
        retireDrafts(store, episodeId, suspectRef);
        return true;
    }

    function isSuspectMarked(episodeId, suspectRef) {
        var store = visitStore(false);
        return !!(store && isMarkedIn(store, episodeId, suspectRef));
    }

    function recordAnswer(episodeId, suspectRef, method, questionId, value) {
        var store = visitStore(false);
        if (!store || !isMarkedIn(store, episodeId, suspectRef)) return false;
        var draftBySuspect = store.drafts.get(episodeId);
        if (!draftBySuspect) {
            draftBySuspect = new Map();
            store.drafts.set(episodeId, draftBySuspect);
        }
        var methodDrafts = draftBySuspect.get(suspectRef);
        if (!methodDrafts) {
            methodDrafts = new Map();
            draftBySuspect.set(suspectRef, methodDrafts);
        }
        var answers = methodDrafts.get(method);
        if (!answers) {
            answers = {};
            methodDrafts.set(method, answers);
        }
        answers[questionId] = value;
        return true;
    }

    function getState(episodeId, suspectRef, method) {
        var store = visitStore(false);
        var noEvaluado = { status: STATUS_NO_EVALUADO, answers: {} };
        if (!store || !isMarkedIn(store, episodeId, suspectRef)) return noEvaluado;
        var draftBySuspect = store.drafts.get(episodeId);
        var methodDrafts = draftBySuspect && draftBySuspect.get(suspectRef);
        var answers = methodDrafts && methodDrafts.get(method);
        if (!answers || !Object.keys(answers).length) return noEvaluado;
        return { status: STATUS_BORRADOR, answers: copyAnswers(answers) };
    }

    function getInactiveHistory() {
        var store = visitStore(false);
        if (!store) return [];
        return store.history.map(function (entry) {
            return {
                episodeId: entry.episodeId,
                suspectRef: entry.suspectRef,
                method: entry.method,
                answers: copyAnswers(entry.answers)
            };
        });
    }

    root.FarmaciaSeguimientoEaCausalityState = {
        setEditingPatient: setEditingPatient,
        setEditingVisit: setEditingVisit,
        setSuspectMarked: setSuspectMarked,
        isSuspectMarked: isSuspectMarked,
        recordAnswer: recordAnswer,
        getState: getState,
        getInactiveHistory: getInactiveHistory
    };
})(typeof window !== 'undefined' ? window : globalThis);
