/* ==========================================================================
   srs.js — Spaced repetition scheduler (SM-2 family, Anki-style)

   Ratings: 1 = Again, 2 = Hard, 3 = Good, 4 = Easy
   States : new -> learning -> review  (a failed review -> relearning -> review)
   ========================================================================== */

const MIN = 60 * 1000;
const DAY = 24 * 60 * MIN;

const SRS = {
  config: {
    learningSteps:      [1, 10],   // minutes
    relearningSteps:    [10],      // minutes
    graduatingInterval: 1,         // days, after finishing learning steps
    easyInterval:       4,         // days, when "Easy" is used on a new card
    startingEase:       2.5,
    minEase:            1.3,
    easyBonus:          1.3,
    hardFactor:         1.2,
    lapseFactor:        0.5,       // interval multiplier after a lapse
    maxInterval:        365 * 5,   // days
    fuzz:               0.05       // +/- 5 % randomisation to avoid clumping
  },

  /* A brand new, never-seen card. */
  newState() {
    return {
      state: 'new',
      due: Date.now(),
      interval: 0,                 // days
      ease: SRS.config.startingEase,
      step: 0,
      reps: 0,
      lapses: 0,
      lastReview: null
    };
  },

  isDue(srs, now) {
    now = now || Date.now();
    return (srs.due || 0) <= now;
  },

  /* Apply a rating and return the updated scheduling state. */
  answer(srs, rating, now) {
    now = now || Date.now();
    const c = SRS.config;
    const s = Object.assign({}, srs);
    const lastReview = srs.lastReview;          /* before we overwrite it below */
    s.reps = (s.reps || 0) + 1;
    s.lastReview = now;

    if (s.state === 'new' || s.state === 'learning') {
      if (rating === 1) {
        s.state = 'learning'; s.step = 0;
        s.due = now + c.learningSteps[0] * MIN;
      } else if (rating === 2) {
        s.state = 'learning';
        s.step = Math.max(0, s.step || 0);
        s.due = now + (c.learningSteps[s.step] || c.learningSteps[0]) * MIN;
      } else if (rating === 3) {
        const next = (s.state === 'new' ? 1 : (s.step || 0) + 1);
        if (next >= c.learningSteps.length) {
          s.state = 'review'; s.step = 0;
          s.interval = c.graduatingInterval;
          s.due = now + SRS._fuzz(s.interval) * DAY;
        } else {
          s.state = 'learning'; s.step = next;
          s.due = now + c.learningSteps[next] * MIN;
        }
      } else {
        s.state = 'review'; s.step = 0;
        s.interval = c.easyInterval;
        s.due = now + SRS._fuzz(s.interval) * DAY;
      }
      return s;
    }

    if (s.state === 'relearning') {
      if (rating === 1) {
        s.step = 0;
        s.due = now + c.relearningSteps[0] * MIN;
      } else {
        s.state = 'review';
        s.interval = Math.max(1, s.interval || 1);
        if (rating === 4) s.interval = Math.max(s.interval, 2);
        s.due = now + SRS._fuzz(s.interval) * DAY;
        s.step = 0;
      }
      return s;
    }

    /* --- review --- */
    const prev = Math.max(1, s.interval || 1);

    /* How much of the scheduled wait actually happened. Answering a card early
       — which studying ahead makes easy — proves far less than answering it on
       the day it was due, so the interval grows in proportion. Without this a
       handful of taps in one sitting could push a card to months. */
    const elapsedDays = lastReview ? (now - lastReview) / DAY : prev;
    const earned = Math.max(0, Math.min(1, prev > 0 ? elapsedDays / prev : 1));
    const grow = (factor) => SRS._cap(prev * (1 + (factor - 1) * earned));

    if (rating === 1) {
      s.lapses = (s.lapses || 0) + 1;
      s.ease = Math.max(c.minEase, s.ease - 0.2);
      s.interval = Math.max(1, Math.round(prev * c.lapseFactor));
      s.state = 'relearning'; s.step = 0;
      s.due = now + c.relearningSteps[0] * MIN;
      return s;
    }
    if (rating === 2) {
      s.ease = Math.max(c.minEase, s.ease - 0.15);
      s.interval = grow(c.hardFactor);
    } else if (rating === 3) {
      s.interval = grow(s.ease);
    } else {
      s.ease = s.ease + 0.15;
      s.interval = grow(s.ease * c.easyBonus);
    }
    s.due = now + SRS._fuzz(s.interval) * DAY;
    return s;
  },

  /* What each button would do — shown on the rating row. */
  preview(srs) {
    const out = {};
    [1, 2, 3, 4].forEach(r => {
      const next = SRS.answer(srs, r, Date.now());
      out[r] = SRS.humanDelay(next.due - Date.now());
    });
    return out;
  },

  _cap(days) {
    return Math.min(SRS.config.maxInterval, Math.max(1, Math.round(days)));
  },

  _fuzz(days) {
    if (days < 2) return days;
    const f = SRS.config.fuzz;
    return days * (1 + (Math.random() * 2 - 1) * f);
  },

  /* Compact form for the rating buttons: "10m", "3d", "5mo" — never "1.4mo". */
  humanDelay(ms) {
    if (ms <= 0) return 'now';
    const m = ms / MIN;
    if (m < 60) return Math.max(1, Math.round(m)) + 'm';
    const h = m / 60;
    if (h < 24) return Math.round(h) + 'h';
    const d = h / 24;
    if (d < 60) return Math.round(d) + 'd';
    const mo = d / 30.44;
    if (mo < 24) return Math.round(mo) + 'mo';
    return Math.round(d / 365) + 'y';
  },

  /* Long form for lists, where a plain number of days reads better than a
     fraction of a month. */
  humanDays(ms) {
    if (ms <= 0) return 'due now';
    const d = ms / DAY;
    if (d < 1) {
      const h = Math.round(ms / (60 * MIN));
      return h < 1 ? 'in under an hour' : 'in ' + h + ' hour' + (h === 1 ? '' : 's');
    }
    const days = Math.round(d);
    return 'in ' + days + ' day' + (days === 1 ? '' : 's');
  },

  /* How well a card is known — used for stats and colour coding.
     new -> learning -> familiar -> mastered */
  bucket(srs) {
    if (srs.state === 'new') return 'new';
    if (srs.state === 'learning' || srs.state === 'relearning') return 'learning';
    if ((srs.interval || 0) >= 21) return 'mastered';
    return 'familiar';
  },

  /* Rough "how well do I know this" score, 0..1 — used for progress bars. */
  strength(srs) {
    if (srs.state === 'new') return 0;
    const i = srs.interval || 0;
    if (i <= 0) return 0.05;
    return Math.min(1, Math.log(1 + i) / Math.log(1 + 60));
  }
};

if (typeof module !== 'undefined') module.exports = SRS;
