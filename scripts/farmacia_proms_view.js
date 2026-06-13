'use strict';

(function () {
    var SCORE_INTERPRETATIONS = {
        IHS4: function (v) { return v <= 10 ? 'Leve' : v <= 25 ? 'Moderado' : 'Grave'; },
        DLQI: function (v) { return v <= 1 ? 'Sin efecto' : v <= 5 ? 'Leve' : v <= 10 ? 'Moderado' : v <= 20 ? 'Muy grave' : 'Extremadamente grave'; },
        DAS28: function (v) { return v <= 2.6 ? 'Remisi\u00f3n' : v <= 3.2 ? 'Baja' : v <= 5.1 ? 'Moderada' : 'Alta'; },
        HAQ: function (v) { return v <= 1 ? 'Leve' : v <= 2 ? 'Moderado' : 'Grave'; }
    };

    function knownScoreInterpretation(name, val) {
        var num = parseFloat(val);
        if (isNaN(num)) return '';
        var fn = SCORE_INTERPRETATIONS[name];
        return fn ? fn(num) : '';
    }

    function parseScores(str) {
        var out = [];
        if (!str || str === '\u2014') return out;
        var known = ['IHS4', 'DLQI', 'DAS28', 'HAQ'];
        for (var ki = 0; ki < known.length; ki++) {
            var name = known[ki];
            var escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            var re = new RegExp(escaped + '\\s*(?:demo)?:?\\s*(\\d+(?:\\.\\d+)?)(?:\\s*\u2192\\s*(\\d+(?:\\.\\d+)?))?', 'i');
            var m = str.match(re);
            if (m) {
                var val = m[2] || m[1];
                var interp = knownScoreInterpretation(name, val);
                out.push({ name: name, value: val, interpretation: interp });
            }
        }
        return out;
    }

    function parseAdherencia(str) {
        if (!str || str === '\u2014') return { value: '\u2014', interpretation: 'Sin registro' };
        var morisky = str.match(/Morisky[^:]*:\s*(\d+\/\d+)/i);
        if (morisky) return { value: morisky[1], interpretation: 'Alta' };
        if (/alta/i.test(str)) return { value: str, interpretation: 'Alta' };
        if (/media/i.test(str)) return { value: str, interpretation: 'Media' };
        if (/baja/i.test(str)) return { value: str, interpretation: 'Baja' };
        if (/sin registro/i.test(str)) return { value: '\u2014', interpretation: 'Sin registro' };
        return { value: str, interpretation: '' };
    }

    function parseProms(str) {
        var out = [];
        if (!str || str === '\u2014') return out;
        if (/basal pendiente/i.test(str) || /sin registro/i.test(str)) {
            out.push({ name: 'PROMs demo / \u00faltimo valor', value: 'Basal pendiente', interpretation: 'No disponible' });
            return out;
        }
        var dlqi = str.match(/DLQI\s*(\d+)/i);
        if (dlqi) {
            out.push({ name: 'DLQI demo / \u00faltimo valor', value: dlqi[1], interpretation: knownScoreInterpretation('DLQI', dlqi[1]) });
        }
        var eva = str.match(/EVA\s*(picor|dolor)?\s*(\d+)\/10/i);
        if (eva) {
            var evaVal = parseInt(eva[2]);
            var evaName = 'EVA' + (eva[1] ? ' ' + eva[1] : '');
            var evaInterp = isNaN(evaVal) ? '' : evaVal <= 3 ? 'Leve' : evaVal <= 6 ? 'Moderado' : 'Grave';
            out.push({ name: evaName, value: eva[2] + '/10', interpretation: evaInterp });
        }
        var haq = str.match(/HAQ\s*(\d+(?:\.\d+)?)/i);
        if (haq) {
            out.push({ name: 'HAQ', value: haq[1], interpretation: knownScoreInterpretation('HAQ', haq[1]) });
        }
        return out;
    }

    function createScoreChip(score) {
        var chip = document.createElement('div');
        chip.className = 'fh-qv-score-chip';
        var nameEl = document.createElement('span');
        nameEl.className = 'fh-qv-score-chip__name';
        nameEl.textContent = score.name;
        var valueEl = document.createElement('span');
        valueEl.className = 'fh-qv-score-chip__value';
        valueEl.textContent = score.value;
        chip.append(nameEl, valueEl);
        if (score.interpretation) {
            var interpEl = document.createElement('span');
            interpEl.className = 'fh-qv-score-chip__interp';
            interpEl.textContent = score.interpretation;
            chip.appendChild(interpEl);
        }
        return chip;
    }

    function createAdherenciaChip(adh) {
        var chip = document.createElement('div');
        chip.className = 'fh-qv-score-chip';
        var nameEl = document.createElement('span');
        nameEl.className = 'fh-qv-score-chip__name';
        nameEl.textContent = 'Adherencia';
        var valueEl = document.createElement('span');
        valueEl.className = 'fh-qv-score-chip__value';
        valueEl.textContent = adh.value;
        chip.append(nameEl, valueEl);
        if (adh.interpretation) {
            var interpEl = document.createElement('span');
            interpEl.className = 'fh-qv-score-chip__interp';
            interpEl.textContent = adh.interpretation;
            chip.appendChild(interpEl);
        }
        return chip;
    }

    function createPromCard(prom) {
        var card = document.createElement('div');
        card.className = 'fh-qv-score-chip';
        var nameEl = document.createElement('span');
        nameEl.className = 'fh-qv-score-chip__name';
        nameEl.textContent = prom.name;
        var valueEl = document.createElement('span');
        valueEl.className = 'fh-qv-score-chip__value';
        valueEl.textContent = prom.value;
        card.append(nameEl, valueEl);
        if (prom.interpretation) {
            var interpEl = document.createElement('span');
            interpEl.className = 'fh-qv-score-chip__interp';
            interpEl.textContent = prom.interpretation;
            card.appendChild(interpEl);
        }
        return card;
    }

    window.FarmaciaPromsView = {
        knownScoreInterpretation: knownScoreInterpretation,
        parseScores: parseScores,
        parseAdherencia: parseAdherencia,
        parseProms: parseProms,
        createScoreChip: createScoreChip,
        createAdherenciaChip: createAdherenciaChip,
        createPromCard: createPromCard
    };
})();
