package ai

import (
	"testing"
	"time"
)

func fixedTime(t *testing.T, s string) time.Time {
	t.Helper()
	tm, err := time.Parse("15:04", s)
	if err != nil {
		t.Fatalf("invalid time: %v", err)
	}
	now := time.Now()
	return time.Date(now.Year(), now.Month(), now.Day(), tm.Hour(), tm.Minute(), 0, 0, time.Local)
}

func TestScheduleCommand_TurnOn12PM(t *testing.T) {
	// "enciende a las 12pm" when it's 11am → should schedule ON at 12:00
	now := time.Now().In(time.Local)
	target := time.Date(now.Year(), now.Month(), now.Day(), 12, 0, 0, 0, time.Local)
	if target.Before(now) {
		target = target.Add(24 * time.Hour)
	}
	expectedDelay := int(target.Sub(now).Milliseconds())

	action, err := ParseScheduleCommand("enciende a las 12pm", time.Local)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if action == nil {
		t.Fatal("expected action, got nil")
	}
	if action.Action != "pattern" {
		t.Fatalf("expected pattern, got %s", action.Action)
	}
	if len(action.Steps) != 2 {
		t.Fatalf("expected 2 steps, got %d", len(action.Steps))
	}
	// First step: OFF for delay
	if action.Steps[0].State != false {
		t.Error("expected first step OFF")
	}
	// Delay should be close to expected
	delta := action.Steps[0].Duration - expectedDelay
	if delta < -2000 || delta > 2000 { // allow 2s tolerance
		t.Errorf("delay: got %dms, expected ~%dms (delta=%dms)", action.Steps[0].Duration, expectedDelay, delta)
	}
	// Second step: ON forever
	if action.Steps[1].State != true {
		t.Error("expected second step ON")
	}
	if action.Steps[1].Duration != 0 {
		t.Errorf("expected d:0 (stay forever), got d:%d", action.Steps[1].Duration)
	}
}

func TestScheduleCommand_TurnOff3AM(t *testing.T) {
	action, err := ParseScheduleCommand("apaga a las 3am", time.Local)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if action == nil {
		t.Fatal("expected action, got nil")
	}
	if action.Steps[0].State != true {
		t.Error("expected first step ON (staying on until scheduled off)")
	}
	if action.Steps[1].State != false {
		t.Error("expected second step OFF (stay off forever)")
	}
	if action.Steps[1].Duration != 0 {
		t.Errorf("expected d:0, got d:%d", action.Steps[1].Duration)
	}
}

func TestScheduleCommand_TurnOn3_30PM(t *testing.T) {
	action, err := ParseScheduleCommand("enciende a las 3:30pm", time.Local)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if action == nil {
		t.Fatal("expected action, got nil")
	}
	// Should turn ON (not OFF)
	if action.Steps[1].State != true {
		t.Error("expected second step ON")
	}
	if action.Steps[1].Duration != 0 {
		t.Errorf("expected d:0, got d:%d", action.Steps[1].Duration)
	}
	// First step should be a delay (OFF)
	if action.Steps[0].State != false {
		t.Error("expected first step OFF")
	}
}

func TestScheduleCommand_NoMatch(t *testing.T) {
	// Commands without absolute time should return nil
	action, err := ParseScheduleCommand("enciende", time.Local)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if action != nil {
		t.Errorf("expected nil for non-time command, got %+v", action)
	}
}

func TestScheduleCommand_NoMatchRelative(t *testing.T) {
	action, err := ParseScheduleCommand("enciende en 5 segundos", time.Local)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if action != nil {
		t.Errorf("expected nil for relative time command, got %+v", action)
	}
}

func TestScheduleCommand_EnglishAt(t *testing.T) {
	action, err := ParseScheduleCommand("turn on at 8pm", time.Local)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if action == nil {
		t.Fatal("expected action, got nil")
	}
	if action.Steps[1].State != true {
		t.Error("expected ON at end")
	}
}

func TestScheduleCommand_TurnOffEnglish(t *testing.T) {
	action, err := ParseScheduleCommand("turn off at 10pm", time.Local)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if action == nil {
		t.Fatal("expected action, got nil")
	}
	if action.Steps[1].State != false {
		t.Error("expected OFF at end")
	}
}