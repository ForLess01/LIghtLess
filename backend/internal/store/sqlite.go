package store

import (
	"context"
	"database/sql"
	"fmt"

	_ "modernc.org/sqlite"

	"lightless/internal/domain"
)

type Store struct {
	db *sql.DB
}

func Open(path string) (*Store, error) {
	db, err := sql.Open("sqlite", path)
	if err != nil {
		return nil, err
	}
	db.SetMaxOpenConns(1)
	if _, err := db.Exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;`); err != nil {
		return nil, fmt.Errorf("pragma: %w", err)
	}
	return &Store{db: db}, nil
}

func (s *Store) Close() error { return s.db.Close() }

func (s *Store) Migrate() error {
	_, err := s.db.Exec(`
		CREATE TABLE IF NOT EXISTS events (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			command_id TEXT,
			device_id TEXT NOT NULL,
			event_type TEXT NOT NULL,
			payload TEXT NOT NULL,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP
		);
		CREATE INDEX IF NOT EXISTS idx_events_device ON events(device_id, created_at DESC);
		CREATE INDEX IF NOT EXISTS idx_events_command ON events(command_id);
	`)
	return err
}

func (s *Store) InsertEvent(ctx context.Context, ev domain.Event) (int64, error) {
	res, err := s.db.ExecContext(ctx,
		`INSERT INTO events (command_id, device_id, event_type, payload) VALUES (?, ?, ?, ?)`,
		nullableString(ev.CommandID), ev.DeviceID, ev.EventType, ev.Payload,
	)
	if err != nil {
		return 0, fmt.Errorf("insert event: %w", err)
	}
	return res.LastInsertId()
}

func (s *Store) ListEvents(ctx context.Context, deviceID string, limit int) ([]domain.Event, error) {
	if limit <= 0 || limit > 500 {
		limit = 50
	}
	rows, err := s.db.QueryContext(ctx,
		`SELECT id, COALESCE(command_id, ''), device_id, event_type, payload, created_at
		 FROM events WHERE device_id = ? ORDER BY created_at DESC LIMIT ?`,
		deviceID, limit,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var events []domain.Event
	for rows.Next() {
		var e domain.Event
		if err := rows.Scan(&e.ID, &e.CommandID, &e.DeviceID, &e.EventType, &e.Payload, &e.CreatedAt); err != nil {
			return nil, err
		}
		events = append(events, e)
	}
	return events, rows.Err()
}

func nullableString(s string) sql.NullString {
	if s == "" {
		return sql.NullString{Valid: false}
	}
	return sql.NullString{String: s, Valid: true}
}
