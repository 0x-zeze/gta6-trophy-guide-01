// Leonida Trophy Guide: renders the 55 trophies, the roadmap, the checklist
// tracker and the spoiler setting. All data comes from local JSON files;
// the page makes no network request at run time.
(function () {
  'use strict';

  var STORAGE_KEY = 'gta6-trophy-guide-01-v1';
  var trophies = [];
  var roadmap = null;
  var state = loadState();
  var activeFilter = 'all';
  var searchText = '';

  var listEl = document.getElementById('trophyList');
  var emptyEl = document.getElementById('emptyNote');
  var onlineEl = document.getElementById('onlineNote');
  var searchEl = document.getElementById('searchInput');
  var spoilerEl = document.getElementById('spoilerToggle');
  var hideEarnedEl = document.getElementById('hideEarnedToggle');
  var ioNoteEl = document.getElementById('ioNote');

  function loadState() {
    var fallback = { earned: {}, spoiler: false, hideEarned: false };
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return fallback;
      var parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        if (parsed.earned && typeof parsed.earned === 'object') fallback.earned = parsed.earned;
        if (typeof parsed.spoiler === 'boolean') fallback.spoiler = parsed.spoiler;
        if (typeof parsed.hideEarned === 'boolean') fallback.hideEarned = parsed.hideEarned;
      }
    } catch (err) { /* corrupted storage: start fresh */ }
    return fallback;
  }

  function saveState() {
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (err) { /* storage full or blocked */ }
  }

  function gradeLabel(grade) {
    return grade.charAt(0).toUpperCase() + grade.slice(1);
  }

  function kindLabel(kind) {
    var labels = { story: 'Story', collectibles: 'Collectibles', activities: 'Activities', world: 'World & crime', platinum: 'Platinum' };
    return labels[kind] || kind;
  }

  function sourceLink(source) {
    var a = document.createElement('a');
    a.textContent = source.label;
    a.href = '//' + source.url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    return a;
  }

  function renderRoadmap() {
    if (!roadmap) return;
    document.getElementById('roadmapIntro').textContent = roadmap.intro;
    var factsEl = document.getElementById('roadmapFacts');
    factsEl.textContent = '';
    roadmap.facts.forEach(function (fact) {
      var wrap = document.createElement('div');
      var dt = document.createElement('dt');
      dt.textContent = fact.label;
      var dd = document.createElement('dd');
      dd.textContent = fact.value;
      wrap.appendChild(dt);
      wrap.appendChild(dd);
      factsEl.appendChild(wrap);
    });
    var stagesEl = document.getElementById('roadmapStages');
    stagesEl.textContent = '';
    roadmap.stages.forEach(function (stage) {
      var card = document.createElement('article');
      card.className = 'stage';
      var h3 = document.createElement('h3');
      h3.textContent = stage.title;
      var time = document.createElement('p');
      time.className = 'time';
      time.textContent = stage.time;
      var goal = document.createElement('p');
      goal.textContent = stage.goal;
      var ul = document.createElement('ul');
      stage.notes.forEach(function (note) {
        var li = document.createElement('li');
        li.textContent = note;
        ul.appendChild(li);
      });
      var covers = document.createElement('p');
      covers.className = 'covers';
      covers.textContent = 'Covers: ' + stage.trophies;
      card.appendChild(h3);
      card.appendChild(time);
      card.appendChild(goal);
      card.appendChild(ul);
      card.appendChild(covers);
      stagesEl.appendChild(card);
    });
    var callout = document.getElementById('missableCallout');
    callout.textContent = '';
    var h3 = document.createElement('h3');
    h3.textContent = 'Missable trophy — read this first';
    var p1 = document.createElement('p');
    p1.textContent = roadmap.missable.trophy;
    var p2 = document.createElement('p');
    p2.textContent = roadmap.missable.note;
    callout.appendChild(h3);
    callout.appendChild(p1);
    callout.appendChild(p2);
    var srcEl = document.getElementById('roadmapSources');
    srcEl.textContent = '';
    roadmap.sources.forEach(function (source, i) {
      if (i > 0) srcEl.appendChild(document.createTextNode(' · '));
      srcEl.appendChild(sourceLink(source));
    });
  }

  function trophyVisible(t) {
    if (activeFilter === 'missable') {
      if (!t.missable) return false;
    } else if (activeFilter === 'online') {
      return false;
    } else if (activeFilter !== 'all') {
      if (t.kind !== activeFilter) return false;
    }
    if (state.hideEarned && state.earned[t.id]) return false;
    if (searchText) {
      var hay = (t.name + ' ' + t.description + ' ' + t.guide).toLowerCase();
      if (hay.indexOf(searchText) === -1) return false;
    }
    return true;
  }

  function renderProgress() {
    var earnedCount = trophies.filter(function (t) { return state.earned[t.id]; }).length;
    var total = trophies.length;
    var pct = total ? Math.round((earnedCount / total) * 100) : 0;
    document.getElementById('progressCount').textContent = earnedCount + ' / ' + total + ' earned';
    document.getElementById('progressPct').textContent = pct + '%';
    document.getElementById('progressFill').style.width = pct + '%';
    var byGrade = {};
    trophies.forEach(function (t) {
      if (!byGrade[t.grade]) byGrade[t.grade] = [0, 0];
      byGrade[t.grade][1] += 1;
      if (state.earned[t.id]) byGrade[t.grade][0] += 1;
    });
    var parts = ['platinum', 'gold', 'silver', 'bronze'].filter(function (g) { return byGrade[g]; }).map(function (g) {
      return gradeLabel(g) + ' ' + byGrade[g][0] + '/' + byGrade[g][1];
    });
    document.getElementById('progressGrades').textContent = parts.join(' · ');
  }

  function renderList() {
    listEl.textContent = '';
    var shown = 0;
    trophies.forEach(function (t) {
      if (!trophyVisible(t)) return;
      shown += 1;
      var earned = !!state.earned[t.id];
      var li = document.createElement('li');
      li.className = 'trophy' + (earned ? ' earned' : '');
      li.dataset.trophyId = String(t.id);

      var box = document.createElement('input');
      box.type = 'checkbox';
      box.checked = earned;
      box.setAttribute('aria-label', 'Mark ' + t.name + ' as earned');
      box.addEventListener('change', function () {
        if (box.checked) state.earned[t.id] = true;
        else delete state.earned[t.id];
        saveState();
        ioNoteEl.textContent = 'Progress is saved in this browser (localStorage). Export downloads a file you can import back on any device.';
        renderProgress();
        renderList();
      });
      li.appendChild(box);

      var body = document.createElement('div');
      var name = document.createElement('h3');
      name.className = 'trophyName';
      var spoilerHidden = state.spoiler && t.kind === 'story' && !earned;
      if (spoilerHidden) {
        var mask = document.createElement('span');
        mask.className = 'spoilerMask';
        mask.textContent = 'Hidden story trophy — earn it to reveal';
        name.appendChild(mask);
      } else {
        name.appendChild(document.createTextNode(t.name));
      }
      var grade = document.createElement('span');
      grade.className = 'grade grade-' + t.grade;
      grade.textContent = gradeLabel(t.grade);
      name.appendChild(grade);
      if (t.hidden) {
        var hiddenBadge = document.createElement('span');
        hiddenBadge.className = 'badge badge-hidden';
        hiddenBadge.textContent = 'Hidden';
        name.appendChild(hiddenBadge);
      }
      if (t.missable) {
        var missBadge = document.createElement('span');
        missBadge.className = 'badge badge-missable';
        missBadge.textContent = 'Missable';
        name.appendChild(missBadge);
      }
      if (t.count) {
        var countBadge = document.createElement('span');
        countBadge.className = 'badge badge-count';
        countBadge.textContent = 'x' + t.count.toLocaleString('en-US');
        name.appendChild(countBadge);
      }
      body.appendChild(name);

      var desc = document.createElement('p');
      desc.className = 'trophyDesc';
      desc.textContent = spoilerHidden ? 'Description hidden until earned.' : t.description;
      body.appendChild(desc);

      var meta = document.createElement('p');
      meta.className = 'trophyMeta';
      meta.textContent = kindLabel(t.kind) + (t.chapter ? ' · ' + t.chapter : '') + (t.missable && t.missableNote ? ' · ' + t.missableNote : '');
      body.appendChild(meta);

      var toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'guideToggle';
      toggle.textContent = 'Show guide';
      var guideBox = document.createElement('div');
      guideBox.className = 'guide';
      guideBox.hidden = true;
      var guideTitle = document.createElement('h4');
      guideTitle.textContent = 'How to unlock it';
      var guideText = document.createElement('p');
      guideText.textContent = t.guide;
      var srcLine = document.createElement('p');
      srcLine.className = 'guideSources';
      srcLine.appendChild(document.createTextNode('Sources: '));
      (t.sources || []).forEach(function (source, i) {
        if (i > 0) srcLine.appendChild(document.createTextNode(' · '));
        srcLine.appendChild(sourceLink(source));
      });
      guideBox.appendChild(guideTitle);
      guideBox.appendChild(guideText);
      guideBox.appendChild(srcLine);
      toggle.addEventListener('click', function () {
        guideBox.hidden = !guideBox.hidden;
        toggle.textContent = guideBox.hidden ? 'Show guide' : 'Hide guide';
      });
      body.appendChild(toggle);
      body.appendChild(guideBox);
      li.appendChild(body);
      listEl.appendChild(li);
    });
    emptyEl.hidden = shown > 0;
    onlineEl.hidden = activeFilter !== 'online';
    renderProgress();
  }

  function exportProgress() {
    var payload = {
      app: 'gta6-trophy-guide-01',
      exportedAt: new Date().toISOString(),
      earned: Object.keys(state.earned).map(Number).sort(function (a, b) { return a - b; }),
      spoiler: state.spoiler,
      hideEarned: state.hideEarned
    };
    var blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'gta6-trophy-progress.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    ioNoteEl.textContent = 'Exported ' + payload.earned.length + ' earned trophies to gta6-trophy-progress.json.';
  }

  function importProgress(file) {
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var data = JSON.parse(String(reader.result));
        var ids = Array.isArray(data) ? data : data.earned;
        if (!Array.isArray(ids)) throw new Error('bad file');
        var next = {};
        ids.forEach(function (id) {
          var n = Number(id);
          if (trophies.some(function (t) { return t.id === n; })) next[n] = true;
        });
        state.earned = next;
        if (typeof data.spoiler === 'boolean') state.spoiler = data.spoiler;
        if (typeof data.hideEarned === 'boolean') state.hideEarned = data.hideEarned;
        spoilerEl.checked = state.spoiler;
        hideEarnedEl.checked = state.hideEarned;
        saveState();
        renderList();
        ioNoteEl.textContent = 'Imported ' + Object.keys(next).length + ' earned trophies from ' + file.name + '.';
      } catch (err) {
        ioNoteEl.textContent = 'Import failed: that file is not a progress export from this guide.';
      }
    };
    reader.readAsText(file);
  }

  document.getElementById('filterButtons').addEventListener('click', function (event) {
    var btn = event.target.closest('button[data-filter]');
    if (!btn) return;
    activeFilter = btn.dataset.filter;
    var buttons = document.querySelectorAll('#filterButtons button');
    buttons.forEach(function (b) { b.classList.toggle('active', b === btn); });
    renderList();
  });

  searchEl.addEventListener('input', function () {
    searchText = searchEl.value.trim().toLowerCase();
    renderList();
  });

  spoilerEl.checked = state.spoiler;
  spoilerEl.addEventListener('change', function () {
    state.spoiler = spoilerEl.checked;
    saveState();
    renderList();
  });

  hideEarnedEl.checked = state.hideEarned;
  hideEarnedEl.addEventListener('change', function () {
    state.hideEarned = hideEarnedEl.checked;
    saveState();
    renderList();
  });

  document.getElementById('exportBtn').addEventListener('click', exportProgress);
  document.getElementById('importBtn').addEventListener('click', function () {
    document.getElementById('importFile').click();
  });
  document.getElementById('importFile').addEventListener('change', function (event) {
    var file = event.target.files && event.target.files[0];
    if (file) importProgress(file);
    event.target.value = '';
  });
  document.getElementById('resetBtn').addEventListener('click', function () {
    state.earned = {};
    saveState();
    renderList();
    ioNoteEl.textContent = 'Tracker reset: no trophies earned.';
  });

  Promise.all([
    fetch('data/trophies.json').then(function (r) { return r.json(); }),
    fetch('data/roadmap.json').then(function (r) { return r.json(); })
  ]).then(function (results) {
    trophies = results[0].trophies;
    roadmap = results[1];
    renderRoadmap();
    renderList();
  }).catch(function () {
    listEl.textContent = '';
    emptyEl.hidden = false;
    emptyEl.textContent = 'Could not load the trophy data. Serve this folder with a static server (for example, node serve.ts) and reload.';
  });
})();
