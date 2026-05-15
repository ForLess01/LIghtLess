package ai

import (
	"fmt"
	"regexp"
	"strconv"
	"strings"
	"time"
)

// ParseScheduleCommand detects absolute time references in user text
// and converts them to a pattern with the correct delay.
// Returns nil if the text doesn't contain an absolute time reference.
func ParseScheduleCommand(text string, loc *time.Location) (*CommandAction, error) {
	parsed, isOn, ok := extractTimeFromText(text, loc)
	if !ok {
		return nil, nil
	}

	now := time.Now().In(loc)
	delay := parsed.Sub(now)

	// If the time is in the past, assume tomorrow
	if delay < 0 {
		delay += 24 * time.Hour
	}

	// Cap at 24 hours
	if delay > 24*time.Hour {
		return nil, fmt.Errorf("schedule too far in the future (max 24h)")
	}

	delayMs := int(delay.Milliseconds())

	if isOn {
		// Turn ON at the scheduled time, stay on
		return &CommandAction{
			Action: "pattern",
			Steps: []PatternStep{
				{State: false, Duration: delayMs},
				{State: true, Duration: 0}, // stay on forever
			},
		}, nil
	}

	// Turn OFF at the scheduled time, stay off
	return &CommandAction{
		Action: "pattern",
		Steps: []PatternStep{
			{State: true, Duration: delayMs},
			{State: false, Duration: 0}, // stay off forever
		},
	}, nil
}

// extractTimeFromText parses absolute time references from natural language.
// Returns the target time, whether it's an "on" or "off" action, and whether it matched.
func extractTimeFromText(text string, loc *time.Location) (time.Time, bool, bool) {
	lower := strings.ToLower(strings.TrimSpace(text))

	// Determine if turn-on or turn-off
	isOn := true
	if strings.Contains(lower, "apaga") || strings.Contains(lower, "apag") || strings.Contains(lower, "off") || strings.Contains(lower, "turn off") || strings.Contains(lower, "apág") {
		isOn = false
	}

	// Patterns to match, ordered by specificity
	type pattern struct {
		regex string
		hour  func(matches []string) (int, int, bool) // returns (hour, minute, ok)
	}

	patterns := []pattern{
		// "a las 12:00pm", "a las 12:30 am", "a las 3:45pm"
		{
			regex: `a\s+las\s+(\d{1,2}):(\d{2})\s*(am|pm|a\.m\.|p\.m\.)`,
			hour: func(m []string) (int, int, bool) {
				h, _ := strconv.Atoi(m[0])
				min, _ := strconv.Atoi(m[1])
				period := strings.ReplaceAll(strings.ToLower(m[2]), ".", "")
				return adjustHour(h, min, period)
			},
		},
		// "a las 12pm", "a las 3 am", "a las 12:00"
		{
			regex: `a\s+las\s+(\d{1,2}):(\d{2})\b`,
			hour: func(m []string) (int, int, bool) {
				h, _ := strconv.Atoi(m[0])
				min, _ := strconv.Atoi(m[1])
				return h, min, true
			},
		},
		// "a las 12 pm", "a las 3am", "12pm"
		{
			regex: `a\s+las\s+(\d{1,2})\s*(am|pm|a\.m\.|p\.m\.)`,
			hour: func(m []string) (int, int, bool) {
				h, _ := strconv.Atoi(m[0])
				period := strings.ReplaceAll(strings.ToLower(m[1]), ".", "")
				return adjustHour(h, 0, period)
			},
		},
		// "a las 12", "a las 3"
		{
			regex: `a\s+las\s+(\d{1,2})\b`,
			hour: func(m []string) (int, int, bool) {
				h, _ := strconv.Atoi(m[0])
				// Assume 24h if >= 13, otherwise assume pm if before noon
				return h, 0, true
			},
		},
		// "at 12:00pm", "at 3:30 am" (English)
		{
			regex: `at\s+(\d{1,2}):(\d{2})\s*(am|pm)`,
			hour: func(m []string) (int, int, bool) {
				h, _ := strconv.Atoi(m[0])
				min, _ := strconv.Atoi(m[1])
				return adjustHour(h, min, m[2])
			},
		},
		// "at 12pm", "at 3 am" (English)
		{
			regex: `at\s+(\d{1,2})\s*(am|pm)`,
			hour: func(m []string) (int, int, bool) {
				h, _ := strconv.Atoi(m[0])
				return adjustHour(h, 0, m[1])
			},
		},
	}

	now := time.Now().In(loc)

	for _, p := range patterns {
		re := regexp.MustCompile(p.regex)
		matches := re.FindStringSubmatch(lower)
		if len(matches) > 1 {
			// Extract just the capture groups (skip full match)
			captures := matches[1:]
			h, min, ok := p.hour(captures)
			if !ok {
				continue
			}

			// Build target time for today
			target := time.Date(now.Year(), now.Month(), now.Day(), h, min, 0, 0, loc)

			// If target is in the past, move to tomorrow
			if target.Before(now) {
				target = target.Add(24 * time.Hour)
			}

			return target, isOn, true
		}
	}

	return time.Time{}, false, false
}

// adjustHour converts 12h format with am/pm to 24h format.
func adjustHour(h, min int, period string) (int, int, bool) {
	switch period {
	case "am":
		if h == 12 {
			return 0, min, true // 12am = 00:00
		}
		if h > 12 {
			return 0, 0, false
		}
		return h, min, true
	case "pm":
		if h == 12 {
			return 12, min, true // 12pm = 12:00
		}
		if h > 12 {
			return 0, 0, false
		}
		return h + 12, min, true
	default:
		// No am/pm specified — 24h format or assume by context
		if h > 23 {
			return 0, 0, false
		}
		return h, min, true
	}
}