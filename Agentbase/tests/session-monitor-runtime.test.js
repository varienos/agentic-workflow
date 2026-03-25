'use strict';

/**
 * session-monitor-runtime.test.js — TUI runtime davranislari
 * handleKey, cleanup, watcher, state gecisleri
 *
 * Bu testler module.exports seam'i uzerinden calisir,
 * source-string patch gerektirmez.
 */

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const monitor = require('../bin/session-monitor.js');

// Her test oncesi state sifirla
beforeEach(() => {
  monitor.resetState();
});

// ─────────────────────────────────────────────────────
// handleKey — KLAVYE GIRIS TESTLERI
// ─────────────────────────────────────────────────────

describe('handleKey — gorunum gecisleri', () => {
  it('Tab ile timeline → radar gecisi', () => {
    assert.equal(monitor.getState().viewMode, 'timeline');
    monitor.handleKey('\t');
    assert.equal(monitor.getState().viewMode, 'radar');
  });

  it('Tab ile radar → timeline gecisi', () => {
    monitor.setState({ viewMode: 'radar' });
    monitor.handleKey('\t');
    assert.equal(monitor.getState().viewMode, 'timeline');
  });

  it('Tab detailView ve showHelp sifirliyor', () => {
    monitor.setState({ detailView: true, showHelp: true });
    monitor.handleKey('\t');
    assert.equal(monitor.getState().detailView, false);
    assert.equal(monitor.getState().showHelp, false);
  });
});

describe('handleKey — detail ve help gecisleri', () => {
  it('Esc detailView kapatir', () => {
    monitor.setState({ detailView: true });
    monitor.handleKey('\x1b');
    assert.equal(monitor.getState().detailView, false);
  });

  it('Esc showHelp kapatir', () => {
    monitor.setState({ showHelp: true });
    monitor.handleKey('\x1b');
    assert.equal(monitor.getState().showHelp, false);
  });

  it('Esc ikisi de false iken hicbir sey degistirmez', () => {
    monitor.handleKey('\x1b');
    assert.equal(monitor.getState().detailView, false);
    assert.equal(monitor.getState().showHelp, false);
  });

  it('h ile showHelp toggle', () => {
    monitor.handleKey('h');
    assert.equal(monitor.getState().showHelp, true);
    monitor.handleKey('h');
    assert.equal(monitor.getState().showHelp, false);
  });

  it('c ile showClosed toggle', () => {
    assert.equal(monitor.getState().showClosed, true);
    monitor.handleKey('c');
    assert.equal(monitor.getState().showClosed, false);
    monitor.handleKey('c');
    assert.equal(monitor.getState().showClosed, true);
  });

  it('c detailView sifirliyor', () => {
    monitor.setState({ detailView: true });
    monitor.handleKey('c');
    assert.equal(monitor.getState().detailView, false);
  });

  it('h detailView sifirliyor', () => {
    monitor.setState({ detailView: true });
    monitor.handleKey('h');
    assert.equal(monitor.getState().detailView, false);
  });
});

describe('handleKey — navigasyon', () => {
  it('j ile selectDelta(1) — detailView kapatilir', () => {
    monitor.setState({ detailView: true });
    monitor.handleKey('j');
    assert.equal(monitor.getState().detailView, false);
  });

  it('k ile selectDelta(-1) — detailView kapatilir', () => {
    monitor.setState({ detailView: true });
    monitor.handleKey('k');
    assert.equal(monitor.getState().detailView, false);
  });

  it('ok asagi ile selectDelta(1)', () => {
    monitor.setState({ detailView: true });
    monitor.handleKey('\x1b[B');
    assert.equal(monitor.getState().detailView, false);
  });

  it('ok yukari ile selectDelta(-1)', () => {
    monitor.setState({ detailView: true });
    monitor.handleKey('\x1b[A');
    assert.equal(monitor.getState().detailView, false);
  });
});

describe('handleKey — bilinmeyen tus', () => {
  it('bilinmeyen tus state degistirmez', () => {
    const before = { ...monitor.getState() };
    monitor.handleKey('x');
    assert.deepEqual(monitor.getState(), before);
  });
});

// ─────────────────────────────────────────────────────
// cleanup — IDEMPOTENCY
// ─────────────────────────────────────────────────────

describe('cleanup idempotency', () => {
  it('ilk cleanup cleanedUp=true yapar', () => {
    monitor.resetState();
    monitor.cleanup();
    assert.equal(monitor.getState().cleanedUp, true);
  });

  it('ikinci cleanup hata firlatmaz', () => {
    monitor.resetState();
    monitor.cleanup();
    monitor.cleanup(); // ikinci cagri — idempotent
    assert.equal(monitor.getState().cleanedUp, true);
  });
});

// ─────────────────────────────────────────────────────
// getState / setState / resetState
// ─────────────────────────────────────────────────────

describe('state yonetimi', () => {
  it('resetState tum alanlari varsayilana dondurur', () => {
    monitor.setState({ viewMode: 'radar', detailView: true, showHelp: true, showClosed: false });
    monitor.resetState();
    const s = monitor.getState();
    assert.equal(s.viewMode, 'timeline');
    assert.equal(s.detailView, false);
    assert.equal(s.showHelp, false);
    assert.equal(s.showClosed, true);
    assert.equal(s.selectedIndex, 0);
    assert.equal(s.selectedId, null);
    assert.equal(s.cleanedUp, false);
  });

  it('setState parcali guncelleme yapar', () => {
    monitor.setState({ viewMode: 'radar' });
    assert.equal(monitor.getState().viewMode, 'radar');
    assert.equal(monitor.getState().detailView, false); // diger alanlar degismedi
  });
});
