-- Migration: Füge eine Spalte für die manuelle Zuteilung von Messdienern zu Sonntagen hinzu
-- Tabelle: sundays

alter table sundays add column assigned_ministrants text[];

-- Optional: Initialisiere alle bestehenden Sonntage mit leeren Zuteilungen
update sundays set assigned_ministrants = ARRAY[]::text[] where assigned_ministrants is null;
