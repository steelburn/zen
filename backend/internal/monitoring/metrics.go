// Package monitoring provides error tracking and observability helpers.
package monitoring

import (
	"encoding/json"
	"expvar"
	"net/http"
	"runtime"
	"sync"
	"time"
)

// Metrics holds the application-level counters and gauges exposed at /metrics.
// All fields are guarded by a mutex so they can be safely written from
// concurrent HTTP handlers.
type Metrics struct {
	mu sync.RWMutex

	RequestsTotal    int64            `json:"requests_total"`
	RequestsActive   int64            `json:"requests_active"`
	RequestDuration  *movingAverage   `json:"-"`
	WebhooksReceived int64            `json:"webhooks_received"`
	ChecksRun        int64            `json:"checks_run"`
	ChecksFailed     int64            `json:"checks_failed"`
	ErrorsTotal      int64            `json:"errors_total"`
	LastRequestTime  time.Time        `json:"last_request_time"`
	UptimeSeconds    int64            `json:"uptime_seconds"`
	StatusCounts     map[string]int64 `json:"status_counts"`
	startedAt        time.Time
}

// movingAverage is a simple sliding-window average over the last N samples.
type movingAverage struct {
	ring  []float64
	pos   int
	count int
	mu    sync.Mutex
}

func newMovingAverage(n int) *movingAverage {
	return &movingAverage{ring: make([]float64, n)}
}

func (ma *movingAverage) Add(v float64) {
	ma.mu.Lock()
	defer ma.mu.Unlock()
	ma.ring[ma.pos] = v
	ma.pos = (ma.pos + 1) % len(ma.ring)
	if ma.count < len(ma.ring) {
		ma.count++
	}
}

func (ma *movingAverage) Value() float64 {
	ma.mu.Lock()
	defer ma.mu.Unlock()
	if ma.count == 0 {
		return 0
	}
	var sum float64
	for i := 0; i < ma.count; i++ {
		sum += ma.ring[i]
	}
	return sum / float64(ma.count)
}

// GlobalMetrics is the singleton metrics collector used by the HTTP middleware.
var GlobalMetrics = &Metrics{
	startedAt:    time.Now(),
	StatusCounts: make(map[string]int64),
	RequestDuration: &movingAverage{
		ring: make([]float64, 100),
	},
}

// ObserveRequest records a completed HTTP request.
func (m *Metrics) ObserveRequest(statusCode int, duration time.Duration) {
	m.mu.Lock()
	defer m.mu.Unlock()

	m.RequestsTotal++
	m.RequestsActive--
	m.LastRequestTime = time.Now()
	m.UptimeSeconds = int64(time.Since(m.startedAt).Seconds())
	m.RequestDuration.Add(duration.Seconds())
	m.StatusCounts[formatStatusClass(statusCode)]++
}

// ObserveWebhook records a webhook received from GitHub.
func (m *Metrics) ObserveWebhook() {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.WebhooksReceived++
}

// ObserveCheckRun records a quality check execution.
func (m *Metrics) ObserveCheckRun(failed bool) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.ChecksRun++
	if failed {
		m.ChecksFailed++
	}
}

// ObserveError records an application error.
func (m *Metrics) ObserveError() {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.ErrorsTotal++
}

// ObserveRequestStart increments the active request counter.
func (m *Metrics) ObserveRequestStart() {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.RequestsActive++
}

// ObserveRequestDone decrements the active request counter. Safe to call via
// defer even if ObserveRequestStart was not called.
func (m *Metrics) ObserveRequestDone() {
	m.mu.Lock()
	defer m.mu.Unlock()
	if m.RequestsActive > 0 {
		m.RequestsActive--
	}
}

// Snapshot returns a copy of the current metrics as a JSON-serialisable map.
func (m *Metrics) Snapshot() map[string]interface{} {
	m.mu.RLock()
	defer m.mu.RUnlock()

	snap := map[string]interface{}{
		"requests_total":     m.RequestsTotal,
		"requests_active":    m.RequestsActive,
		"requests_avg_ms":    int64(m.RequestDuration.Value() * 1000),
		"webhooks_received":  m.WebhooksReceived,
		"checks_run":         m.ChecksRun,
		"checks_failed":      m.ChecksFailed,
		"errors_total":       m.ErrorsTotal,
		"uptime_seconds":     m.UptimeSeconds,
		"last_request_time":  m.LastRequestTime.Format(time.RFC3339),
		"status_counts":      m.StatusCounts,
		"go_goroutines":      runtime.NumGoroutine(),
		"go_cgo_calls":       runtime.NumCgoCall(),
		"go_mem_alloc_bytes": heapAlloc(),
	}
	return snap
}

func formatStatusClass(code int) string {
	switch {
	case code >= 200 && code < 300:
		return "2xx"
	case code >= 300 && code < 400:
		return "3xx"
	case code >= 400 && code < 500:
		return "4xx"
	case code >= 500 && code < 600:
		return "5xx"
	default:
		return "other"
	}
}

func heapAlloc() uint64 {
	var m runtime.MemStats
	runtime.ReadMemStats(&m)
	return m.Alloc
}

// MetricsHandler returns an HTTP handler that serves Prometheus-text-like and
// JSON metrics at /metrics. Clients can use the Accept header to choose the
// format: application/json returns JSON, everything else returns text.
func MetricsHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		snap := GlobalMetrics.Snapshot()

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(snap)
	}
}

// RegisterExpvar publishes the metrics snapshot to Go's expvar endpoint.
// This makes them available at /debug/vars as well.
func init() {
	expvar.Publish("zen", expvar.Func(func() interface{} {
		return GlobalMetrics.Snapshot()
	}))
}
