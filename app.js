/* ═══════════════════════════════════════════
   HOLY NOTES — app.js v3
   Novedades: auto-guardado · pin · eliminar ·
   búsqueda dual · FAB · orden por recientes ·
   notas colapsables en sidebar · PDF export
════════════════════════════════════════════ */


/* ─────────────────────────────────
   1. ESTADO GLOBAL
───────────────────────────────── */
var currentNoteId    = null;
var currentTags      = [];
var currentFolder    = null;
var folderListOpen   = false;
var sidebarNotesOpen = true;   // las notas recientes comienzan expandidas
var sidebarVisible   = true;
var savedRange       = null;
var activeNoteId     = null;
var autoSaveTimer    = null;   // timer para auto-guardado
var isEditing        = false;  // controla si el FAB está oculto


/* ─────────────────────────────────
   2. API BÍBLICA — bolls.life
───────────────────────────────── */
var BIBLE_VERSION_CODES = {
  "RVR60":"RV1960","RV1960":"RV1960",
  "NVI":"NVI","NTV":"NTV","LBLA":"LBLA","PDT":"PDT"
};
var BOOK_NUMBERS = {
  "génesis":1,"genesis":1,"éxodo":2,"exodo":2,"levítico":3,"levitico":3,
  "números":4,"numeros":4,"deuteronomio":5,"josué":6,"josue":6,"jueces":7,
  "rut":8,"1 samuel":9,"2 samuel":10,"1 reyes":11,"2 reyes":12,
  "1 crónicas":13,"2 crónicas":14,"esdras":15,"nehemías":16,"nehemias":16,
  "ester":17,"job":18,"salmos":19,"salmo":19,"proverbios":20,
  "eclesiastés":21,"eclesiastes":21,"cantares":22,"isaías":23,"isaias":23,
  "jeremías":24,"jeremias":24,"lamentaciones":25,"ezequiel":26,"daniel":27,
  "oseas":28,"joel":29,"amós":30,"amos":30,"abdías":31,"abdias":31,
  "jonás":32,"jonas":32,"miqueas":33,"nahúm":34,"nahum":34,"habacuc":35,
  "sofonías":36,"sofonias":36,"hageo":37,"zacarías":38,"zacarias":38,
  "malaquías":39,"malaquias":39,"mateo":40,"marcos":41,"lucas":42,"juan":43,
  "hechos":44,"romanos":45,"1 corintios":46,"2 corintios":47,
  "gálatas":48,"galatas":48,"efesios":49,"filipenses":50,"colosenses":51,
  "1 tesalonicenses":52,"2 tesalonicenses":53,"1 timoteo":54,"2 timoteo":55,
  "tito":56,"filemón":57,"filemon":57,"hebreos":58,"santiago":59,
  "1 pedro":60,"2 pedro":61,"1 juan":62,"2 juan":63,"3 juan":64,
  "judas":65,"apocalipsis":66
};
var CHAPTER_COUNTS = {
  "Génesis":50,"Éxodo":40,"Levítico":27,"Números":36,"Deuteronomio":34,
  "Josué":24,"Jueces":21,"Rut":4,"1 Samuel":31,"2 Samuel":24,
  "1 Reyes":22,"2 Reyes":25,"1 Crónicas":29,"2 Crónicas":36,"Esdras":10,
  "Nehemías":13,"Ester":10,"Job":42,"Salmos":150,"Proverbios":31,
  "Eclesiastés":12,"Cantares":8,"Isaías":66,"Jeremías":52,"Lamentaciones":5,
  "Ezequiel":48,"Daniel":12,"Oseas":14,"Joel":3,"Amós":9,"Abdías":1,
  "Jonás":4,"Miqueas":7,"Nahúm":3,"Habacuc":3,"Sofonías":3,"Hageo":2,
  "Zacarías":14,"Malaquías":4,"Mateo":28,"Marcos":16,"Lucas":24,"Juan":21,
  "Hechos":28,"Romanos":16,"1 Corintios":16,"2 Corintios":13,"Gálatas":6,
  "Efesios":6,"Filipenses":4,"Colosenses":4,"1 Tesalonicenses":5,
  "2 Tesalonicenses":3,"1 Timoteo":6,"2 Timoteo":4,"Tito":3,"Filemón":1,
  "Hebreos":13,"Santiago":5,"1 Pedro":5,"2 Pedro":3,"1 Juan":5,
  "2 Juan":1,"3 Juan":1,"Judas":1,"Apocalipsis":22
};
var KNOWN_VERSIONS = ['RVR60','RV1960','NVI','NTV','LBLA','PDT'];

function stripHtml(html) {
  var d = document.createElement('div'); d.innerHTML = html;
  return d.textContent || d.innerText || '';
}
function fetchChapter(bookName, chapter, version) {
  var vc = BIBLE_VERSION_CODES[version.toUpperCase()];
  var bn = BOOK_NUMBERS[normalizeStr(bookName)];
  if (!vc || !bn) return Promise.resolve(null);
  return fetch('https://bolls.life/get-text/' + vc + '/' + bn + '/' + chapter + '/')
    .then(function(r) {
      if (!r.ok) return null;
      return r.json().then(function(data) {
        if (!data || !Array.isArray(data) || !data.length) return null;
        return data.map(function(v) { return { v: v.verse, t: stripHtml(v.text).trim() }; });
      });
    }).catch(function() { return null; });
}
function fetchVerse(bookName, chapter, verseNum, version) {
  return fetchChapter(bookName, chapter, version).then(function(verses) {
    if (!verses) return { error: 'No se pudo cargar ' + bookName + ' ' + chapter + ' (' + version + ').' };
    for (var i = 0; i < verses.length; i++) if (verses[i].v === verseNum) return { reference: bookName + ' ' + chapter + ':' + verseNum + ' — ' + version.toUpperCase(), text: verses[i].t };
    return { error: bookName + ' ' + chapter + ':' + verseNum + ' no encontrado.' };
  });
}


/* ─────────────────────────────────
   3. 66 LIBROS
───────────────────────────────── */
var ALL_BOOKS = [
  "Génesis","Éxodo","Levítico","Números","Deuteronomio","Josué","Jueces",
  "Rut","1 Samuel","2 Samuel","1 Reyes","2 Reyes","1 Crónicas","2 Crónicas",
  "Esdras","Nehemías","Ester","Job","Salmos","Proverbios","Eclesiastés",
  "Cantares","Isaías","Jeremías","Lamentaciones","Ezequiel","Daniel",
  "Oseas","Joel","Amós","Abdías","Jonás","Miqueas","Nahúm","Habacuc",
  "Sofonías","Hageo","Zacarías","Malaquías","Mateo","Marcos","Lucas",
  "Juan","Hechos","Romanos","1 Corintios","2 Corintios","Gálatas",
  "Efesios","Filipenses","Colosenses","1 Tesalonicenses","2 Tesalonicenses",
  "1 Timoteo","2 Timoteo","Tito","Filemón","Hebreos","Santiago",
  "1 Pedro","2 Pedro","1 Juan","2 Juan","3 Juan","Judas","Apocalipsis"
];


/* ─────────────────────────────────
   4. UTILIDADES
───────────────────────────────── */
function normalizeStr(s) {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
}
function escapeHtml(s) { return s.replace(/'/g,"\\'"); }

/**
 * Ordena notas: primero las ancladas (pin), luego por updatedAt desc.
 */
function sortNotes(notes) {
  return notes.slice().sort(function(a, b) {
    // Ancladas primero
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    // Luego por fecha de última edición descendente
    var ta = a.updatedAt || a.createdAt || '';
    var tb = b.updatedAt || b.createdAt || '';
    return tb.localeCompare(ta);
  });
}


/* ─────────────────────────────────
   5. TEMA
───────────────────────────────── */
function toggleTheme() {
  var html = document.documentElement;
  var dark = html.getAttribute('data-theme') === 'dark';
  html.setAttribute('data-theme', dark ? 'light' : 'dark');
  localStorage.setItem('hn_theme', dark ? 'light' : 'dark');
  document.getElementById('theme-btn').textContent = dark ? '🌙' : '☀️';
}


/* ─────────────────────────────────
   6. PESTAÑAS
───────────────────────────────── */
function showTab(name) {
  document.querySelectorAll('.tab-section').forEach(function(s) { s.style.display = 'none'; });
  document.querySelectorAll('.tab-btn').forEach(function(b) { b.classList.remove('active'); });
  var el = document.getElementById('tab-' + name);
  el.style.display = name === 'notas' ? 'flex' : 'block';
  document.getElementById('btn-' + name).classList.add('active');
}
function goHome() { showTab('notas'); closeEditor(); }


/* ─────────────────────────────────
   7. SIDEBAR
───────────────────────────────── */
function toggleSidebar() {
  sidebarVisible = !sidebarVisible;
  var sb = document.getElementById('main-sidebar');
  if (sb) {
    if (sidebarVisible) sb.classList.remove('collapsed');
    else sb.classList.add('collapsed');
  }
  localStorage.setItem('hn_sidebar_visible', sidebarVisible ? '1' : '0');
}

/** Muestra/oculta el FAB según si estamos editando */
function updateFAB() {
  var fab = document.getElementById('fab-new-note');
  if (!fab) return;
  if (isEditing) fab.classList.add('hidden');
  else fab.classList.remove('hidden');
}


/* ─────────────────────────────────
   8. CARPETAS
───────────────────────────────── */
function loadFolders() {
  try {
    var raw = JSON.parse(localStorage.getItem('hn_folders')) || [];
    return raw.map(function(f) {
      if (typeof f === 'string') return { name: f, icon: '📁', color: '#F59E0B' };
      return f;
    });
  } catch(e) { return []; }
}
function saveFolders(f) { localStorage.setItem('hn_folders', JSON.stringify(f)); }
function getFolderNames() { return loadFolders().map(function(f) { return f.name; }); }
function findFolder(name) {
  var folders = loadFolders();
  for (var i = 0; i < folders.length; i++) if (folders[i].name === name) return folders[i];
  return null;
}


function toggleFolderList() {
  folderListOpen = !folderListOpen;
  var c = document.getElementById('folder-list-container');
  var a = document.getElementById('folder-arrow');
  c.style.maxHeight = folderListOpen ? '600px' : '0';
  a.textContent = folderListOpen ? '▲' : '▼';
  localStorage.setItem('hn_folders_open', folderListOpen ? '1' : '0');
}

function toggleNewFolderInput() {
  var area = document.getElementById('new-folder-area');
  var hidden = !area.style.display || area.style.display === 'none';
  area.style.display = hidden ? 'block' : 'none';
  if (hidden) setTimeout(function() { document.getElementById('new-folder-input').focus(); }, 50);
}

function createFolder() {
  var input = document.getElementById('new-folder-input');
  var name  = input.value.trim();
  if (!name) { alert('Escribí un nombre para la carpeta.'); return; }
  var folders = loadFolders();
  var names   = folders.map(function(f) { return typeof f === 'string' ? f : f.name; });
  if (names.indexOf(name) !== -1) { alert('Ya existe una carpeta con ese nombre.'); return; }
  var iconInput2 = document.getElementById('new-folder-icon');
  var colorBtn   = document.querySelector('#new-folder-colors .nf-color-btn.selected');
  var icon       = (iconInput2 && iconInput2.value.trim()) ? iconInput2.value.trim() : '📁';
  var color      = colorBtn ? colorBtn.getAttribute('data-color') : '#F59E0B';
  folders.push({ name: name, icon: icon, color: color });
  saveFolders(folders);
  input.value = '';
  document.getElementById('new-folder-area').style.display = 'none';
  renderFolderList(); renderSidebarNotes(); populateFolderDropdown('');
}

function selectNewFolderIcon(btn) {
  document.querySelectorAll('#new-folder-icons .nf-icon-btn').forEach(function(b) { b.classList.remove('selected'); });
  btn.classList.add('selected');
}
function selectNewFolderColor(btn) {
  document.querySelectorAll('#new-folder-colors .nf-color-btn').forEach(function(b) {
    b.style.borderColor = 'transparent'; b.style.boxShadow = 'none'; b.classList.remove('selected');
  });
  btn.classList.add('selected');
  btn.style.borderColor = '#fff';
  btn.style.boxShadow   = '0 0 0 2px ' + btn.getAttribute('data-color');
}

function renderFolderList() {
  var folders = loadFolders(); var notes = loadNotes();
  var cont = document.getElementById('folder-list');
  if (!cont) return;
  cont.innerHTML = '';

  // ── Fila fija "Todas las notas" (siempre arriba, no se puede borrar) ──
  var allCount = notes.length;
  var allRow = document.createElement('div');
  allRow.className = 'folder-row' + (currentFolder === null ? ' active' : '');
  allRow.style.cssText = 'border-bottom:1px solid var(--border);margin-bottom:4px;padding-bottom:6px;';
  allRow.innerHTML =
    '<span class="folder-icon-badge" style="color:var(--accent);">📋</span>' +
    '<span class="folder-name" onclick="showAllNotes()" style="font-weight:600;">' +
      'Todas las notas' +
      ' <span style="color:var(--text3);font-size:10px;">(' + allCount + ')</span>' +
    '</span>';
  cont.appendChild(allRow);

  if (!folders.length) {
    var empty = document.createElement('p');
    empty.style.cssText = 'color:var(--text3);font-size:11px;padding:4px 6px;';
    empty.textContent = 'Sin carpetas aún';
    cont.appendChild(empty);
    return;
  }
  for (var i = 0; i < folders.length; i++) {
    var fd    = folders[i];
    var fname = fd.name; var ficon = fd.icon || '📁'; var fcolor = fd.color || '#F59E0B';
    var count = 0;
    for (var j = 0; j < notes.length; j++) if (notes[j].folder === fname) count++;
    var row = document.createElement('div');
    row.className = 'folder-row' + (currentFolder === fname ? ' active' : '');
    row.innerHTML =
      '<span class="folder-icon-badge" style="color:' + fcolor + ';">' + ficon + '</span>' +
      '<span class="folder-name" onclick="filterByFolder(\'' + escapeHtml(fname) + '\')" title="' + escapeHtml(fname) + '">' +
        escapeHtml(fname) + ' <span style="color:var(--text3);font-size:10px;">(' + count + ')</span>' +
      '</span>' +
      '<button class="folder-action-btn" onclick="editFolderMeta(\'' + escapeHtml(fname) + '\')" title="Editar">✏️</button>' +
      '<button class="folder-action-btn" onclick="deleteFolder(\'' + escapeHtml(fname) + '\')" title="Eliminar" style="color:#EF4444;">🗑️</button>';
    cont.appendChild(row);
  }
}


function filterByFolder(name) {
  currentFolder = name;
  var fd = findFolder(name);
  var icon = fd ? (fd.icon || '📁') : '📁';
  document.getElementById('notes-view-title').textContent = name;
  document.getElementById('sidebar-notes-label').textContent = icon + ' ' + name;
  renderNotesList(name); renderSidebarNotes(name); renderFolderList();
}


function showAllNotes() {
  currentFolder = null;
  document.getElementById('notes-view-title').textContent = 'Todas las notas';
  document.getElementById('sidebar-notes-label').textContent = '📋 Notas recientes';
  renderNotesList(null); renderSidebarNotes(null); renderFolderList();
}

function renameFolder(oldName) {
  var newName = prompt('Nuevo nombre para "' + oldName + '":', oldName);
  if (!newName || newName.trim() === '' || newName === oldName) return;
  newName = newName.trim();
  var folders = loadFolders();
  for (var i = 0; i < folders.length; i++) {
    if (folders[i].name === oldName) { folders[i].name = newName; break; }
  }
  saveFolders(folders);
  var notes = loadNotes();
  for (var i = 0; i < notes.length; i++) if (notes[i].folder === oldName) notes[i].folder = newName;
  localStorage.setItem('hn_notes', JSON.stringify(notes));
  if (currentFolder === oldName) currentFolder = newName;
  renderFolderList(); renderSidebarNotes(); populateFolderDropdown('');
}


function deleteFolder(name) {
  if (!confirm('¿Eliminar la carpeta "' + name + '"?\nLas notas quedarán sin carpeta.')) return;
  saveFolders(loadFolders().filter(function(f) { return (f.name || f) !== name; }));
  var notes = loadNotes();
  for (var i = 0; i < notes.length; i++) if (notes[i].folder === name) notes[i].folder = '';
  localStorage.setItem('hn_notes', JSON.stringify(notes));
  renderFolderList(); renderSidebarNotes(); populateFolderDropdown(''); renderNotesList(null);
}


function populateFolderDropdown(selected) {
  var sel = document.getElementById('note-folder'); if (!sel) return;
  sel.innerHTML = '<option value="">Sin carpeta</option>';
  loadFolders().forEach(function(fd) {
    var o = document.createElement('option');
    o.value = fd.name; o.textContent = (fd.icon || '📁') + ' ' + fd.name;
    if (fd.name === selected) o.selected = true;
    sel.appendChild(o);
  });
}


/* ─────────────────────────────────
   9. NOTAS — carga y renderizado
───────────────────────────────── */
function loadNotes() {
  try { return JSON.parse(localStorage.getItem('hn_notes')) || []; }
  catch(e) { return []; }
}

/**
 * Renderiza la lista de notas en el SIDEBAR estilo Apple Notes.
 * Orden: ancladas primero, luego más recientes arriba.
 */
function renderSidebarNotes(filterFolder) {
  var notes = loadNotes();
  var cont  = document.getElementById('sidebar-notes-list'); if (!cont) return;
  var filtered = filterFolder != null
    ? notes.filter(function(n) { return n.folder === filterFolder; })
    : notes;
  var sorted = sortNotes(filtered);

  // Actualizar contador
  var countEl = document.getElementById('sidebar-notes-count');
  if (countEl) countEl.textContent = sorted.length || '';

  if (!sorted.length) {
    cont.innerHTML = '<p style="color:var(--text3);font-size:11px;padding:8px 6px;text-align:center;">Sin notas</p>';
    return;
  }
  cont.innerHTML = '';
  sorted.slice(0, 30).forEach(function(note) {
    var item = document.createElement('div');
    item.className = 'sidebar-note-item' +
      (note.id === activeNoteId ? ' active' : '') +
      (note.pinned ? ' pinned' : '');
    var preview = stripHtml(note.content || '').trim().slice(0, 55);
    var meta    = [note.date, note.speaker].filter(Boolean).join(' · ');
    item.innerHTML =
      (note.pinned ? '<span class="pin-badge">📌</span>' : '') +
      '<div class="sidebar-note-title">' + (note.title || 'Sin título') + '</div>' +
      (meta    ? '<div class="sidebar-note-meta">' + meta + '</div>'       : '') +
      (preview ? '<div class="sidebar-note-preview">' + preview + '…</div>' : '');
    item.onclick = (function(id) { return function() { openEditor(id); }; })(note.id);
    cont.appendChild(item);
  });
}

/**
 * Renderiza las tarjetas en el ÁREA PRINCIPAL.
 * Orden: ancladas primero, luego más recientes arriba.
 */
function renderNotesList(filterFolder) {
  var notes = loadNotes(); var cont = document.getElementById('notes-cards-container'); if (!cont) return;
  var filtered = filterFolder != null
    ? notes.filter(function(n) { return n.folder === filterFolder; })
    : notes;
  var sorted = sortNotes(filtered);
  if (!sorted.length) {
    cont.innerHTML =
      '<div style="text-align:center;padding:60px 20px;color:var(--text3);">' +
      '<div style="font-size:2.5rem;margin-bottom:10px;">📝</div>' +
      '<p style="font-size:14px;">No hay notas aún.</p>' +
      '<p style="font-size:12px;margin-top:6px;">Tocá <strong>+ Nueva nota</strong> para empezar.</p></div>';
    return;
  }
  cont.innerHTML = '';
  sorted.forEach(function(note) {
    var card = document.createElement('div');
    card.className = 'note-card' + (note.pinned ? ' pinned' : '');
    var tagsHtml = (note.tags && note.tags.length)
      ? '<div class="note-card-tags">' + note.tags.map(function(t) { return '<span class="tag-chip">#' + t + '</span>'; }).join('') + '</div>'
      : '';
    card.innerHTML =
      '<button class="note-delete-btn" onclick="deleteNoteById(event, \'' + note.id + '\')" title="Eliminar nota">🗑️</button>' +
      (note.pinned ? '<span style="position:absolute;top:10px;right:36px;font-size:12px;opacity:0.5;">📌</span>' : '') +
      '<h3>' + (note.title || 'Sin título') + '</h3>' +
      '<p class="note-card-meta">' + [note.speaker,note.date,note.folder].filter(Boolean).join(' · ') + '</p>' +
      tagsHtml;
    card.onclick = (function(id) { return function(e) { if (!e.target.classList.contains('note-delete-btn')) openEditor(id); }; })(note.id);
    cont.appendChild(card);
  });
}


/* ─────────────────────────────────
   10. ABRIR / CERRAR / CREAR NOTAS
───────────────────────────────── */
function openNewNote() {
  isEditing = true; updateFAB();
  document.getElementById('notes-list-view').style.display = 'none';
  document.getElementById('note-editor-view').style.display = 'flex';
  clearEditor();
  activeNoteId = null;
  renderSidebarNotes(currentFolder);
}

function openEditor(noteId) {
  isEditing = true; updateFAB();
  document.getElementById('notes-list-view').style.display = 'none';
  document.getElementById('note-editor-view').style.display = 'flex';
  loadNoteIntoEditor(noteId);
  activeNoteId = noteId;
  renderSidebarNotes(currentFolder);
}

function closeEditor() {
  // Guardar antes de cerrar si hay cambios
  if (currentNoteId) saveNote(true);
  isEditing = false; updateFAB();
  clearAutoSave();
  var ev = document.getElementById('note-editor-view');
  var lv = document.getElementById('notes-list-view');
  if (!ev || !lv) return;
  ev.style.display = 'none'; lv.style.display = 'block';
  activeNoteId = null;
  renderNotesList(currentFolder); renderFolderList(); renderSidebarNotes(currentFolder);
}

function clearEditor() {
  currentNoteId = null; currentTags = [];
  document.getElementById('note-title').value      = '';
  document.getElementById('note-date').value       = '';
  document.getElementById('note-speaker').value    = '';
  document.getElementById('editor-body').innerHTML = '';
  updatePinButton(false);
  renderTagPills(); populateFolderDropdown('');
}

function loadNoteIntoEditor(noteId) {
  var notes = loadNotes(); var note = null;
  for (var i = 0; i < notes.length; i++) if (notes[i].id === noteId) { note = notes[i]; break; }
  if (!note) return;
  currentNoteId = noteId; currentTags = note.tags || [];
  document.getElementById('note-title').value      = note.title   || '';
  document.getElementById('note-date').value       = note.date    || '';
  document.getElementById('note-speaker').value    = note.speaker || '';
  document.getElementById('editor-body').innerHTML = note.content || '';
  updatePinButton(note.pinned || false);
  renderTagPills(); populateFolderDropdown(note.folder || '');
}

/**
 * Guarda la nota actual.
 * @param {boolean} silent - si true, no muestra "Guardado ✓" (para auto-save)
 */
function saveNote(silent) {
  var id = currentNoteId || ('note_' + Date.now());
  var notes = loadNotes(); var existing = null;
  for (var i = 0; i < notes.length; i++) if (notes[i].id === id) { existing = notes[i]; break; }
  var note = {
    id: id,
    title:     document.getElementById('note-title').value.trim()   || 'Sin título',
    date:      document.getElementById('note-date').value           || '',
    speaker:   document.getElementById('note-speaker').value.trim() || '',
    folder:    document.getElementById('note-folder').value         || '',
    tags:      currentTags || [],
    content:   document.getElementById('editor-body').innerHTML     || '',
    pinned:    existing ? (existing.pinned || false) : false,
    createdAt: existing ? existing.createdAt : new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  var idx = -1;
  for (var j = 0; j < notes.length; j++) if (notes[j].id === id) { idx = j; break; }
  if (idx >= 0) notes[idx] = note; else notes.push(note);
  localStorage.setItem('hn_notes', JSON.stringify(notes));
  currentNoteId = id; activeNoteId = id;

  if (!silent) {
    var st = document.getElementById('save-status');
    var at = document.getElementById('autosave-status');
    if (st) { st.textContent = 'Guardado ✓'; setTimeout(function(){ st.textContent=''; }, 2500); }
    if (at) at.textContent = '';
  } else {
    var at2 = document.getElementById('autosave-status');
    if (at2) { at2.textContent = '● guardado'; setTimeout(function(){ at2.textContent=''; }, 2000); }
  }
  renderFolderList(); renderSidebarNotes(currentFolder);
}


/* ─────────────────────────────────
   11. AUTO-GUARDADO (3 segundos de inactividad)
───────────────────────────────── */
function scheduleAutoSave() {
  clearAutoSave();
  var at = document.getElementById('autosave-status');
  if (at) at.textContent = '…';
  autoSaveTimer = setTimeout(function() {
    if (isEditing) saveNote(true);
  }, 3000);
}
function clearAutoSave() {
  if (autoSaveTimer) { clearTimeout(autoSaveTimer); autoSaveTimer = null; }
}


/* ─────────────────────────────────
   12. PIN — anclar nota al tope
───────────────────────────────── */
function updatePinButton(isPinned) {
  var btn = document.getElementById('pin-btn');
  if (!btn) return;
  btn.classList.toggle('pinned', isPinned);
  btn.title = isPinned ? 'Desanclar nota' : 'Anclar nota al tope';
  btn.style.opacity = isPinned ? '1' : '';
}

function togglePin() {
  if (!currentNoteId) return;
  var notes = loadNotes();
  for (var i = 0; i < notes.length; i++) {
    if (notes[i].id === currentNoteId) {
      notes[i].pinned = !notes[i].pinned;
      updatePinButton(notes[i].pinned);
      break;
    }
  }
  localStorage.setItem('hn_notes', JSON.stringify(notes));
  renderSidebarNotes(currentFolder); renderNotesList(currentFolder);
}


/* ─────────────────────────────────
   13. ELIMINAR NOTA → PAPELERA
───────────────────────────────── */
function deleteNoteById(event, noteId) {
  event.stopPropagation();
  if (!confirm('¿Mover esta nota a la papelera?')) return;
  var notes = loadNotes();
  var noteToDelete = null;
  for (var i = 0; i < notes.length; i++) if (notes[i].id === noteId) { noteToDelete = notes[i]; break; }
  if (!noteToDelete) return;
  noteToDelete.deletedAt = new Date().toISOString();
  var trash = loadTrash(); trash.push(noteToDelete); saveTrash(trash);
  var remaining = notes.filter(function(n) { return n.id !== noteId; });
  localStorage.setItem('hn_notes', JSON.stringify(remaining));
  if (currentNoteId === noteId) closeEditor();
  renderNotesList(currentFolder); renderSidebarNotes(currentFolder); renderFolderList();
  renderTrashSection();
}


/* ─────────────────────────────────
   13b. PAPELERA DE RECICLAJE
───────────────────────────────── */
var trashOpen = false;

function loadTrash() {
  try { return JSON.parse(localStorage.getItem('hn_trash')) || []; }
  catch(e) { return []; }
}
function saveTrash(trash) { localStorage.setItem('hn_trash', JSON.stringify(trash)); }

function cleanupTrash() {
  var now = Date.now();
  var TEN_DAYS = 10 * 24 * 60 * 60 * 1000;
  var trash = loadTrash().filter(function(n) {
    return (now - new Date(n.deletedAt).getTime()) < TEN_DAYS;
  });
  saveTrash(trash);
}

function toggleTrash() {
  trashOpen = !trashOpen;
  var cont  = document.getElementById('trash-container');
  var arrow = document.getElementById('trash-arrow');
  if (!cont || !arrow) return;
  if (trashOpen) { cont.style.maxHeight = '400px'; cont.style.overflow = 'auto'; arrow.textContent = '▼'; }
  else           { cont.style.maxHeight = '0';     cont.style.overflow = 'hidden'; arrow.textContent = '▶'; }
  localStorage.setItem('hn_trash_open', trashOpen ? '1' : '0');
}

function renderTrashSection() {
  var list  = document.getElementById('trash-notes-list'); if (!list) return;
  var count = document.getElementById('trash-count');
  var trash = loadTrash();
  if (count) count.textContent = trash.length || '';
  if (!trash.length) {
    list.innerHTML = '<p style="color:var(--text3);font-size:11px;padding:8px 6px;text-align:center;">Papelera vacía</p>';
    return;
  }
  list.innerHTML = '';
  trash.slice().reverse().forEach(function(note) {
    var item = document.createElement('div');
    item.className = 'trash-note-item';
    var daysLeft = Math.max(0, 10 - Math.floor((Date.now() - new Date(note.deletedAt).getTime()) / (1000*60*60*24)));
    item.innerHTML =
      '<div class="trash-note-title">' + (note.title || 'Sin título') + '</div>' +
      '<div class="trash-note-meta">Se elimina en ' + daysLeft + ' día' + (daysLeft !== 1 ? 's' : '') + '</div>' +
      '<div class="trash-note-actions">' +
        '<button class="trash-restore-btn" onclick="restoreNote(\'' + note.id + '\')" title="Restaurar">↩</button>' +
        '<button class="trash-delete-btn"  onclick="permanentlyDeleteNote(\'' + note.id + '\')" title="Eliminar definitivamente">🗑️</button>' +
      '</div>';
    list.appendChild(item);
  });
}

function restoreNote(noteId) {
  var trash = loadTrash(); var noteIdx = -1;
  for (var i = 0; i < trash.length; i++) if (trash[i].id === noteId) { noteIdx = i; break; }
  if (noteIdx === -1) return;
  var note = trash[noteIdx]; delete note.deletedAt;
  var notes = loadNotes(); notes.push(note);
  localStorage.setItem('hn_notes', JSON.stringify(notes));
  trash.splice(noteIdx, 1); saveTrash(trash);
  renderNotesList(currentFolder); renderSidebarNotes(currentFolder); renderFolderList();
  renderTrashSection();
}

function permanentlyDeleteNote(noteId) {
  if (!confirm('¿Eliminar permanentemente? No se puede deshacer.')) return;
  saveTrash(loadTrash().filter(function(n) { return n.id !== noteId; }));
  renderTrashSection();
}

function emptyTrash() {
  if (!confirm('¿Vaciar toda la papelera? No se puede deshacer.')) return;
  saveTrash([]); renderTrashSection();
}


/* ─────────────────────────────────
   14. TAGS
───────────────────────────────── */
function renderTagPills() {
  var cont = document.getElementById('tags-container'); if (!cont) return;
  cont.innerHTML = '';
  for (var i = 0; i < currentTags.length; i++) {
    var pill = document.createElement('span'); pill.className = 'tag-pill';
    pill.innerHTML = '#' + currentTags[i] +
      '<button class="tag-remove-btn" onclick="removeTag(' + i + ')">×</button>';
    cont.appendChild(pill);
  }
}
function removeTag(i) { currentTags.splice(i,1); renderTagPills(); }


/* ─────────────────────────────────
   15. TOOLBAR
───────────────────────────────── */
function saveSelection() {
  var sel = window.getSelection();
  if (sel && sel.rangeCount > 0) savedRange = sel.getRangeAt(0).cloneRange();
}
function restoreSelection() {
  var editor = document.getElementById('editor-body'); if (!editor) return;
  editor.focus();
  if (savedRange) { var sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(savedRange); }
}
function fmt(cmd)      { restoreSelection(); document.execCommand(cmd, false, null); saveSelection(); document.getElementById('editor-body').focus(); }
function fmtBlock(tag) { restoreSelection(); document.execCommand('formatBlock', false, tag); saveSelection(); document.getElementById('editor-body').focus(); }
function insertList(t) { restoreSelection(); document.execCommand(t, false, null); saveSelection(); document.getElementById('editor-body').focus(); }

function applyHighlight(color) {
  var editor = document.getElementById('editor-body'); editor.focus();
  if (savedRange) { var sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(savedRange); }
  var sel2 = window.getSelection();
  if (!sel2 || !sel2.rangeCount) return;
  var range = sel2.getRangeAt(0); if (range.collapsed) return;
  var ok = false;
  try { ok = document.execCommand('hiliteColor', false, color); } catch(e) {}
  if (!ok) {
    var span = document.createElement('span'); span.style.backgroundColor = color;
    try { range.surroundContents(span); }
    catch(e) { var frag = range.extractContents(); span.appendChild(frag); range.insertNode(span); }
  }
  saveSelection(); editor.focus();
}

function removeHighlight() {
  var editor = document.getElementById('editor-body'); editor.focus();
  if (savedRange) { var sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(savedRange); }
  try { document.execCommand('hiliteColor', false, 'transparent'); } catch(e) {}
  try { document.execCommand('backColor',   false, 'transparent'); } catch(e) {}
  var sel2 = window.getSelection();
  if (sel2 && sel2.rangeCount > 0) {
    var range = sel2.getRangeAt(0);
    var div = document.createElement('div'); div.appendChild(range.cloneContents());
    var spans = div.querySelectorAll('span');
    if (spans.length) {
      for (var i = 0; i < spans.length; i++) {
        spans[i].style.backgroundColor = ''; spans[i].style.background = '';
        if (!spans[i].getAttribute('style') || !spans[i].getAttribute('style').trim()) {
          var p = spans[i].parentNode;
          while (spans[i].firstChild) p.insertBefore(spans[i].firstChild, spans[i]);
          p.removeChild(spans[i]);
        }
      }
      range.deleteContents();
      range.insertNode(div.firstChild || document.createTextNode(''));
    }
  }
  saveSelection(); editor.focus();
}

/* ────────────────────────────────────────────
   IMÁGENES — insertar, redimensionar, alinear
   ──────────────────────────────────────────── */

var MAX_IMAGE_BYTES = 500 * 1024 * 1024; // 500 MB

function insertEditorImage() {
  var input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.onchange = function(e) {
    var file = e.target.files[0];
    if (!file) return;

    // Validar tamaño máximo
    if (file.size > MAX_IMAGE_BYTES) {
      alert('La imagen es demasiado grande. El tamaño máximo es 500 MB.\nEsta imagen pesa ' + (file.size / (1024*1024)).toFixed(1) + ' MB.');
      return;
    }

    var reader = new FileReader();
    reader.onload = function(ev) {
      restoreSelection();

      // Insertar imagen envuelta en un div editable para poder controlar alineación/tamaño
      var uid   = 'img_' + Date.now();
      var html  =
        '<div class="hn-img-wrap" id="' + uid + '" data-align="center" ' +
            'style="text-align:center;margin:12px 0;display:block;">' +
          '<img src="' + ev.target.result + '" ' +
               'style="max-width:100%;width:60%;border-radius:6px;cursor:pointer;" ' +
               'onclick="showImageToolbar(this)" />' +
        '</div><p><br></p>';

      document.execCommand('insertHTML', false, html);

      // Esperar a que el DOM actualice y registrar el click handler
      setTimeout(function() {
        var wrap = document.getElementById(uid);
        if (wrap) wrap.removeAttribute('id');
      }, 50);
    };
    reader.readAsDataURL(file);
  };
  input.click();
}

/**
 * Muestra el toolbar flotante de control de imagen.
 * Se posiciona justo sobre la imagen clickeada.
 */
function showImageToolbar(img) {
  // Eliminar toolbar anterior si existe
  hideImageToolbar();

  var wrap = img.parentNode; // .hn-img-wrap
  var toolbar = document.createElement('div');
  toolbar.id = 'img-toolbar';

  // Calcular posición sobre la imagen
  var rect = img.getBoundingClientRect();
  toolbar.style.cssText =
    'position:fixed;' +
    'top:' + (rect.top - 48) + 'px;' +
    'left:' + Math.max(8, rect.left) + 'px;' +
    'z-index:9999;' +
    'background:var(--card);' +
    'border:1px solid var(--border);' +
    'border-radius:10px;' +
    'box-shadow:0 4px 20px rgba(0,0,0,0.15);' +
    'display:flex;' +
    'align-items:center;' +
    'gap:4px;' +
    'padding:6px 10px;' +
    'font-family:\'DM Sans\',sans-serif;' +
    'font-size:12px;';

  var currentW = img.style.width || '60%';
  var currentAlign = (wrap && wrap.getAttribute('data-align')) || 'center';

  toolbar.innerHTML =
    // ── Tamaño ──
    '<span style="color:var(--text2);font-size:11px;margin-right:2px;">Tamaño:</span>' +
    makeImgBtn('25%',  currentW === '25%',  'imgSetSize(this, \'25%\')')  +
    makeImgBtn('50%',  currentW === '50%',  'imgSetSize(this, \'50%\')')  +
    makeImgBtn('75%',  currentW === '75%',  'imgSetSize(this, \'75%\')')  +
    makeImgBtn('100%', currentW === '100%', 'imgSetSize(this, \'100%\')') +
    // ── Separador ──
    '<div style="width:1px;height:20px;background:var(--border);margin:0 4px;"></div>' +
    // ── Alineación ──
    '<span style="color:var(--text2);font-size:11px;margin-right:2px;">Alinear:</span>' +
    makeImgBtn('⬅',  currentAlign === 'left',   'imgSetAlign(this, \'left\')',   'Izquierda') +
    makeImgBtn('↔',  currentAlign === 'center', 'imgSetAlign(this, \'center\')', 'Centro')    +
    makeImgBtn('➡',  currentAlign === 'right',  'imgSetAlign(this, \'right\')',  'Derecha')   +
    // ── Separador ──
    '<div style="width:1px;height:20px;background:var(--border);margin:0 4px;"></div>' +
    // ── Eliminar imagen ──
    '<button onclick="imgDelete()" title="Eliminar imagen" ' +
      'style="background:none;border:none;cursor:pointer;font-size:14px;color:#EF4444;padding:2px 5px;border-radius:5px;">' +
      '🗑️' +
    '</button>';

  // Guardar referencia a la imagen activa
  toolbar._targetImg  = img;
  toolbar._targetWrap = wrap;

  document.body.appendChild(toolbar);

  // Cerrar al hacer click fuera
  setTimeout(function() {
    document.addEventListener('mousedown', hideImageToolbarOnClick, true);
  }, 50);
}

function makeImgBtn(label, isActive, onclick, title) {
  var active = isActive
    ? 'background:var(--accent);color:#fff;border-color:var(--accent);'
    : 'background:var(--card);color:var(--text);border-color:var(--border);';
  return '<button onclick="' + onclick + '" title="' + (title||label) + '" ' +
    'style="' + active + 'border:1px solid;border-radius:6px;padding:3px 8px;' +
    'font-size:11px;font-weight:500;cursor:pointer;min-width:32px;font-family:\'DM Sans\',sans-serif;">' +
    label + '</button>';
}

function hideImageToolbarOnClick(e) {
  var tb = document.getElementById('img-toolbar');
  if (tb && !tb.contains(e.target)) hideImageToolbar();
}

function hideImageToolbar() {
  var tb = document.getElementById('img-toolbar');
  if (tb) tb.remove();
  document.removeEventListener('mousedown', hideImageToolbarOnClick, true);
}

/** Cambia el tamaño de la imagen activa */
function imgSetSize(btn, size) {
  var tb = document.getElementById('img-toolbar');
  if (!tb || !tb._targetImg) return;
  tb._targetImg.style.width = size;
  // Actualizar botones activos
  tb.querySelectorAll('button[onclick*="imgSetSize"]').forEach(function(b) {
    b.style.background    = 'var(--card)';
    b.style.color         = 'var(--text)';
    b.style.borderColor   = 'var(--border)';
  });
  btn.style.background  = 'var(--accent)';
  btn.style.color       = '#fff';
  btn.style.borderColor = 'var(--accent)';
}

/** Cambia la alineación de la imagen activa */
function imgSetAlign(btn, align) {
  var tb = document.getElementById('img-toolbar');
  if (!tb || !tb._targetImg) return;
  var wrap = tb._targetWrap;
  if (wrap && wrap.classList.contains('hn-img-wrap')) {
    wrap.setAttribute('data-align', align);
    if (align === 'left') {
      wrap.style.textAlign = 'left';
      tb._targetImg.style.float  = 'none';
      tb._targetImg.style.margin = '0 auto 0 0';
    } else if (align === 'right') {
      wrap.style.textAlign = 'right';
      tb._targetImg.style.float  = 'none';
      tb._targetImg.style.margin = '0 0 0 auto';
    } else {
      wrap.style.textAlign = 'center';
      tb._targetImg.style.float  = 'none';
      tb._targetImg.style.margin = '0 auto';
    }
  }
  // Actualizar botones activos
  tb.querySelectorAll('button[onclick*="imgSetAlign"]').forEach(function(b) {
    b.style.background  = 'var(--card)';
    b.style.color       = 'var(--text)';
    b.style.borderColor = 'var(--border)';
  });
  btn.style.background  = 'var(--accent)';
  btn.style.color       = '#fff';
  btn.style.borderColor = 'var(--accent)';
}

/** Elimina la imagen activa */
function imgDelete() {
  var tb = document.getElementById('img-toolbar');
  if (!tb) return;
  var wrap = tb._targetWrap;
  var img  = tb._targetImg;
  hideImageToolbar();
  if (wrap && wrap.classList.contains('hn-img-wrap')) {
    wrap.remove();
  } else if (img) {
    img.remove();
  }
}


/* ─────────────────────────────────
   16. EXPORTAR PDF
───────────────────────────────── */
function cleanForPDF(str) {
  if (!str) return '';
  return str
    .replace(/[\u{1F000}-\u{1FFFF}]/gu, '')
    .replace(/[\u{2600}-\u{27BF}]/gu, '')
    .replace(/[\u{1F300}-\u{1F9FF}]/gu, '')
    .replace(/[\u200D\u20E3\uFE0F]/g, '')
    .replace(/•/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

function htmlToPDFBlocks(html) {
  var div = document.createElement('div');
  div.innerHTML = html;
  var blocks = [];
  function processNode(node) {
    if (node.nodeType === 3) {
      var t = cleanForPDF(node.textContent); if (t) blocks.push({ text: t, style: 'body' }); return;
    }
    var tag = node.tagName ? node.tagName.toLowerCase() : '';
    var text = cleanForPDF(node.innerText || node.textContent || '');
    if (tag === 'h1') { if (text) blocks.push({ text: text, style: 'h1' }); }
    else if (tag === 'h2') { if (text) blocks.push({ text: text, style: 'h2' }); }
    else if (tag === 'h3') { if (text) blocks.push({ text: text, style: 'h3' }); }
    else if (tag === 'hr') { blocks.push({ text: '', style: 'hr' }); }
    else if (tag === 'ul') {
      node.querySelectorAll('li').forEach(function(li) {
        var t = cleanForPDF(li.innerText || li.textContent || '');
        if (t) blocks.push({ text: '- ' + t, style: 'list' });
      });
    }
    else if (tag === 'ol') {
      var num = 1;
      node.querySelectorAll('li').forEach(function(li) {
        var t = cleanForPDF(li.innerText || li.textContent || '');
        if (t) { blocks.push({ text: num + '. ' + t, style: 'list' }); num++; }
      });
    }
    else if (node.classList && (node.classList.contains('verse-block-wrapper') || node.classList.contains('verse-block'))) {
      var ref2  = node.querySelector('.verse-reference');
      var vtxt2 = node.querySelector('.verse-text');
      var refT  = ref2  ? cleanForPDF(ref2.textContent)  : '';
      var verT  = vtxt2 ? cleanForPDF(vtxt2.textContent) : '';
      if (refT || verT) blocks.push({ text: refT + '\n' + verT, style: 'verse' });
    }
    else if (tag === 'p' || tag === 'div' || tag === 'span') {
      var hasBlock = false;
      if (node.children) for (var ci = 0; ci < node.children.length; ci++) {
        var ct = node.children[ci].tagName ? node.children[ci].tagName.toLowerCase() : '';
        if (['h1','h2','h3','ul','ol','blockquote','div'].indexOf(ct) !== -1) { hasBlock = true; break; }
      }
      if (hasBlock) node.childNodes.forEach(function(c) { processNode(c); });
      else if (text) blocks.push({ text: text, style: 'body' });
    }
    else { node.childNodes.forEach(function(c) { processNode(c); }); }
  }
  div.childNodes.forEach(function(n) { processNode(n); });
  return blocks;
}

function exportPDF() {
  var titleRaw   = document.getElementById('note-title').value   || 'Sin titulo';
  var speakerRaw = document.getElementById('note-speaker').value || '';
  var date       = document.getElementById('note-date').value    || '';
  var body       = document.getElementById('editor-body');
  var title      = cleanForPDF(titleRaw)   || 'Sin titulo';
  var speaker    = cleanForPDF(speakerRaw) || '';
  var jsPDF = window.jspdf ? window.jspdf.jsPDF : window.jsPDF;
  if (!jsPDF) { alert('jsPDF no esta disponible. Verifica tu conexion a internet.'); return; }
  var doc = new jsPDF({ unit: 'mm', format: 'a4' });
  var y = 18; var maxW = 178;
  // Título
  doc.setFontSize(20); doc.setFont(undefined, 'bold'); doc.setTextColor(245, 158, 11);
  var titleLines = doc.splitTextToSize(title, maxW);
  doc.text(titleLines, 14, y); y += titleLines.length * 8 + 2;
  // Metadata
  if (speaker || date) {
    doc.setFontSize(10); doc.setFont(undefined, 'normal'); doc.setTextColor(120, 120, 120);
    doc.text([speaker, date].filter(Boolean).join('  -  '), 14, y); y += 6;
  }
  // Tags
  if (currentTags && currentTags.length) {
    doc.setFontSize(9); doc.setTextColor(180, 130, 40);
    doc.text(currentTags.map(function(t){ return '#' + t; }).join('  '), 14, y); y += 6;
  }
  // Separador
  doc.setDrawColor(245, 158, 11); doc.setLineWidth(0.4);
  doc.line(14, y, 196, y); y += 7;
  // Contenido por bloques
  var blocks = htmlToPDFBlocks(body ? body.innerHTML : '');
  blocks.forEach(function(block) {
    if (y > 272) { doc.addPage(); y = 16; }
    if (block.style === 'hr') {
      doc.setDrawColor(200,200,200); doc.setLineWidth(0.2); doc.line(14,y,196,y); y += 5; return;
    }
    if (block.style === 'h1') {
      doc.setFontSize(16); doc.setFont(undefined,'bold'); doc.setTextColor(28,28,30);
      var ls = doc.splitTextToSize(block.text, maxW);
      ls.forEach(function(l) { if (y>272){doc.addPage();y=16;} doc.text(l,14,y); y+=7; }); y+=2; return;
    }
    if (block.style === 'h2') {
      doc.setFontSize(13); doc.setFont(undefined,'bold'); doc.setTextColor(28,28,30);
      var ls = doc.splitTextToSize(block.text, maxW);
      ls.forEach(function(l) { if (y>272){doc.addPage();y=16;} doc.text(l,14,y); y+=6; }); y+=1; return;
    }
    if (block.style === 'h3') {
      doc.setFontSize(11); doc.setFont(undefined,'bold'); doc.setTextColor(28,28,30);
      var ls = doc.splitTextToSize(block.text, maxW);
      ls.forEach(function(l) { if (y>272){doc.addPage();y=16;} doc.text(l,14,y); y+=6; }); return;
    }
    if (block.style === 'verse') {
      var vParts = block.text.split('\n');
      var vRef   = vParts[0] || ''; var vTxt = vParts.slice(1).join(' ');
      doc.setFontSize(8); var vRefLines = vRef ? doc.splitTextToSize(vRef, maxW-8) : [];
      doc.setFontSize(10); var vTxtLines = vTxt ? doc.splitTextToSize(vTxt, maxW-8) : [];
      var vBlockH = 3 + (vRefLines.length*5) + (vTxtLines.length*5.5) + 4;
      if (y + vBlockH > 272) { doc.addPage(); y = 16; }
      var vStartY = y; y += 3;
      if (vRefLines.length) {
        doc.setFontSize(8); doc.setFont(undefined,'bold'); doc.setTextColor(200,130,30);
        vRefLines.forEach(function(l) { doc.text(l,18,y); y+=5; });
      }
      if (vTxtLines.length) {
        doc.setFontSize(10); doc.setFont(undefined,'italic'); doc.setTextColor(70,70,75);
        vTxtLines.forEach(function(l) { doc.text(l,18,y); y+=5.5; });
      }
      y += 4;
      doc.setFillColor(245,158,11); doc.rect(13, vStartY, 1.5, y - vStartY, 'F');
      return;
    }
    if (block.style === 'list') {
      doc.setFontSize(11); doc.setFont(undefined,'normal'); doc.setTextColor(28,28,30);
      var ls = doc.splitTextToSize(block.text, maxW-4);
      ls.forEach(function(l,idx2) { if(y>272){doc.addPage();y=16;} doc.text(l,idx2===0?16:20,y); y+=5.5; }); return;
    }
    if (block.text && block.text.trim()) {
      doc.setFontSize(11); doc.setFont(undefined,'normal'); doc.setTextColor(28,28,30);
      var ls = doc.splitTextToSize(block.text, maxW);
      ls.forEach(function(l) { if(y>272){doc.addPage();y=16;} doc.text(l,14,y); y+=5.5; }); y+=1;
    }
  });
  // Footer
  doc.setFontSize(8); doc.setFont(undefined,'normal'); doc.setTextColor(180,180,180);
  doc.text('Holy Notes  -  ' + new Date().toLocaleDateString('es'), 14, 288);
  var filename = titleRaw.replace(/[^\w\sáéíóúÁÉÍÓÚñÑüÜ]/g,'').trim() || 'nota';
  doc.save(filename + '.pdf');
}
function runSidebarSearch(query) {
  var clearBtn = document.getElementById('sidebar-search-clear');
  if (clearBtn) clearBtn.style.display = query ? 'block' : 'none';

  if (!query || !query.trim()) {
    renderFolderList(); renderSidebarNotes(currentFolder); return;
  }
  var q = query.toLowerCase();

  // Filtrar carpetas
  var folders = loadFolders();
  var filteredFolders = folders.filter(function(f) { return (f.name || f).toLowerCase().indexOf(q) !== -1; });
  var folderCont = document.getElementById('folder-list'); if (!folderCont) return;
  folderCont.innerHTML = '';
  if (filteredFolders.length) {
    filteredFolders.forEach(function(f) {
      var row = document.createElement('div'); row.className = 'folder-row';
      row.innerHTML = '<span class="folder-name" onclick="filterByFolder(\'' + escapeHtml(f) + '\')">' + escapeHtml(f) + '</span>';
      folderCont.appendChild(row);
    });
  } else {
    folderCont.innerHTML = '<p style="color:var(--text3);font-size:11px;padding:4px 6px;">Sin carpetas</p>';
  }

  // Filtrar notas
  var notes = loadNotes();
  var filteredNotes = sortNotes(notes.filter(function(n) {
    return [n.title, n.speaker, n.folder, (n.tags||[]).join(' '), stripHtml(n.content||'')]
      .join(' ').toLowerCase().indexOf(q) !== -1;
  }));
  var noteCont = document.getElementById('sidebar-notes-list'); if (!noteCont) return;
  var countEl  = document.getElementById('sidebar-notes-count');
  if (countEl) countEl.textContent = filteredNotes.length || '';

  noteCont.innerHTML = '';
  if (!filteredNotes.length) {
    noteCont.innerHTML = '<p style="color:var(--text3);font-size:11px;padding:8px 6px;text-align:center;">Sin resultados</p>';
    return;
  }
  filteredNotes.slice(0,30).forEach(function(note) {
    var item = document.createElement('div');
    item.className = 'sidebar-note-item' + (note.id === activeNoteId ? ' active' : '');
    var preview = stripHtml(note.content||'').trim().slice(0,55);
    item.innerHTML =
      '<div class="sidebar-note-title">' + (note.title||'Sin título') + '</div>' +
      '<div class="sidebar-note-meta">' + [note.date,note.speaker].filter(Boolean).join(' · ') + '</div>' +
      (preview ? '<div class="sidebar-note-preview">' + preview + '…</div>' : '');
    item.onclick = (function(id) { return function() { openEditor(id); }; })(note.id);
    noteCont.appendChild(item);
  });
}

function clearSidebarSearch() {
  var inp = document.getElementById('sidebar-search-input'); if (!inp) return;
  inp.value = '';
  var clearBtn = document.getElementById('sidebar-search-clear');
  if (clearBtn) clearBtn.style.display = 'none';
  renderFolderList(); renderSidebarNotes(currentFolder);
}


/* ─────────────────────────────────
   18. BÚSQUEDA PRINCIPAL
───────────────────────────────── */
function runMainSearch(query) {
  var clearBtn = document.getElementById('main-search-clear');
  if (clearBtn) clearBtn.style.display = query ? 'block' : 'none';

  var title = document.getElementById('notes-view-title');
  if (!query || !query.trim()) {
    if (title) title.textContent = currentFolder || 'Todas las notas';
    renderNotesList(currentFolder); return;
  }
  var q = query.toLowerCase(); var notes = loadNotes();
  var found = sortNotes(notes.filter(function(n) {
    var haystack = [n.title, n.speaker, n.folder, (n.tags||[]).join(' '), stripHtml(n.content||'')]
      .join(' ').toLowerCase();
    return haystack.indexOf(q) !== -1;
  }));

  if (title) title.textContent = found.length + ' resultado' + (found.length !== 1 ? 's' : '');

  var cont = document.getElementById('notes-cards-container'); if (!cont) return;
  if (!found.length) {
    cont.innerHTML = '<div style="text-align:center;padding:48px 20px;color:var(--text3);"><div style="font-size:2rem;margin-bottom:10px;">🔍</div><p>No se encontraron prédicas.</p></div>';
    return;
  }
  cont.innerHTML = '';
  found.forEach(function(note) {
    var card = document.createElement('div'); card.className = 'note-card' + (note.pinned ? ' pinned' : '');
    var tagsHtml = (note.tags && note.tags.length)
      ? '<div class="note-card-tags">' + note.tags.map(function(t){ return '<span class="tag-chip">#'+t+'</span>'; }).join('') + '</div>'
      : '';
    card.innerHTML =
      '<button class="note-delete-btn" onclick="deleteNoteById(event, \'' + note.id + '\')" title="Eliminar">🗑️</button>' +
      '<h3>' + (note.title||'Sin título') + '</h3>' +
      '<p class="note-card-meta">' + [note.speaker,note.date,note.folder].filter(Boolean).join(' · ') + '</p>' +
      tagsHtml;
    card.onclick = (function(id) { return function(e) { if (!e.target.classList.contains('note-delete-btn')) openEditor(id); }; })(note.id);
    cont.appendChild(card);
  });
}

function clearMainSearch() {
  var inp = document.getElementById('main-search-input'); if (!inp) return;
  inp.value = '';
  var cb = document.getElementById('main-search-clear'); if (cb) cb.style.display = 'none';
  var title = document.getElementById('notes-view-title');
  if (title) title.textContent = currentFolder || 'Todas las notas';
  renderNotesList(currentFolder);
}


/* ─────────────────────────────────
   19. SIDEBAR NOTAS DESPLEGABLE
───────────────────────────────── */
function toggleSidebarNotes() {
  sidebarNotesOpen = !sidebarNotesOpen;
  var cont  = document.getElementById('sidebar-notes-container');
  var arrow = document.getElementById('sidebar-notes-arrow');
  if (!cont || !arrow) return;
  if (sidebarNotesOpen) {
    cont.style.maxHeight = '600px';
    cont.style.overflow  = 'auto';
    arrow.textContent    = '▼';
  } else {
    cont.style.maxHeight = '0';
    cont.style.overflow  = 'hidden';
    arrow.textContent    = '▶';
  }
  localStorage.setItem('hn_sidebar_notes_open', sidebarNotesOpen ? '1' : '0');
}


/* ─────────────────────────────────
   20. SLASH COMMAND
───────────────────────────────── */
function buildSlashPopup() {
  var popup = document.createElement('div'); popup.id = 'slash-popup';
  popup.innerHTML =
    '<p class="slash-hint">✝ Ej: /Juan 3:16 o /Juan 3:16 NVI</p>' +
    '<input id="slash-input" type="text" placeholder="/Juan 3:16 RVR60" autocomplete="off" />' +
    '<div id="slash-book-list"></div>' +
    '<div id="slash-versions-note">RVR60 · NVI · NTV · LBLA · PDT (default: RVR60)</div>';
  document.body.appendChild(popup);
}

function showSlashPopup() {
  saveSelection();
  var popup = document.getElementById('slash-popup');
  var sel = window.getSelection(); var rect = { bottom:200, left:100, top:100 };
  if (sel && sel.rangeCount > 0) rect = sel.getRangeAt(0).getBoundingClientRect();
  var top  = rect.bottom + 8; var left = rect.left;
  if (left + 330 > window.innerWidth)  left = window.innerWidth - 340;
  if (top  + 280 > window.innerHeight) top  = rect.top - 280;
  popup.style.top = top + 'px'; popup.style.left = left + 'px';
  popup.style.display = 'block';
  setTimeout(function() {
    var inp = document.getElementById('slash-input');
    if (!inp) return; inp.value = '/'; renderBookList(''); inp.focus();
  }, 30);
}
function hideSlashPopup() { var p = document.getElementById('slash-popup'); if (p) p.style.display = 'none'; }

function renderBookList(query) {
  var list = document.getElementById('slash-book-list'); if (!list) return;
  var q = normalizeStr(query.replace(/^\//,'').trim());
  var filtered = q === '' ? ALL_BOOKS : ALL_BOOKS.filter(function(book) {
    var norm = normalizeStr(book); var ns = norm.replace(/\s+/g,''); var qns = q.replace(/\s+/g,'');
    if (norm.indexOf(q) === 0) return true;
    var ws = norm.split(/\s+/); for (var w = 0; w < ws.length; w++) if (ws[w].indexOf(q) === 0) return true;
    if (ns.indexOf(qns) === 0) return true;
    return false;
  });
  list.innerHTML = '';
  if (!filtered.length) { list.innerHTML = '<p style="color:var(--text3);font-size:12px;padding:5px 8px;">No se encontró ese libro.</p>'; return; }
  for (var i = 0; i < Math.min(filtered.length,10); i++) {
    var book = filtered[i]; var btn = document.createElement('button');
    btn.className = 'slash-book-btn';
    var nm = normalizeStr(book); var mi = nm.indexOf(q); var d = book;
    if (q && mi !== -1) d = book.slice(0,mi) + '<strong style="color:var(--accent);">' + book.slice(mi,mi+q.length) + '</strong>' + book.slice(mi+q.length);
    btn.innerHTML = d;
    btn.onmousedown = (function(b) {
      return function(e) {
        e.preventDefault(); e.stopPropagation();
        var inp = document.getElementById('slash-input');
        if (inp) { inp.value = '/' + b + ' '; renderBookList(b); setTimeout(function(){ inp.focus(); }, 10); }
      };
    })(book);
    list.appendChild(btn);
  }
}

function fetchVerseFromCommand(cmd) {
  var raw   = cmd.startsWith('/') ? cmd.slice(1).trim() : cmd.trim();
  var parts = raw.split(/\s+/);
  if (!parts.length) return Promise.resolve({ error: 'Formato inválido.' });
  var last = parts[parts.length-1].toUpperCase();
  var version, refStr;
  if (KNOWN_VERSIONS.indexOf(last) !== -1) { version = last; refStr = parts.slice(0,-1).join(' '); }
  else { version = 'RVR60'; refStr = parts.join(' '); }
  // Rango: Libro Cap:Inicio-Fin
  var rangeMatch = refStr.match(/^(.+?)\s+(\d+):(\d+)-(\d+)$/);
  if (rangeMatch) {
    var bk = rangeMatch[1].trim(), ch = rangeMatch[2];
    var vFrom = parseInt(rangeMatch[3]), vTo = parseInt(rangeMatch[4]);
    if (vTo < vFrom) return Promise.resolve({ error: 'Rango inválido: el versículo final debe ser mayor al inicial.' });
    return fetchVerseRange(bk, ch, vFrom, vTo, version);
  }
  // Versículo único
  var singleMatch = refStr.match(/^(.+?)\s+(\d+):(\d+)$/);
  if (!singleMatch) return Promise.resolve({ error: 'Formato inválido. Ej: /Juan 3:16 o /Génesis 1:1-5 NVI' });
  return fetchVerse(singleMatch[1].trim(), singleMatch[2], parseInt(singleMatch[3]), version);
}

function fetchVerseRange(bookName, chapter, verseFrom, verseTo, version) {
  return fetchChapter(bookName, chapter, version).then(function(verses) {
    if (!verses) return { error: 'No se pudo cargar ' + bookName + ' ' + chapter + ' (' + version + ').' };
    var inRange = verses.filter(function(v) { return v.v >= verseFrom && v.v <= verseTo; });
    if (!inRange.length) return { error: bookName + ' ' + chapter + ':' + verseFrom + '-' + verseTo + ' no encontrado.' };
    var text = inRange.map(function(v) { return v.v + ' ' + v.t; }).join(' ');
    return {
      reference: bookName + ' ' + chapter + ':' + verseFrom + '-' + verseTo + ' — ' + version.toUpperCase(),
      text: text
    };
  });
}


function insertVerseBlock(result) {
  var editor = document.getElementById('editor-body'); if (!editor) return;
  editor.focus();
  if (savedRange) { var sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(savedRange); }
  var html = result.error
    ? '<div class="verse-error-wrapper" id="inserted-block" style="position:relative;margin:8px 0;"><div class="verse-error">' + result.error + '</div><button class="block-delete-btn" title="Eliminar">×</button></div>'
    : '<div class="verse-block-wrapper" id="inserted-block" style="position:relative;margin:14px 0;"><div class="verse-block" contenteditable="false"><span class="verse-reference">' + result.reference + '</span><p class="verse-text">' + result.text + '</p></div><button class="block-delete-btn" title="Eliminar versículo">×</button></div>';
  document.execCommand('insertHTML', false, html);
  var block = document.getElementById('inserted-block');
  if (block) {
    block.removeAttribute('id');
    var newP = document.createElement('p'); newP.innerHTML = '<br>';
    if (block.nextSibling) block.parentNode.insertBefore(newP, block.nextSibling);
    else block.parentNode.appendChild(newP);
    var range = document.createRange(); range.setStart(newP,0); range.collapse(true);
    var sel2 = window.getSelection(); sel2.removeAllRanges(); sel2.addRange(range);
    savedRange = range.cloneRange();
  }
}


/* ─────────────────────────────────
   20b. EDITAR VERSÍCULO (click sobre bloque)
───────────────────────────────── */
var currentVerseWrapper = null;
var verseEditDebounce   = null;

function openVerseEditModal(wrapper) {
  var existing = document.getElementById('verse-edit-modal');
  if (existing) existing.remove();
  currentVerseWrapper = wrapper;

  /* Parsear referencia actual */
  var refEl   = wrapper.querySelector('.verse-reference');
  var textEl  = wrapper.querySelector('.verse-text');
  var refText = refEl  ? refEl.textContent.trim()  : '';
  var curText = textEl ? textEl.textContent.trim()  : '';

  /* "JUAN 3:16 — RVR60" o "JUAN 3:16-18 — NVI" */
  var match = refText.match(/^(.+?)\s+(\d+):(\d+)(?:-(\d+))?\s*[—\-–]\s*(\S+)$/i);
  var curBook = 'Juan', curChap = 3, curVsS = 16, curVsE = 16, curVer = 'RVR60';
  if (match) {
    var bookRaw = match[1].trim();
    for (var bi = 0; bi < ALL_BOOKS.length; bi++) {
      if (normalizeStr(ALL_BOOKS[bi]) === normalizeStr(bookRaw)) { curBook = ALL_BOOKS[bi]; break; }
    }
    curChap = parseInt(match[2]);
    curVsS  = parseInt(match[3]);
    curVsE  = match[4] ? parseInt(match[4]) : curVsS;
    var vRaw = match[5].toUpperCase().replace('RV1960','RVR60');
    if (['RVR60','NVI','NTV','LBLA','PDT'].indexOf(vRaw) !== -1) curVer = vRaw;
  }

  /* Helpers para options */
  function bookOpts() {
    return ALL_BOOKS.map(function(b) {
      return '<option value="' + b + '"' + (b === curBook ? ' selected' : '') + '>' + b + '</option>';
    }).join('');
  }
  function chapOpts(max, sel) {
    var s = ''; for (var c = 1; c <= max; c++) s += '<option value="' + c + '"' + (c === sel ? ' selected' : '') + '>' + c + '</option>'; return s;
  }
  function verseOpts(sel) {
    var s = ''; for (var v = 1; v <= 200; v++) s += '<option value="' + v + '"' + (v === sel ? ' selected' : '') + '>' + v + '</option>'; return s;
  }
  var maxChap = CHAPTER_COUNTS[curBook] || 150;

  var VERSIONS = ['RVR60','NVI','NTV','LBLA','PDT'];
  var verOpts = VERSIONS.map(function(v) {
    return '<option value="' + v + '"' + (v === curVer ? ' selected' : '') + '>' + v + '</option>';
  }).join('');

  var modal = document.createElement('div');
  modal.id = 'verse-edit-modal';
  modal.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;';

  modal.innerHTML =
    '<div style="background:var(--card);border-radius:18px;width:360px;max-width:96vw;box-shadow:0 10px 50px rgba(0,0,0,0.35);overflow:hidden;font-family:\'DM Sans\',sans-serif;">' +

      /* ── Preview ── */
      '<div style="background:var(--bg2);padding:14px 16px 13px;position:relative;min-height:70px;">' +
        '<div id="ve-ref-disp" style="font-size:10px;font-weight:700;color:var(--accent);letter-spacing:0.07em;text-transform:uppercase;margin-bottom:5px;">' + (refText || 'Versículo') + '</div>' +
        '<p   id="ve-text-prev" style="font-size:13px;font-style:italic;color:var(--text2);line-height:1.55;margin:0;max-height:72px;overflow-y:auto;">' + curText + '</p>' +
        '<div id="ve-loading" style="display:none;position:absolute;bottom:8px;right:12px;font-size:10px;color:var(--text3);">⏳ cargando…</div>' +
        '<button onclick="closeVerseEditModal()" style="position:absolute;top:9px;right:12px;background:none;border:none;cursor:pointer;font-size:19px;color:var(--text3);line-height:1;padding:0;">×</button>' +
      '</div>' +

      /* ── Título ── */
      '<div style="padding:13px 16px 6px;display:flex;align-items:center;gap:7px;">' +
        '<span style="font-size:14px;">✍️</span>' +
        '<span style="font-weight:700;font-size:13px;color:var(--text);">Escritura</span>' +
      '</div>' +

      /* ── Selectores ── */
      '<div style="padding:4px 16px 14px;display:flex;align-items:center;gap:5px;flex-wrap:nowrap;">' +
        '<select id="ve-book"    onchange="onVEChange()" style="flex:3;min-width:0;padding:7px 6px;border-radius:8px;border:1.5px solid var(--border);background:var(--bg2);color:var(--text);font-size:12px;font-weight:600;cursor:pointer;">' + bookOpts() + '</select>' +
        '<select id="ve-chap"    onchange="onVEChange()" style="width:48px;padding:7px 3px;border-radius:8px;border:1.5px solid var(--border);background:var(--bg2);color:var(--text);font-size:12px;font-weight:600;cursor:pointer;text-align:center;">' + chapOpts(maxChap, curChap) + '</select>' +
        '<span style="color:var(--text2);font-weight:700;font-size:14px;">:</span>' +
        '<select id="ve-vs"      onchange="onVEChange()" style="width:48px;padding:7px 3px;border-radius:8px;border:1.5px solid var(--border);background:var(--bg2);color:var(--text);font-size:12px;font-weight:600;cursor:pointer;text-align:center;">' + verseOpts(curVsS) + '</select>' +
        '<span style="color:var(--text3);font-size:13px;">-</span>' +
        '<select id="ve-ve"      onchange="onVEChange()" style="width:48px;padding:7px 3px;border-radius:8px;border:1.5px solid var(--border);background:var(--bg2);color:var(--text);font-size:12px;font-weight:600;cursor:pointer;text-align:center;">' + verseOpts(curVsE) + '</select>' +
        '<select id="ve-ver"     onchange="onVEChange()" style="width:68px;padding:7px 4px;border-radius:8px;border:1.5px solid var(--accent);background:var(--accent-light);color:var(--accent);font-size:11px;font-weight:700;cursor:pointer;">' + verOpts + '</select>' +
      '</div>' +

      /* ── Botón ── */
      '<div style="padding:0 16px 16px;">' +
        '<button id="ve-update-btn" onclick="confirmUpdateVerse()" ' +
          'style="width:100%;padding:11px;border-radius:10px;border:none;background:var(--accent);color:#fff;font-weight:700;font-size:14px;cursor:pointer;">✓ Actualizar versículo</button>' +
      '</div>' +
    '</div>';

  modal.addEventListener('click', function(e) { if (e.target === modal) closeVerseEditModal(); });
  document.body.appendChild(modal);
}

function closeVerseEditModal() {
  var m = document.getElementById('verse-edit-modal');
  if (m) m.remove();
  currentVerseWrapper = null;
  if (verseEditDebounce) { clearTimeout(verseEditDebounce); verseEditDebounce = null; }
}

function onVEChange() {
  var bSel  = document.getElementById('ve-book');
  var chSel = document.getElementById('ve-chap');
  var vsSel = document.getElementById('ve-vs');
  var veSel = document.getElementById('ve-ve');
  var verSel= document.getElementById('ve-ver');
  if (!bSel) return;

  var book = bSel.value;
  var chap = parseInt(chSel.value);
  var vsS  = parseInt(vsSel.value);
  var vsE  = parseInt(veSel.value);
  var ver  = verSel.value;

  /* Si cambia el libro, regenerar capítulos */
  var maxChap = CHAPTER_COUNTS[book] || 150;
  if (chap > maxChap) {
    var newOpts = ''; for (var c = 1; c <= maxChap; c++) newOpts += '<option value="' + c + '"' + (c === 1 ? ' selected' : '') + '>' + c + '</option>';
    chSel.innerHTML = newOpts; chap = 1; vsSel.value = 1; veSel.value = 1; vsS = 1; vsE = 1;
  }

  /* Actualizar referencia en el preview */
  var refDisp = document.getElementById('ve-ref-disp');
  if (refDisp) {
    var rStr = (vsS === vsE) ? (book + ' ' + chap + ':' + vsS) : (book + ' ' + chap + ':' + vsS + '-' + vsE);
    refDisp.textContent = rStr + ' — ' + ver;
  }

  /* Fetch con debounce */
  if (verseEditDebounce) clearTimeout(verseEditDebounce);
  var loading = document.getElementById('ve-loading');
  if (loading) loading.style.display = 'block';
  verseEditDebounce = setTimeout(function() {
    var b2   = document.getElementById('ve-book').value;
    var ch2  = parseInt(document.getElementById('ve-chap').value);
    var vs2  = parseInt(document.getElementById('ve-vs').value);
    var ve2  = parseInt(document.getElementById('ve-ve').value);
    var ver2 = document.getElementById('ve-ver').value;
    var p = (vs2 === ve2) ? fetchVerse(b2, ch2, vs2, ver2) : fetchVerseRange(b2, ch2, vs2, ve2, ver2);
    p.then(function(result) {
      var ld = document.getElementById('ve-loading'); if (ld) ld.style.display = 'none';
      var prev = document.getElementById('ve-text-prev');
      if (prev) prev.textContent = (result && !result.error) ? result.text : ('⚠️ ' + (result ? result.error : 'Error'));
    });
  }, 600);
}

function confirmUpdateVerse() {
  var bSel  = document.getElementById('ve-book');
  var chSel = document.getElementById('ve-chap');
  var vsSel = document.getElementById('ve-vs');
  var veSel = document.getElementById('ve-ve');
  var verSel= document.getElementById('ve-ver');
  if (!bSel || !currentVerseWrapper) return;

  var book = bSel.value, chap = parseInt(chSel.value);
  var vsS  = parseInt(vsSel.value), vsE = parseInt(veSel.value);
  var ver  = verSel.value;

  var btn = document.getElementById('ve-update-btn');
  if (btn) { btn.textContent = '⏳ Actualizando…'; btn.disabled = true; }
  var ld = document.getElementById('ve-loading'); if (ld) ld.style.display = 'block';

  var p = (vsS === vsE) ? fetchVerse(book, chap, vsS, ver) : fetchVerseRange(book, chap, vsS, vsE, ver);
  var wrapperRef = currentVerseWrapper;
  p.then(function(result) {
    var ld2 = document.getElementById('ve-loading'); if (ld2) ld2.style.display = 'none';
    if (result.error) {
      if (btn) { btn.textContent = '✓ Actualizar versículo'; btn.disabled = false; }
      alert(result.error); return;
    }
    var refEl2 = wrapperRef.querySelector('.verse-reference');
    var txtEl2 = wrapperRef.querySelector('.verse-text');
    if (refEl2) refEl2.textContent = result.reference;
    if (txtEl2) txtEl2.textContent = result.text;
    closeVerseEditModal();
    scheduleAutoSave();
  });
}


/* ─────────────────────────────────
   21. LECTOR DE BIBLIA
───────────────────────────────── */
function populateBibleSelectors() {
  var bookSel = document.getElementById('bible-book'); if (!bookSel) return;
  bookSel.innerHTML = '';
  ALL_BOOKS.forEach(function(b) { var o = document.createElement('option'); o.value = b; o.textContent = b; bookSel.appendChild(o); });
  bookSel.value = 'Génesis'; updateChapterOptions();
}
function updateChapterOptions() {
  var chapSel = document.getElementById('bible-chapter'); var bookSel = document.getElementById('bible-book');
  if (!chapSel || !bookSel) return;
  var total = CHAPTER_COUNTS[bookSel.value] || 150; chapSel.innerHTML = '';
  for (var i = 1; i <= total; i++) { var o = document.createElement('option'); o.value = i; o.textContent = i; chapSel.appendChild(o); }
}
function loadChapter() {
  var bookName = document.getElementById('bible-book').value;
  var chapter  = document.getElementById('bible-chapter').value;
  var version  = document.getElementById('bible-version').value;
  var content  = document.getElementById('bible-content'); if (!content) return;
  content.innerHTML = '<p class="empty-msg">⏳ Cargando ' + bookName + ' ' + chapter + ' (' + version + ')…</p>';
  fetchChapter(bookName, chapter, version).then(function(verses) {
    if (!verses) {
      content.innerHTML = '<div style="text-align:center;padding:40px;"><p style="color:#EF4444;margin-bottom:10px;">⚠️ No se pudo cargar este capítulo.</p><p style="color:var(--text2);font-size:12px;">Verificá tu conexión o probá otra versión.</p><button class="accent-btn" onclick="loadChapter()" style="margin-top:12px;">🔄 Reintentar</button></div>';
      return;
    }
    var html = '<h3 class="bible-chapter-title">' + bookName + ' ' + chapter + '<span class="bible-version-badge">' + version + '</span></h3>';
    verses.forEach(function(v) { html += '<p class="bible-verse"><strong class="bible-verse-num">' + v.v + '</strong>' + v.t + '</p>'; });
    content.innerHTML = html;
  });
}
function prevChapter() { var s = document.getElementById('bible-chapter'); if (s && s.selectedIndex > 0) { s.selectedIndex--; loadChapter(); } }
function nextChapter() { var s = document.getElementById('bible-chapter'); if (s && s.selectedIndex < s.options.length-1) { s.selectedIndex++; loadChapter(); } }


/* ─────────────────────────────────
   22. NOTA DE EJEMPLO
───────────────────────────────── */


/* ─────────────────────────────────
   CARPETAS — modal edición ícono/color
───────────────────────────────── */
var FOLDER_ICONS  = ['📁','📂','✝','📖','🙏','⛪','🎵','💡','❤','🔥','⭐','🌿','🕊','📝','🎯','💬','🌱','🏠'];
var FOLDER_COLORS = ['#F59E0B','#EF4444','#3B82F6','#10B981','#8B5CF6','#EC4899','#F97316','#06B6D4','#6B7280','#84CC16'];

function editFolderMeta(folderName) {
  var fd = findFolder(folderName);
  if (!fd) return;
  openFolderEditModal(fd);
}

function openFolderEditModal(fd) {
  var existing = document.getElementById('folder-edit-modal');
  if (existing) existing.remove();
  var modal = document.createElement('div');
  modal.id = 'folder-edit-modal';
  modal.style.cssText = 'position:fixed;inset:0;z-index:9000;background:rgba(0,0,0,0.45);display:flex;align-items:center;justify-content:center;';
  var colorsHtml = FOLDER_COLORS.map(function(c) {
    var sel = (c === (fd.color || '#F59E0B'));
    return '<button class="folder-color-opt" data-color="' + c + '" onclick="selectFolderColor(this)" ' +
      'style="width:26px;height:26px;border-radius:50%;background:' + c + ';border:3px solid ' +
      (sel ? '#fff' : 'transparent') + ';cursor:pointer;box-shadow:0 0 0 2px ' + (sel ? c : 'transparent') + ';transition:transform 0.1s;"></button>';
  }).join('');
  modal.innerHTML =
    '<div style="background:var(--card);border-radius:14px;padding:24px;width:340px;box-shadow:0 8px 40px rgba(0,0,0,0.25);">' +
      '<h3 style="font-size:1rem;font-weight:700;color:var(--text);margin-bottom:16px;">Editar carpeta</h3>' +
      // Preview
      '<div style="display:flex;align-items:center;gap:10px;background:var(--bg2);border-radius:8px;padding:10px 14px;margin-bottom:16px;">' +
        '<span id="preview-icon" style="font-size:1.6rem;color:' + (fd.color||'#F59E0B') + ';">' + (fd.icon||'📁') + '</span>' +
        '<span id="preview-name" style="font-size:14px;font-weight:600;color:var(--text);">' + fd.name + '</span>' +
      '</div>' +
      // Nombre
      '<label style="font-size:11px;font-weight:600;color:var(--text2);text-transform:uppercase;letter-spacing:0.05em;">Nombre</label>' +
      '<input id="folder-edit-name" type="text" value="' + fd.name + '" ' +
        'style="width:100%;padding:8px 10px;border-radius:8px;border:1px solid var(--border);background:var(--bg);color:var(--text);font-size:13px;margin:4px 0 14px;box-sizing:border-box;" />' +
      // Ícono — input libre para escribir cualquier emoji
      '<label style="font-size:11px;font-weight:600;color:var(--text2);text-transform:uppercase;letter-spacing:0.05em;">Ícono (cualquier emoji)</label>' +
      '<div style="display:flex;align-items:center;gap:8px;margin:6px 0 14px;">' +
        '<input id="folder-edit-icon" type="text" value="' + (fd.icon||'📁') + '" maxlength="4" ' +
          'style="width:64px;font-size:1.4rem;text-align:center;padding:6px;border-radius:8px;border:1px solid var(--border);background:var(--bg);color:var(--text);" />' +
        '<span style="font-size:12px;color:var(--text2);">Escribí o pegá cualquier emoji desde tu teclado 🎉</span>' +
      '</div>' +
      // Color
      '<label style="font-size:11px;font-weight:600;color:var(--text2);text-transform:uppercase;letter-spacing:0.05em;">Color</label>' +
      '<div id="folder-color-options" style="display:flex;gap:8px;flex-wrap:wrap;margin:8px 0 20px;">' + colorsHtml + '</div>' +
      // Botones
      '<div style="display:flex;gap:8px;justify-content:flex-end;">' +
        '<button onclick="closeFolderEditModal()" style="padding:7px 16px;border-radius:8px;border:1px solid var(--border);background:none;color:var(--text);cursor:pointer;font-size:13px;">Cancelar</button>' +
        '<button onclick="saveFolderEdit(\'' + fd.name + '\')" style="padding:7px 16px;border-radius:8px;border:none;background:var(--accent);color:#fff;font-weight:600;cursor:pointer;font-size:13px;">Guardar</button>' +
      '</div>' +
    '</div>';
  modal.addEventListener('click', function(e) { if (e.target === modal) closeFolderEditModal(); });
  document.body.appendChild(modal);
  modal._selectedColor = fd.color || '#F59E0B';
  // Preview en tiempo real: nombre
  var nameEl = document.getElementById('folder-edit-name');
  if (nameEl) nameEl.addEventListener('input', function() {
    var pn = document.getElementById('preview-name'); if (pn) pn.textContent = this.value;
  });
  // Preview en tiempo real: ícono
  var iconEl = document.getElementById('folder-edit-icon');
  if (iconEl) iconEl.addEventListener('input', function() {
    var pi = document.getElementById('preview-icon'); if (pi) pi.textContent = this.value || '📁';
  });
}


function selectFolderIcon(btn) {
  var modal = document.getElementById('folder-edit-modal'); if (!modal) return;
  modal._selectedIcon = btn.getAttribute('data-icon');
  modal.querySelectorAll('.icon-opt').forEach(function(b) {
    b.style.borderColor = 'transparent'; b.style.backgroundColor = 'transparent';
  });
  btn.style.borderColor = 'var(--accent)'; btn.style.backgroundColor = 'rgba(245,158,11,0.12)';
  var prev = document.getElementById('preview-icon');
  if (prev) { prev.textContent = modal._selectedIcon; prev.style.color = modal._selectedColor || '#F59E0B'; }
}

function selectFolderColor(btn) {
  var modal = document.getElementById('folder-edit-modal'); if (!modal) return;
  var color = btn.getAttribute('data-color');
  modal._selectedColor = color;
  modal.querySelectorAll('.folder-color-opt').forEach(function(b) {
    b.style.borderColor = 'transparent'; b.style.boxShadow = '0 0 0 2px transparent';
  });
  btn.style.borderColor = '#fff'; btn.style.boxShadow = '0 0 0 2px ' + color;
  var prev = document.getElementById('preview-icon');
  if (prev) prev.style.color = color;
}

function saveFolderEdit(originalName) {
  var modal     = document.getElementById('folder-edit-modal');
  var nameInput = document.getElementById('folder-edit-name');
  var iconInput = document.getElementById('folder-edit-icon');
  if (!modal || !nameInput) return;
  var newName  = nameInput.value.trim();
  var newIcon  = (iconInput && iconInput.value.trim()) ? iconInput.value.trim() : '📁';
  var newColor = modal._selectedColor || '#F59E0B';
  if (!newName) { alert('Escribí un nombre para la carpeta.'); return; }
  var folders = loadFolders();
  if (newName !== originalName) {
    for (var i = 0; i < folders.length; i++) {
      if (folders[i].name === newName) { alert('Ya existe una carpeta con ese nombre.'); return; }
    }
  }
  for (var j = 0; j < folders.length; j++) {
    if (folders[j].name === originalName) {
      folders[j].name = newName; folders[j].icon = newIcon; folders[j].color = newColor; break;
    }
  }
  saveFolders(folders);
  if (newName !== originalName) {
    var notes = loadNotes();
    for (var k = 0; k < notes.length; k++) if (notes[k].folder === originalName) notes[k].folder = newName;
    localStorage.setItem('hn_notes', JSON.stringify(notes));
    if (currentFolder === originalName) currentFolder = newName;
  }
  closeFolderEditModal();
  renderFolderList(); renderSidebarNotes(); populateFolderDropdown('');
}


function closeFolderEditModal() {
  var modal = document.getElementById('folder-edit-modal');
  if (modal) modal.remove();
}


/* ─────────────────────────────────
   MODO PRESENTACIÓN / PANTALLA COMPLETA
───────────────────────────────── */
var presentationActive = false;

function enterPresentation() {
  if (!currentNoteId) return;
  var notes = loadNotes(); var note = null;
  for (var i = 0; i < notes.length; i++) if (notes[i].id === currentNoteId) { note = notes[i]; break; }
  if (!note) return;
  presentationActive = true;
  var existing = document.getElementById('presentation-overlay');
  if (existing) existing.remove();
  var overlay = document.createElement('div');
  overlay.id = 'presentation-overlay';
  overlay.style.cssText = "position:fixed;inset:0;z-index:99000;background:var(--bg);display:flex;flex-direction:column;overflow:hidden;font-family:'DM Sans',sans-serif;";
  var header = document.createElement('div');
  header.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:14px 32px;border-bottom:1px solid var(--border);background:var(--card);flex-shrink:0;';
  header.innerHTML =
    '<div>' +
      '<div id="pres-title" style="font-size:1.1rem;font-weight:700;color:var(--accent);">' + (note.title||'Sin título') + '</div>' +
      '<div id="pres-meta" style="font-size:12px;color:var(--text2);margin-top:2px;">' + [note.speaker,note.date].filter(Boolean).join('  ·  ') + '</div>' +
    '</div>' +
    '<div style="display:flex;align-items:center;gap:12px;">' +
      '<button onclick="presentationNavigate(-1)" style="background:var(--bg2);border:none;border-radius:8px;padding:6px 14px;cursor:pointer;font-size:16px;color:var(--text);">←</button>' +
      '<span id="pres-counter" style="font-size:11px;color:var(--text3);min-width:50px;text-align:center;"></span>' +
      '<button onclick="presentationNavigate(1)" style="background:var(--bg2);border:none;border-radius:8px;padding:6px 14px;cursor:pointer;font-size:16px;color:var(--text);">→</button>' +
      '<button onclick="exitPresentation()" style="background:var(--accent);color:#fff;border:none;border-radius:8px;padding:6px 16px;font-size:13px;font-weight:600;cursor:pointer;">✕ Salir</button>' +
    '</div>';
  var content = document.createElement('div');
  content.id = 'presentation-content';
  content.style.cssText = 'flex:1;overflow-y:auto;padding:40px 10%;font-size:1.1rem;line-height:1.85;color:var(--text);max-width:820px;margin:0 auto;width:100%;';
  content.innerHTML = note.content || '';
  overlay.appendChild(header);
  overlay.appendChild(content);
  document.body.appendChild(overlay);
  var sortedNotes = sortNotes(notes);
  overlay._notes     = sortedNotes;
  overlay._noteIndex = sortedNotes.findIndex ? sortedNotes.findIndex(function(n) { return n.id === currentNoteId; }) : 0;
  for (var j = 0; j < sortedNotes.length; j++) { if (sortedNotes[j].id === currentNoteId) { overlay._noteIndex = j; break; } }
  updatePresentationCounter();
  if (overlay.requestFullscreen) overlay.requestFullscreen().catch(function() {});
}

function updatePresentationCounter() {
  var overlay = document.getElementById('presentation-overlay'); if (!overlay) return;
  var counter = document.getElementById('pres-counter');
  if (counter) counter.textContent = (overlay._noteIndex + 1) + ' / ' + overlay._notes.length;
}

function exitPresentation() {
  presentationActive = false;
  var overlay = document.getElementById('presentation-overlay');
  if (overlay) overlay.remove();
  if (document.exitFullscreen) document.exitFullscreen().catch(function() {});
}

function presentationNavigate(dir) {
  var overlay = document.getElementById('presentation-overlay'); if (!overlay) return;
  var newIdx = overlay._noteIndex + dir;
  if (newIdx < 0 || newIdx >= overlay._notes.length) return;
  overlay._noteIndex = newIdx;
  var note    = overlay._notes[newIdx];
  var content = document.getElementById('presentation-content');
  var title   = document.getElementById('pres-title');
  var meta    = document.getElementById('pres-meta');
  if (content) { content.innerHTML = note.content || ''; content.scrollTop = 0; }
  if (title)   title.textContent = note.title || 'Sin título';
  if (meta)    meta.textContent  = [note.speaker,note.date].filter(Boolean).join('  ·  ');
  updatePresentationCounter();
  currentNoteId = note.id; activeNoteId = note.id;
}

var EXAMPLE_NOTE = {
  id: 'example_001',
  title: 'Guía de Holy Notes — Tutorial',
  date: '2026-03-18', speaker: 'Holy Notes', folder: '',
  tags: ['guía','funciones','bienvenida'], pinned: false,
  content:
    '<h1>Bienvenido/a a Holy Notes</h1>' +
    '<p>Esta nota muestra todo lo que podés hacer. Explorala y borrala cuando quieras.</p>' +
    '<h2>Formatos de texto</h2>' +
    '<p>Podés usar <b>negrita</b>, <i>cursiva</i>, <u>subrayado</u> y <s>tachado</s>.</p>' +
    '<p>Atajos: <b>Ctrl+B</b> negrita  Ctrl+I cursiva  Ctrl+U subrayado  Ctrl+S guardar</p>' +
    '<h2>Encabezados</h2>' +
    '<h1>H1 — Título principal</h1><h2>H2 — Sección</h2><h3>H3 — Subsección</h3>' +
    '<h2>Listas</h2>' +
    '<p>Lista con viñetas (botón •):</p>' +
    '<ul><li>Primer punto</li><li>Segundo punto</li><li>Tercer punto</li></ul>' +
    '<p>Lista numerada (botón 1. o escribir "1." + Espacio al inicio de una línea):</p>' +
    '<ol><li>Introducción</li><li>Desarrollo</li><li>Conclusión</li></ol>' +
    '<h2>Resaltado</h2>' +
    '<p>' +
      '<span style="background-color:#FEF08A;">Amarillo</span>  ' +
      '<span style="background-color:#BBF7D0;">Verde</span>  ' +
      '<span style="background-color:#BAE6FD;">Azul</span>  ' +
      '<span style="background-color:#FBCFE8;">Rosa</span>  ' +
      '<span style="background-color:#FCD34D;">Ambar</span>' +
    '</p>' +
    '<p>Para quitar el resaltado: selecciona el texto y toca el boton <b>0 (cero)</b> de la barra.</p>' +
    '<h2>Versiculos biblicos</h2>' +
    '<p>Escribe <b>/</b> en el editor para ver sugerencias de libros. Luego completa con capitulo:versiculo y version.</p>' +
    '<p>Ejemplos:</p>' +
    '<ul><li>/Juan 3:16 (usa RVR60 por defecto)</li><li>/Filipenses 4:13 NVI</li><li>/Genesis 1:1-5 (rango de versiculos)</li></ul>' +
    '<div class="verse-block-wrapper" style="position:relative;margin:14px 0;">' +
      '<div class="verse-block" contenteditable="false">' +
        '<span class="verse-reference">Filipenses 4:13 — NVI</span>' +
        '<p class="verse-text">Todo lo puedo en Cristo que me fortalece.</p>' +
      '</div>' +
      '<button class="block-delete-btn" title="Eliminar">x</button>' +
    '</div>' +
    '<h2>Carpetas con color e icono</h2>' +
    '<p>Crea carpetas desde el panel izquierdo. Cada carpeta puede tener un icono y un color propios. Para editar, toca el boton de lapiz en cada carpeta.</p>' +
    '<h2>Pin, Eliminar y PDF</h2>' +
    '<p>Toca el 📌 al lado del titulo para anclar la nota al tope. El boton de papelera en cada tarjeta elimina la nota. El boton <b>PDF</b> en el editor exporta la nota completa con formato.</p>' +
    '<h2>Modo presentacion</h2>' +
    '<p>El boton <b>Presentar</b> en el editor abre la nota en pantalla completa para que puedas leerla mientras predicas. Podés navegar entre notas con las flechas.</p>' +
    '<h2>Auto-guardado</h2>' +
    '<p>La nota se guarda sola 3 segundos después de que dejás de escribir. Tambien podés guardar manualmente con Ctrl+S o el boton Guardar.</p>' +
    '<hr/>' +
    '<p style="color:var(--text2);font-size:13px;">Crea tu primera nota con el boton + Nueva nota o el boton flotante en la esquina inferior derecha.</p>',
  createdAt: '2026-03-18T00:00:00.000Z',
  updatedAt: '2026-03-18T00:00:00.000Z'
};


/* ─────────────────────────────────
   23. INICIALIZACIÓN
───────────────────────────────── */
window.onload = function() {

  /* Tema */
  var theme = localStorage.getItem('hn_theme') || 'light';
  document.documentElement.setAttribute('data-theme', theme);
  var tb = document.getElementById('theme-btn');
  if (tb) tb.textContent = theme === 'dark' ? '☀️' : '🌙';

  /* Sidebar visibility */
  if (localStorage.getItem('hn_sidebar_visible') === '0') { sidebarVisible = true; toggleSidebar(); }

  /* Notas recientes: restaurar estado (abierto por defecto) */
  var notesOpen = localStorage.getItem('hn_sidebar_notes_open');
  var cont = document.getElementById('sidebar-notes-container');
  if (notesOpen === '0') {
    sidebarNotesOpen = false;
    if (cont) { cont.style.maxHeight = '0'; cont.style.overflow = 'hidden'; }
    var arr = document.getElementById('sidebar-notes-arrow');
    if (arr) arr.textContent = '▶';
  } else {
    sidebarNotesOpen = true;
    if (cont) { cont.style.maxHeight = '600px'; cont.style.overflow = 'auto'; }
  }

  /* Nota de ejemplo — siempre actualizar */
  var notes = loadNotes(); var exIdx = -1;
  for (var i = 0; i < notes.length; i++) if (notes[i].id === 'example_001') { exIdx = i; break; }
  if (exIdx >= 0) notes[exIdx] = EXAMPLE_NOTE; else notes.unshift(EXAMPLE_NOTE);
  localStorage.setItem('hn_notes', JSON.stringify(notes));

  /* FAB */
  updateFAB();

  /* Slash popup */
  buildSlashPopup();

  /* Eventos del slash input */
  var slashInput = document.getElementById('slash-input');
  if (slashInput) {
    slashInput.addEventListener('input', function() { renderBookList(this.value.replace(/^\//,'').split(/\s+/)[0]); });
    slashInput.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') { hideSlashPopup(); document.getElementById('editor-body').focus(); return; }
      if (e.key === 'Enter') {
        e.preventDefault(); var cmd = this.value.trim(); hideSlashPopup();
        var editor = document.getElementById('editor-body'); editor.focus();
        if (savedRange) { var sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(savedRange); document.execCommand('delete', false, null); }
        document.execCommand('insertHTML', false, '<span id="verse-loading" style="color:var(--text3);font-style:italic;">⏳ Buscando versículo…</span>');
        fetchVerseFromCommand(cmd).then(function(result) {
          var loader = document.getElementById('verse-loading'); if (loader) loader.remove();
          insertVerseBlock(result);
        });
      }
    });
  }

  /* Eventos del editor */
  var editorBody = document.getElementById('editor-body');
  if (editorBody) {
    editorBody.addEventListener('mouseup',   saveSelection);
    editorBody.addEventListener('keyup',     saveSelection);
    editorBody.addEventListener('mousedown', saveSelection);
    editorBody.addEventListener('keypress', function(e) { if (e.key === '/') setTimeout(showSlashPopup, 20); });
    editorBody.addEventListener('keydown', function(e) {
      if ((e.ctrlKey||e.metaKey) && e.key==='s') { e.preventDefault(); saveNote(false); clearAutoSave(); }
      if ((e.ctrlKey||e.metaKey) && e.key==='b') { e.preventDefault(); fmt('bold'); }
      if ((e.ctrlKey||e.metaKey) && e.key==='i') { e.preventDefault(); fmt('italic'); }
      if ((e.ctrlKey||e.metaKey) && e.key==='u') { e.preventDefault(); fmt('underline'); }
      /* AUTO-LISTA NUMERADA: escribir "N." + Espacio al inicio de línea */
      if (e.key === ' ') {
        var sel = window.getSelection();
        if (!sel || !sel.rangeCount) return;
        var range  = sel.getRangeAt(0);
        var node   = range.startContainer;
        var offset = range.startOffset;
        var lineText = '';
        if (node.nodeType === 3) lineText = node.textContent.slice(0, offset);
        else lineText = (node.innerText || node.textContent || '').slice(0, offset);
        var m = lineText.match(/^(\s*)(\d+)\.$/);
        if (m) {
          e.preventDefault();
          var startNum = parseInt(m[2]);
          var deleteRange = document.createRange();
          deleteRange.setStart(node, offset - m[2].length - 1);
          deleteRange.setEnd(node, offset);
          deleteRange.deleteContents();
          sel.removeAllRanges(); sel.addRange(deleteRange);
          document.execCommand('insertOrderedList', false, null);
          if (startNum !== 1) {
            var cur = sel.anchorNode; var par = cur;
            for (var att = 0; att < 8; att++) {
              if (!par) break;
              if (par.tagName && par.tagName.toLowerCase() === 'ol') { par.setAttribute('start', startNum); break; }
              par = par.parentNode;
            }
          }
          saveSelection();
        }
      }
    })
    /* Auto-guardado al escribir */
    editorBody.addEventListener('input', function() { scheduleAutoSave(); });

    /* Event delegation botón × de versículos */
    editorBody.addEventListener('click', function(e) {
      var target = e.target;
      /* ── Delete btn ── */
      for (var i = 0; i < 6; i++) {
        if (!target || target === editorBody) break;
        if (target.classList && target.classList.contains('block-delete-btn')) {
          e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
          var wrapper = target.parentNode;
          if (wrapper && wrapper.parentNode) {
            try {
              var range = document.createRange(); var sel = window.getSelection();
              if (wrapper.previousSibling) range.setStartAfter(wrapper.previousSibling);
              else range.setStart(wrapper.parentNode, 0);
              range.collapse(true); sel.removeAllRanges(); sel.addRange(range);
              savedRange = range.cloneRange();
            } catch(err) {}
            wrapper.remove();
          }
          return false;
        }
        target = target.parentNode;
      }
      /* ── Click en verse-block → editar ── */
      var vt = e.target;
      for (var j = 0; j < 6; j++) {
        if (!vt || vt === editorBody) break;
        if (vt.classList && vt.classList.contains('verse-block')) {
          var vw = vt.parentNode;
          if (vw && vw.classList.contains('verse-block-wrapper')) {
            e.preventDefault(); e.stopPropagation();
            openVerseEditModal(vw);
          }
          return false;
        }
        vt = vt.parentNode;
      }
    }, true);
  }

  /* Toolbar: prevenir robo de foco */
  var toolbarEls = document.querySelectorAll('#editor-toolbar button');
  for (var t = 0; t < toolbarEls.length; t++) {
    toolbarEls[t].addEventListener('mousedown', function(e) { e.preventDefault(); });
  }

  /* Tag input */
  var tagInput = document.getElementById('tag-input');
  if (tagInput) {
    tagInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        var val = this.value.replace(/^#/,'').trim();
        if (val && currentTags.indexOf(val) === -1) { currentTags.push(val); renderTagPills(); }
        this.value = '';
      }
    });
  }

  /* Nueva carpeta con Enter */
  var fi = document.getElementById('new-folder-input');
  if (fi) fi.addEventListener('keydown', function(e) { if (e.key==='Enter') createFolder(); });

  /* Cerrar slash popup al clickear afuera */
  document.addEventListener('mousedown', function(e) {
    var popup = document.getElementById('slash-popup');
    if (popup && popup.style.display !== 'none') {
      if (!popup.contains(e.target) && e.target.id !== 'editor-body') hideSlashPopup();
    }
  });

  /* Restaurar estado de carpetas (abiertas por defecto la primera vez) */
  var foldersOpenState = localStorage.getItem('hn_folders_open');
  if (foldersOpenState === null || foldersOpenState === '1') {
    folderListOpen = false; // toggleFolderList invierte, así que arrancamos en false
    toggleFolderList();     // esto lo pone en true (abierto)
  }

  /* Papelera — limpiar notas vencidas */
  cleanupTrash();
  var trashOpenState = localStorage.getItem('hn_trash_open');
  if (trashOpenState === '1') { trashOpen = false; toggleTrash(); }
  renderTrashSection();

  /* Renderizado inicial */
  populateBibleSelectors();
  renderFolderList();
  populateFolderDropdown('');
  renderNotesList(null);
  renderSidebarNotes(null);
  showTab('notas');
};
