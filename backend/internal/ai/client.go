package ai

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
)

// Client wraps the Kimi K2.5 (Moonshot) API for LightLess.
type Client struct {
	apiKey     string
	baseURL    string
	model      string
	httpClient *http.Client
}

// New creates a new AI client.
func New(apiKey, model string) *Client {
	if model == "" {
		model = "moonshot-v1-8k"
	}
	return &Client{
		apiKey:     apiKey,
		baseURL:    "https://api.moonshot.ai/v1/chat/completions",
		model:      model,
		httpClient: &http.Client{},
	}
}

// CommandAction represents a parsed action from the AI.
type CommandAction struct {
	Action   string        `json:"action"`    // "set_state", "blink", or "pattern"
	Value    bool          `json:"value"`     // for set_state
	Count    int           `json:"count"`      // for blink
	Interval int           `json:"interval"`   // for blink: ms
	Steps    []PatternStep `json:"steps"`      // for pattern
}

// PatternStep represents one step in a light pattern.
type PatternStep struct {
	State    bool `json:"s"` // true = ON, false = OFF
	Duration int  `json:"d"` // milliseconds
}

const systemPrompt = `You control a smart LED light called "foco-sala". The user speaks in Spanish or English. You MUST output EXACTLY ONE JSON action object. No explanation. No markdown. Just JSON.

You have THREE action types:

1. set_state — Simple ON or OFF:
{"action":"set_state","value":true}   → turn ON permanently
{"action":"set_state","value":false}  → turn OFF permanently

2. blink — Simple repeating blink:
{"action":"blink","count":3,"interval":500}
count = number of blinks, interval = ms between toggles. LED ends OFF.

3. pattern — FULL CONTROL over timing and state. This is your MOST POWERFUL tool.
Each step has "s" (true=ON, false=OFF) and "d" (duration in milliseconds).
Use "d":0 to mean "stay in this state forever" (LED holds permanently).

PATTERN RULES — READ CAREFULLY:
- After a pattern ends, the LED HOLDS the last step's state. It does NOT auto-turn-off.
- "d":0 means "stay in this state forever" — use it when the user wants the LED to remain ON/OFF after a delay or sequence.
- ALL timed patterns that should END must explicitly include an OFF step at the end.
- ALL patterns where the user wants the LED to STAY ON must end with {"s":true,"d":0}.

EXAMPLES — STUDY THESE:

Simple ON/OFF:
"enciende" → {"action":"set_state","value":true}
"apaga" → {"action":"set_state","value":false}
"turn on" → {"action":"set_state","value":true}
"turn off" → {"action":"set_state","value":false}

Timed ON then OFF (LED turns off at end):
"enciende por 5 segundos" → {"action":"pattern","steps":[{"s":true,"d":5000},{"s":false,"d":100}]}
"turn on for 10 seconds" → {"action":"pattern","steps":[{"s":true,"d":10000},{"s":false,"d":100}]}
"mantenlo encendido 4 segundos y apagalo" → {"action":"pattern","steps":[{"s":true,"d":4000},{"s":false,"d":100}]}

Delayed ON (LED stays ON after delay — use d:0):
"enciende en 5 segundos" → {"action":"pattern","steps":[{"s":false,"d":5000},{"s":true,"d":0}]}
"enciende dentro de 3 segundos" → {"action":"pattern","steps":[{"s":false,"d":3000},{"s":true,"d":0}]}
"turn on in 5 seconds" → {"action":"pattern","steps":[{"s":false,"d":5000},{"s":true,"d":0}]}
"prende en 10 segundos" → {"action":"pattern","steps":[{"s":false,"d":10000},{"s":true,"d":0}]}

Delayed OFF (LED stays OFF after delay):
"apaga en 5 segundos" → {"action":"pattern","steps":[{"s":true,"d":5000},{"s":false,"d":0}]}

Blinking for a duration (LED turns off at end):
"parpadea rápido por 4 segundos" → {"action":"pattern","steps":[{"s":true,"d":100},{"s":false,"d":100},{"s":true,"d":100},{"s":false,"d":100},{"s":true,"d":100},{"s":false,"d":100},{"s":true,"d":100},{"s":false,"d":100},{"s":true,"d":100},{"s":false,"d":100},{"s":true,"d":100},{"s":false,"d":100},{"s":true,"d":100},{"s":false,"d":100},{"s":true,"d":100},{"s":false,"d":100},{"s":true,"d":100},{"s":false,"d":100},{"s":true,"d":100},{"s":false,"d":1000}]}
"destella por 3 segundos" → {"action":"pattern","steps":[{"s":true,"d":150},{"s":false,"d":150},{"s":true,"d":150},{"s":false,"d":150},{"s":true,"d":150},{"s":false,"d":150},{"s":true,"d":150},{"s":false,"d":150},{"s":true,"d":150},{"s":false,"d":150},{"s":true,"d":150},{"s":false,"d":150},{"s":true,"d":150},{"s":false,"d":150},{"s":true,"d":150},{"s":false,"d":1000}]}
"blink fast for 4 seconds" → same rapid pattern totaling ~4000ms ending OFF
"blink slow for 5 seconds" → {"action":"pattern","steps":[{"s":true,"d":500},{"s":false,"d":500},{"s":true,"d":500},{"s":false,"d":500},{"s":true,"d":500},{"s":false,"d":500},{"s":true,"d":500},{"s":false,"d":500},{"s":true,"d":500},{"s":false,"d":500}]}

Simple blink count (LED ends OFF):
"parpadea 3 veces" → {"action":"blink","count":3,"interval":500}
"blink 5 times" → {"action":"blink","count":5,"interval":500}

Special patterns (LED ends OFF):
"SOS" → {"action":"pattern","steps":[{"s":true,"d":150},{"s":false,"d":150},{"s":true,"d":150},{"s":false,"d":150},{"s":true,"d":150},{"s":false,"d":400},{"s":true,"d":400},{"s":false,"d":150},{"s":true,"d":400},{"s":false,"d":150},{"s":true,"d":400},{"s":false,"d":400},{"s":true,"d":150},{"s":false,"d":150},{"s":true,"d":150},{"s":false,"d":150},{"s":true,"d":150},{"s":false,"d":100}]}
"latido"/"corazón" → {"action":"pattern","steps":[{"s":true,"d":150},{"s":false,"d":100},{"s":true,"d":300},{"s":false,"d":500},{"s":true,"d":150},{"s":false,"d":100},{"s":true,"d":300},{"s":false,"d":100}]}
"fiesta"/"disco"/"strobe" → {"action":"pattern","steps":[{"s":true,"d":80},{"s":false,"d":80},{"s":true,"d":80},{"s":false,"d":80},{"s":true,"d":80},{"s":false,"d":80},{"s":true,"d":80},{"s":false,"d":80},{"s":true,"d":80},{"s":false,"d":80},{"s":true,"d":80},{"s":false,"d":80},{"s":true,"d":80},{"s":false,"d":80},{"s":true,"d":80},{"s":false,"d":100}]}
"pulso" → {"action":"pattern","steps":[{"s":true,"d":200},{"s":false,"d":100}]}

CRITICAL: ALWAYS respond with ONLY the JSON object. No text, no explanation.`

// ParseCommand sends user text to the AI and returns a structured action.
func (c *Client) ParseCommand(text string) (*CommandAction, error) {
	reqBody := map[string]any{
		"model": c.model,
		"messages": []map[string]any{
			{"role": "system", "content": systemPrompt},
			{"role": "user", "content": text},
		},
		"temperature": 0.05,
		"max_tokens":  500,
	}

	body, _ := json.Marshal(reqBody)

	req, err := http.NewRequest("POST", c.baseURL, bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("creating request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+c.apiKey)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("ai request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		respBody, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("ai returned %d: %s", resp.StatusCode, string(respBody))
	}

	var result struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("ai response parse error: %w", err)
	}

	if len(result.Choices) == 0 {
		return nil, fmt.Errorf("no choices in ai response")
	}

	textResp := result.Choices[0].Message.Content

	// Clean up markdown code fences
	start := 0
	end := len(textResp)
	if idx := bytes.Index([]byte(textResp), []byte("```json")); idx != -1 {
		start = idx + 7
	}
	if idx := bytes.LastIndex([]byte(textResp), []byte("```")); idx != -1 && idx > start {
		end = idx
	}
	cleanJSON := textResp[start:end]
	cleanBytes := bytes.TrimSpace([]byte(cleanJSON))

	var action CommandAction
	if err := json.Unmarshal(cleanBytes, &action); err != nil {
		// Retry with simpler prompt
		return c.retryParse(text)
	}

	// Validate action
	if action.Action != "set_state" && action.Action != "blink" && action.Action != "pattern" {
		return c.retryParse(text)
	}

	// Defaults and validation
	switch action.Action {
	case "blink":
		if action.Count <= 0 {
			action.Count = 3
		}
		if action.Count > 20 {
			action.Count = 20
		}
		if action.Interval <= 0 {
			action.Interval = 500
		}
	case "pattern":
		if len(action.Steps) == 0 {
			return nil, fmt.Errorf("pattern action requires steps")
		}
		if len(action.Steps) > 64 {
			action.Steps = action.Steps[:64]
		}
	}

	return &action, nil
}

// retryParse uses a simpler prompt when the first attempt fails.
func (c *Client) retryParse(text string) (*CommandAction, error) {
	simplePrompt := `You control a smart LED. Respond with ONLY a JSON object. No explanation.

For ON: {"action":"set_state","value":true}
For OFF: {"action":"set_state","value":false}
For timed ON then OFF: {"action":"pattern","steps":[{"s":true,"d":MILLISECONDS_ON},{"s":false,"d":100}]}
For delayed ON (stay on): {"action":"pattern","steps":[{"s":false,"d":MILLISECONDS_DELAY},{"s":true,"d":0}]}
For delayed OFF: {"action":"pattern","steps":[{"s":true,"d":MILLISECONDS_DELAY},{"s":false,"d":0}]}
For blink N times: {"action":"blink","count":N,"interval":500}
For blink N seconds then OFF: {"action":"pattern","steps":[repeat {"s":true,"d":MS},{"s":false,"d":MS} for N seconds, then {"s":false,"d":1000}]}

IMPORTANT: "d":0 means stay in that state forever. Use it for "enciende en X segundos" type commands.

User said: "` + text + `"`

	reqBody := map[string]any{
		"model": c.model,
		"messages": []map[string]any{
			{"role": "system", "content": simplePrompt},
		},
		"temperature": 0.0,
		"max_tokens":  500,
	}

	body, _ := json.Marshal(reqBody)

	req, err := http.NewRequest("POST", c.baseURL, bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("creating retry request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+c.apiKey)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("ai retry request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		respBody, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("ai retry returned %d: %s", resp.StatusCode, string(respBody))
	}

	var result struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("ai retry parse error: %w", err)
	}

	if len(result.Choices) == 0 {
		return nil, fmt.Errorf("no choices in ai retry response")
	}

	textResp := result.Choices[0].Message.Content

	start := 0
	end := len(textResp)
	if idx := bytes.Index([]byte(textResp), []byte("```json")); idx != -1 {
		start = idx + 7
	}
	if idx := bytes.LastIndex([]byte(textResp), []byte("```")); idx != -1 && idx > start {
		end = idx
	}
	cleanJSON := textResp[start:end]
	cleanBytes := bytes.TrimSpace([]byte(cleanJSON))

	var action CommandAction
	if err := json.Unmarshal(cleanBytes, &action); err != nil {
		return nil, fmt.Errorf("could not understand command: %q", string(cleanBytes))
	}

	if action.Action != "set_state" && action.Action != "blink" && action.Action != "pattern" {
		return nil, fmt.Errorf("could not understand command, action: %s", action.Action)
	}

	// Defaults
	switch action.Action {
	case "blink":
		if action.Count <= 0 {
			action.Count = 3
		}
		if action.Count > 20 {
			action.Count = 20
		}
		if action.Interval <= 0 {
			action.Interval = 500
		}
	case "pattern":
		if len(action.Steps) == 0 {
			return nil, fmt.Errorf("pattern requires steps")
		}
		if len(action.Steps) > 64 {
			action.Steps = action.Steps[:64]
		}
	}

	return &action, nil
}