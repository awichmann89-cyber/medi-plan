
import * as React from 'react';
import { AppBar, Toolbar, Typography, Button, Container, Box, Paper, Tabs, Tab } from '@mui/material';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import PeopleIcon from '@mui/icons-material/People';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';

import { TextField, Checkbox, FormControlLabel, FormGroup, Alert, Snackbar, Autocomplete, Stack, IconButton, List, ListItem, ListItemText } from '@mui/material';
import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import jsPDF from 'jspdf';

function formatDateGerman(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('de-DE', { weekday: 'long', year: 'numeric', month: '2-digit', day: '2-digit' });
}

function PublicView() {
  const [name, setName] = useState('');
  const [selected, setSelected] = useState([]);
  const [success, setSuccess] = useState(false);
  const [sundays, setSundays] = useState([]);
  const [ministrants, setMinistrants] = useState([]);

  useEffect(() => {
    supabase.from('sundays').select('*').order('date', { ascending: true })
      .then(({ data, error }) => {
        if (!error) setSundays(data || []);
      });
    supabase.from('ministrants').select('name').order('name', { ascending: true })
      .then(({ data, error }) => {
        if (!error) setMinistrants(data ? data.map(m => m.name) : []);
      });
  }, []);

  const handleToggle = (date) => {
    setSelected((prev) =>
      prev.includes(date) ? prev.filter((d) => d !== date) : [...prev, date]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name) return;
    // Messdiener ggf. anlegen
    if (!ministrants.includes(name)) {
      await supabase.from('ministrants').insert({ name });
    }
    if (selected.length > 0) {
      await supabase.from('absences').insert({
        name,
        sundays: selected,
        created_at: new Date().toISOString(),
      });
    }
    setSuccess(true);
    setName('');
    setSelected([]);
  };

  // Checkbox "Ich kann an allen Sonntagen"
  const allSelected = sundays.length > 0 && selected.length === 0;
  const handleAllToggle = () => {
    if (selected.length === 0) {
      // Wenn keine ausgewählt, dann mindestens einen Sonntag vorauswählen (z.B. den nächsten)
      if (sundays.length > 0) {
        setSelected([sundays[0].date]);
      }
    } else {
      // Wenn welche ausgewählt, dann alle abwählen (d.h. ich kann an allen Sonntagen)
      setSelected([]);
    }
  };

  return (
    <Paper sx={{ p: 3, mt: 4 }}>
      <Typography variant="h5" gutterBottom>
        Messdiener Abmeldung
      </Typography>
      <form onSubmit={handleSubmit}>
        <Autocomplete
          freeSolo
          options={ministrants}
          value={name}
          onInputChange={(_, v) => setName(v)}
          renderInput={(params) => (
            <TextField {...params} label="Name" required fullWidth sx={{ mb: 2 }} />
          )}
        />
        <Typography variant="subtitle1" sx={{ mb: 1 }}>
          An welchen der folgenden Tage können wir dich definitiv <b>nicht</b> einsetzen?
        </Typography>
        <FormGroup>
          <FormControlLabel
            control={<Checkbox checked={selected.length === 0} onChange={handleAllToggle} />}
            label="Ich kann theoretisch an allen Terminen (d.h. keine Abmeldung)"
          />
          {sundays.length === 0 && <Typography color="text.secondary">Keine Sonntage hinterlegt.</Typography>}
          {sundays.map(s => (
            <FormControlLabel
              key={s.id}
              control={<Checkbox checked={selected.includes(s.date)} onChange={() => handleToggle(s.date)} />}
              label={
                <span>
                  {formatDateGerman(s.date)}
                  {s.time ? `, ${s.time}` : ''}
                  {s.type ? <><br /><span style={{ color: '#666', fontSize: '0.95em' }}>{s.type}</span></> : ''}
                </span>
              }
              disabled={selected.length === 0}
            />
          ))}
        </FormGroup>
        <Button type="submit" variant="contained" color="primary" sx={{ mt: 2 }} disabled={!name}>
          Abschicken
        </Button>
      </form>
      <Snackbar open={success} autoHideDuration={3000} onClose={() => setSuccess(false)}>
        <Alert severity="success" sx={{ width: '100%' }}>
          Abmeldung gespeichert!
        </Alert>
      </Snackbar>
    </Paper>
  );
}


// Komponente für Messdiener-Übersicht und Anlegen
function MinistrantList() {
  const [ministrants, setMinistrants] = useState([]);
  const [newName, setNewName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    supabase.from('ministrants').select('*').order('name', { ascending: true })
      .then(({ data, error }) => { if (!error) setMinistrants(data || []); });
  }, [success]);

  const handleAdd = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    if (!newName.trim()) return setErrorMsg('Name angeben!');
    const { error: insertError } = await supabase.from('ministrants').insert({ name: newName.trim() });
    if (insertError) setErrorMsg(insertError.message);
    else {
      setSuccess(true);
      setNewName('');
      setTimeout(() => setSuccess(false), 2000);
    }
  };

  return (
    <Paper sx={{ p: 2, mt: 4 }}>
      <Typography variant="h6" gutterBottom>Messdiener verwalten</Typography>
      <form onSubmit={handleAdd} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 16 }}>
        <TextField
          label="Name"
          value={newName}
          onChange={e => setNewName(e.target.value)}
          required
        />
        <IconButton type="submit" color="primary" sx={{ height: 56 }}>
          <AddIcon />
        </IconButton>
      </form>
  {errorMsg && <Alert severity="error" sx={{ mb: 2 }}>{errorMsg}</Alert>}
      <Snackbar open={success} autoHideDuration={2000} onClose={() => setSuccess(false)}>
        <Alert severity="success" sx={{ width: '100%' }}>
          Messdiener hinzugefügt!
        </Alert>
      </Snackbar>
      <List>
        {ministrants.map(m => (
          <ListItem key={m.id} secondaryAction={
            <IconButton edge="end" aria-label="Löschen" color="error" onClick={async () => {
              if (window.confirm('Diesen Messdiener wirklich löschen?')) {
                await supabase.from('ministrants').delete().eq('id', m.id);
                // Nach Löschen Liste neu laden
                const { data: newMinistrants, error } = await supabase.from('ministrants').select('*').order('name', { ascending: true });
                if (!error && Array.isArray(newMinistrants)) setMinistrants(newMinistrants);
              }
            }}>
              <DeleteOutlineIcon />
            </IconButton>
          }>
            <ListItemText primary={m.name} />
          </ListItem>
        ))}
      </List>

    </Paper>
  );
}


function fairAssignment(sundays, ministrants, absences) {
  const count = {};
  ministrants.forEach(m => count[m.name] = 0);

  const abMap = {};
  absences.forEach(a => abMap[a.name] = new Set(a.sundays));

  const plan = {};
  let startIndex = 0;

  sundays.forEach(s => {
    const needed = s.required_ministrants;

    // verfügbare Ministranten
    let available = ministrants.filter(
      m => !abMap[m.name]?.has(s.date)
    );

    // Sortierung nach Einsätzen
    available.sort((a, b) => count[a.name] - count[b.name]);

    // zyklische Rotation
    const rotated = [
      ...available.slice(startIndex),
      ...available.slice(0, startIndex)
    ];

    const assigned = rotated.slice(0, needed).map(m => m.name);

    assigned.forEach(n => count[n]++);
    plan[s.date] = assigned;

    // Startpunkt weiterschieben
    startIndex = (startIndex + needed) % available.length;
  });

  return plan;
}

function AdminView() {
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [type, setType] = useState('');
  const [required, setRequired] = useState(2);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [sundays, setSundays] = useState([]);
  const [ministrants, setMinistrants] = useState([]);
  const [absences, setAbsences] = useState([]);

  // Lade Sonntage, Messdiener, Abmeldungen aus Supabase
  useEffect(() => {
    supabase.from('sundays').select('*').order('date', { ascending: true })
      .then(({ data, error }) => { if (!error) setSundays(data || []); });
    supabase.from('ministrants').select('*').order('name', { ascending: true })
      .then(({ data, error }) => { if (!error) setMinistrants(data || []); });
    supabase.from('absences').select('*')
      .then(({ data, error }) => { if (!error) setAbsences(data || []); });
  }, [success]);

  const handleAddSunday = async (e) => {
    e.preventDefault();
    setError('');
    if (!date) return setError('Datum angeben!');
    const { error } = await supabase.from('sundays').insert({ date, time, type, required_ministrants: required });
    if (error) setError(error.message);
    else {
      setSuccess(true);
      setDate('');
      setTime('');
      setType('');
      setRequired(2);
      setTimeout(() => setSuccess(false), 2000);
    }
  };

  // PDF-Export: Nutze assigned_ministrants, falls vorhanden
  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Messdienerplan', 10, 15);
    let y = 25;
    sundays.forEach(s => {
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      let line = formatDateGerman(s.date);
      if (s.time) line += `, ${s.time}`;
      doc.text(line + ':', 10, y);
      doc.setFont(undefined, 'normal');
      if (s.type) {
        y += 6;
        doc.setTextColor(0, 32, 128); // dunkelblau
        doc.text(s.type, 10, y);
        doc.setTextColor(0, 0, 0); // zurück zu schwarz
      }
      // Anzahl benötigte Messdiener in grau und kleiner Schrift
      y += 5;
      doc.setFontSize(10);
      doc.setTextColor(120, 120, 120); // grau
      doc.text(`Benötigte Messdiener: ${s.required_ministrants}`, 10, y);
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0); // zurück zu schwarz
      y += 5;
      // Nutze assigned_ministrants, sonst Algorithmus
      const names = (Array.isArray(s.assigned_ministrants) && s.assigned_ministrants.length > 0)
        ? s.assigned_ministrants
        : (fairAssignment([s], ministrants, absences)[s.date] || []);
      if (names.length) {
        doc.text(names.join(', '), 20, y);
      } else {
        doc.setTextColor(220, 0, 0); // rot
        doc.text('Keine Zuteilung möglich', 20, y);
        doc.setTextColor(0, 0, 0); // zurück zu schwarz
      }
      y += 15;
      if (y > 270) { doc.addPage(); y = 15; }
    });
    doc.save('messdienerplan.pdf');
  };

  // State für die Zuteilung pro Sonntag
  const [assignments, setAssignments] = useState({});
  const [saveMsg, setSaveMsg] = useState('');
  useEffect(() => {
    // Initialisiere assignments aus DB (assigned_ministrants oder fairAssignment)
    if (sundays.length && ministrants.length) {
      const initial = {};
      sundays.forEach(s => {
        initial[s.id] = Array.isArray(s.assigned_ministrants) && s.assigned_ministrants.length > 0
          ? [...s.assigned_ministrants]
          : (fairAssignment([s], ministrants, absences)[s.date] || []);
      });
      setAssignments(initial);
    }
  }, [sundays, ministrants, absences]);

  // Handler für Mehrfachauswahl
  const handleAssignmentChange = (sid, value) => {
    setAssignments(a => ({ ...a, [sid]: value }));
  };

  // Auto-Zuweisung für alle Sonntage
  const handleAutoAssign = () => {
    const plan = fairAssignment(sundays, ministrants, absences);
    const next = {};
    sundays.forEach(s => { next[s.id] = plan[s.date] || []; });
    setAssignments(next);
  };

  // Speichern in Supabase
  const handleSave = async () => {
    setSaveMsg('');
    let ok = true;
    for (const s of sundays) {
      const { error } = await supabase.from('sundays').update({ assigned_ministrants: assignments[s.id] || [] }).eq('id', s.id);
      if (error) ok = false;
    }
    // Nach Speichern Sonntage neu laden
    const { data: newSundays, error: loadError } = await supabase.from('sundays').select('*').order('date', { ascending: true });
    if (!loadError && Array.isArray(newSundays)) setSundays(newSundays);
    setSaveMsg(ok ? 'Plan gespeichert!' : 'Fehler beim Speichern!');
    setTimeout(() => setSaveMsg(''), 2000);
  };

  return (
    <>
      <Paper sx={{ p: 3 }}>
  <form onSubmit={handleAddSunday} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
          <TextField
            label="Datum"
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            required
            sx={{ minWidth: 140 }}
          />
          <TextField
            label="Uhrzeit"
            type="time"
            value={time}
            onChange={e => setTime(e.target.value)}
            InputLabelProps={{ shrink: true }}
            required
            sx={{ minWidth: 120 }}
          />
          <TextField
            label="Typ"
            value={type}
            onChange={e => setType(e.target.value)}
            placeholder="z.B. Gottesdienst"
            required
            sx={{ minWidth: 180 }}
          />
          <TextField
            label="Messdiener benötigt"
            type="number"
            value={required}
            onChange={e => setRequired(Number(e.target.value))}
            inputProps={{ min: 1, max: 10 }}
            required
            sx={{ minWidth: 100 }}
          />
          <IconButton type="submit" color="primary" sx={{ height: 56 }}>
            <AddIcon />
          </IconButton>
        </form>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Snackbar open={success} autoHideDuration={2000} onClose={() => setSuccess(false)}>
          <Alert severity="success" sx={{ width: '100%' }}>
            Sonntag hinzugefügt!
          </Alert>
        </Snackbar>
        <Typography variant="h6" sx={{ mt: 2 }}>Alle Sonntage</Typography>
        <List>
          {sundays.map(s => (
            <ListItem key={s.id} alignItems="flex-start" sx={{ flexDirection: 'column', alignItems: 'stretch' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, justifyContent: 'space-between' }}>
                <ListItemText
                  primary={formatDateGerman(s.date) + (s.time ? `, ${s.time}` : '')}
                  secondary={
                    (s.type ? s.type + ' · ' : '') + `Benötigte Messdiener: ${s.required_ministrants}`
                  }
                />
                <IconButton aria-label="Löschen" color="error" onClick={async () => {
                  if (window.confirm('Diesen Sonntag wirklich löschen?')) {
                    await supabase.from('sundays').delete().eq('id', s.id);
                    // Nach Löschen Sonntage neu laden
                    const { data: newSundays, error: loadError } = await supabase.from('sundays').select('*').order('date', { ascending: true });
                    if (!loadError && Array.isArray(newSundays)) setSundays(newSundays);
                  }
                }}>
                  <DeleteOutlineIcon />
                </IconButton>
              </Box>
              <Autocomplete
                multiple
                options={
                  ministrants
                    .map(m => m.name || m)
                    .filter(name => {
                      // Finde alle abgemeldeten Namen für diesen Sonntag
                      const abgemeldet = absences.filter(a => a.sundays && a.sundays.includes(s.date)).map(a => a.name);
                      // Bereits zugewiesene Messdiener dürfen immer ausgewählt bleiben
                      const assigned = assignments[s.id] || [];
                      return !abgemeldet.includes(name) || assigned.includes(name);
                    })
                }
                value={assignments[s.id] || []}
                onChange={(_, v) => handleAssignmentChange(s.id, v)}
                renderInput={params => <TextField {...params} label="Zugewiesene Messdiener" variant="outlined" sx={{ mb: 1 }} />}
                sx={{ mb: 1 }}
              />
            </ListItem>
          ))}
        </List>
        <Stack direction="row" spacing={2} sx={{ mt: 2, mb: 2, justifyContent: 'flex-start' }}>
          <Button variant="contained" onClick={handleAutoAssign}>Auto-Zuweisung</Button>
          <Button variant="contained" color="success" onClick={handleSave}>Speichern</Button>
          {saveMsg && <Alert severity={saveMsg.includes('Fehler') ? 'error' : 'success'} sx={{ ml: 2 }}>{saveMsg}</Alert>}
        </Stack>
        <Button variant="outlined" startIcon={<PictureAsPdfIcon />} onClick={handleExportPDF} sx={{ mt: 2 }}>
          Messdienerplan als PDF
        </Button>
      </Paper>
      <MinistrantList />
    </>
  );
}


function App() {
  const [tab, setTab] = React.useState(0);
  const [adminAuth, setAdminAuth] = React.useState(false);
  const [pw, setPw] = React.useState('');
  const [pwError, setPwError] = React.useState('');
  const [showPwChange, setShowPwChange] = React.useState(false);
  const [oldPw, setOldPw] = React.useState('');
  const [newPw, setNewPw] = React.useState('');
  const [newPw2, setNewPw2] = React.useState('');
  const [pwChangeMsg, setPwChangeMsg] = React.useState('');
  // Passwort im LocalStorage speichern
  const getAdminPw = () => localStorage.getItem('admin_pw') || 'kirche2025';
  const setAdminPw = (val) => localStorage.setItem('admin_pw', val);

  const handleAdminLogin = (e) => {
    e.preventDefault();
    if (pw === getAdminPw()) {
      setAdminAuth(true);
      setPw('');
      setPwError('');
    } else {
      setPwError('Falsches Passwort');
    }
  };

  const handlePwChange = (e) => {
    e.preventDefault();
    setPwChangeMsg('');
    if (oldPw !== getAdminPw()) {
      setPwChangeMsg('Altes Passwort stimmt nicht!');
      return;
    }
    if (!newPw || newPw.length < 6) {
      setPwChangeMsg('Neues Passwort zu kurz!');
      return;
    }
    if (newPw !== newPw2) {
      setPwChangeMsg('Neue Passwörter stimmen nicht überein!');
      return;
    }
    setAdminPw(newPw);
    setPwChangeMsg('Passwort erfolgreich geändert!');
    setOldPw(''); setNewPw(''); setNewPw2('');
    setTimeout(() => setShowPwChange(false), 1500);
  };

  return (
    <Box sx={{ flexGrow: 1, minHeight: '100vh', bgcolor: '#f5f5f5' }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Messdiener-Plan
          </Typography>
          <Tabs value={tab} onChange={(_, v) => setTab(v)} textColor="inherit" indicatorColor="secondary">
            <Tab icon={<PeopleIcon />} label="Öffentlich" />
            <Tab icon={<AdminPanelSettingsIcon />} label="Admin" />
          </Tabs>
        </Toolbar>
      </AppBar>
      <Container maxWidth="sm">
        {tab === 0 ? <PublicView /> : (
          adminAuth ? (
            <>
              <Button variant="outlined" sx={{ mt: 2, mb: 1 }} onClick={() => setShowPwChange(v => !v)}>
                {showPwChange ? 'Passwort ändern ausblenden' : 'Admin-Passwort ändern'}
              </Button>
              {showPwChange && (
                <Paper sx={{ p: 3, mb: 2 }}>
                  <Typography variant="h6" gutterBottom>Admin-Passwort ändern</Typography>
                  <form onSubmit={handlePwChange}>
                    <TextField
                      label="Altes Passwort"
                      type="password"
                      value={oldPw}
                      onChange={e => setOldPw(e.target.value)}
                      fullWidth sx={{ mb: 2 }}
                    />
                    <TextField
                      label="Neues Passwort"
                      type="password"
                      value={newPw}
                      onChange={e => setNewPw(e.target.value)}
                      fullWidth sx={{ mb: 2 }}
                    />
                    <TextField
                      label="Neues Passwort wiederholen"
                      type="password"
                      value={newPw2}
                      onChange={e => setNewPw2(e.target.value)}
                      fullWidth sx={{ mb: 2 }}
                    />
                    {pwChangeMsg && <Alert severity={pwChangeMsg.includes('erfolgreich') ? 'success' : 'error'} sx={{ mb: 2 }}>{pwChangeMsg}</Alert>}
                    <Button type="submit" variant="contained" color="primary">Passwort ändern</Button>
                  </form>
                </Paper>
              )}
              <AdminView />
            </>
          ) : (
            <Paper sx={{ p: 3, mt: 4 }}>
              <Typography variant="h6" gutterBottom>Admin Login</Typography>
              <form onSubmit={handleAdminLogin}>
                <TextField
                  label="Passwort"
                  type="password"
                  value={pw}
                  onChange={e => setPw(e.target.value)}
                  error={!!pwError}
                  helperText={pwError}
                  fullWidth
                  sx={{ mb: 2 }}
                  autoFocus
                />
                <Button type="submit" variant="contained" color="primary">Login</Button>
              </form>
            </Paper>
          )
        )}
      </Container>
    </Box>
  );
}

export default App;
