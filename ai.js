/* ==========================================================================
   ai.js — optional AI assistance

   Everything in the app works without AI. When a key is supplied, the AI can
   fill in card fields, invent fresh practice questions and mark free writing.

   Three provider shapes are supported:
     openai     — api.openai.com  (paid, very cheap with a mini model)
     compatible — any OpenAI-compatible endpoint: OpenRouter, Groq, Together,
                  DeepSeek, LM Studio or Ollama running on your own machine
     gemini     — Google AI Studio (has a free tier)

   The key never leaves this computer except in the request to the provider
   you chose. It is stored in your browser, not on any server.
   ========================================================================== */

const AI = {
  get cfg() { return Store.state.settings.ai; },

  available() {
    const c = this.cfg;
    if (!c.enabled) return false;
    if (c.provider === 'compatible' && /localhost|127\.0\.0\.1/.test(c.baseUrl)) return true;
    return !!c.apiKey;
  },

  /* ---------- transport ---------------------------------------------------- */
  async chat(messages, opts) {
    opts = opts || {};
    const c = this.cfg;
    if (!this.available()) throw new Error('AI is switched off. Turn it on in Settings → AI assistant.');

    /* A model that has already needed room once will need it every time. Asking
       for it up front turns two requests back into one — which matters when the
       free allowance is counted in requests per day. */
    if (!opts._retried && c.roomFor && c.roomFor === (c.model || '')) {
      opts = Object.assign({}, opts, { maxTokens: Math.max((opts.maxTokens || 900) * 4, 4000) });
    }

    let url, headers = { 'Content-Type': 'application/json' }, body;

    if (c.provider === 'gemini') {
      const model = c.model || 'gemini-2.0-flash';
      url = 'https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(model) +
            ':generateContent?key=' + encodeURIComponent(c.apiKey);
      const sys = messages.filter(m => m.role === 'system').map(m => m.content).join('\n\n');
      body = {
        contents: messages.filter(m => m.role !== 'system')
          .map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
        generationConfig: {
          temperature: opts.temperature != null ? opts.temperature : 0.6,
          maxOutputTokens: opts.maxTokens || 900,
          responseMimeType: opts.json ? 'application/json' : 'text/plain'
        }
      };
      if (sys) body.systemInstruction = { parts: [{ text: sys }] };
    } else {
      const base = (c.baseUrl || 'https://api.openai.com/v1').replace(/\/+$/, '');
      url = base + '/chat/completions';
      if (c.apiKey) headers['Authorization'] = 'Bearer ' + c.apiKey;
      body = {
        model: c.model || 'gpt-4o-mini',
        messages: messages,
        temperature: opts.temperature != null ? opts.temperature : 0.6,
        max_tokens: opts.maxTokens || 900
      };
      if (opts.json) body.response_format = { type: 'json_object' };
    }

    Store.countAIRequest();

    let res;
    try {
      res = await fetch(url, { method: 'POST', headers: headers, body: JSON.stringify(body) });
    } catch (e) {
      throw new Error('Could not reach the AI provider. Check your internet connection, the base URL, ' +
                      'and — if you opened this file directly — try serving the folder over http (see the README).');
    }

    if (!res.ok) {
      let detail = '';
      try { const j = await res.json(); detail = (j.error && (j.error.message || j.error.status)) || ''; } catch (e) {}
      if (res.status === 401 || res.status === 403) throw new Error('The API key was rejected (' + res.status + '). ' + detail);
      if (res.status === 429) {
        /* The wait Google suggests is a backoff hint, not the end of the
           allowance: a daily cap does not come back in a minute, however long
           the message says to wait. */
        const secs = /retry in ([\d.]+)s/i.exec(detail);
        const limit = /limit:\s*(\d+)/i.exec(detail);
        throw new Error('Out of quota (429).' +
          (limit ? ' Your limit is ' + limit[1] + ' requests.' : '') +
          (secs ? ' It suggests waiting ' + Math.ceil(parseFloat(secs[1])) + 's,' : ' ') +
          ' but if that was the per-day allowance, waiting will not help — check ' +
          'ai.dev/rate-limit to see which one ran out. ' + detail);
      }
      if (res.status === 404) throw new Error('Model "' + (this.cfg.model) + '" was not found at this endpoint. ' + detail);
      throw new Error('AI request failed (' + res.status + '). ' + detail);
    }

    const data = await res.json();

    let text, finish;
    if (c.provider === 'gemini') {
      const cand = (data.candidates || [])[0] || {};
      finish = cand.finishReason || (data.promptFeedback && data.promptFeedback.blockReason) || '';
      const parts = cand.content && cand.content.parts;
      text = (parts || []).map(p => p.text || '').join('').trim();
    } else {
      const choice = (data.choices || [])[0] || {};
      finish = choice.finish_reason || '';
      text = ((choice.message && choice.message.content) || '').trim();
    }

    /* An empty answer used to be handed back as though it were one. It never
       is: something stopped the model before it wrote anything, and the reason
       is in the response. The usual cause is a reasoning model spending its
       whole output budget on thinking, so that case is retried once with room
       rather than reported as a puzzle. */
    if (!text) {
      const ranOut = /MAX_TOKENS|length/i.test(finish);
      if (ranOut && !opts._retried) {
        const out = await this.chat(messages, Object.assign({}, opts, {
          maxTokens: Math.max((opts.maxTokens || 900) * 4, 4000), _retried: true
        }));
        /* Remember, so the next call starts wide and costs one request. */
        if (out && c.roomFor !== (c.model || '')) {
          c.roomFor = c.model || '';
          Store.save();
        }
        return out;
      }
      if (ranOut) throw new Error(
        'The model used its whole output budget before writing anything. Reasoning models do ' +
        'this — try a "flash" or "mini" variant, or a model that does not think first.');
      if (/SAFETY|BLOCK|RECITATION/i.test(finish)) throw new Error(
        'The provider blocked this request (' + finish + ').');
      throw new Error('The provider answered with no text' + (finish ? ' (' + finish + ')' : '') + '.');
    }
    return text;
  },

  async json(messages, opts) {
    const raw = await this.chat(messages, Object.assign({ json: true }, opts || {}));
    return parseLooseJSON(raw);
  },

  /* Ask the provider what it actually offers. Model names are retired without
     warning — a list fetched from the endpoint beats one written down here. */
  async listModels() {
    const c = this.cfg;

    if (c.provider === 'gemini') {
      /* The list is paginated, and a page token has to be followed or only the
         first handful ever arrives — which looked like "the provider only has
         one model". */
      const base = 'https://generativelanguage.googleapis.com/v1beta/models?key=' +
        encodeURIComponent(c.apiKey) + '&pageSize=100';
      let raw = [], token = '', pages = 0;
      do {
        const data = await this._getJSON(base + (token ? '&pageToken=' + encodeURIComponent(token) : ''));
        raw = raw.concat(data.models || []);
        token = data.nextPageToken || '';
      } while (token && ++pages < 10);

      const canGenerate = (m) => {
        const methods = m.supportedGenerationMethods || m.supportedActions;
        /* No list of methods at all: give it the benefit of the doubt. */
        return !methods || !methods.length || methods.indexOf('generateContent') !== -1;
      };
      const all = raw.map(m => String(m.name || '').replace(/^models\//, '')).filter(Boolean);
      const usable = raw.filter(canGenerate).map(m => String(m.name || '').replace(/^models\//, '')).filter(Boolean);
      /* If the filter has thrown away nearly everything it is more likely to be
         wrong than the provider is to have one model. Show the lot instead. */
      const names = usable.length >= 2 ? usable : all;
      return names.sort();
    }

    const url = (c.baseUrl || 'https://api.openai.com/v1').replace(/\/+$/, '') + '/models';
    const data = await this._getJSON(url, c.apiKey ? { Authorization: 'Bearer ' + c.apiKey } : {});
    return (data.data || data.models || []).map(m => m.id || m.name || '').filter(Boolean).sort();
  },

  async _getJSON(url, headers) {
    let res;
    try { res = await fetch(url, { headers: headers || {} }); }
    catch (e) { throw new Error('Could not reach the provider to ask for its model list.'); }
    if (!res.ok) {
      let detail = '';
      try { const j = await res.json(); detail = (j.error && (j.error.message || j.error.status)) || ''; } catch (e) {}
      throw new Error('The provider would not list its models (' + res.status + '). ' + detail);
    }
    return await res.json();
  },

  /* ---------- features ------------------------------------------------------ */
  async test() {
    const out = await this.chat([{ role: 'user', content: 'Reply with exactly: OK' }], { maxTokens: 400, temperature: 0 });
    return out.slice(0, 40);
  },

  /* What a card may hold, and how much of each. One description, used by both
     the single-card fill and the deck generator, so the two cannot drift. */
  cardFieldSpec(lang, extras) {
    const core = [
      ' "pos": one of [' + PARTS_OF_SPEECH.join(', ') + '],',
      ' "definition": a clear English definition, at most 30 words, no dictionary abbreviations,',
      ' "example": one natural English sentence that CONTAINS the word verbatim,',
      /* A bare equivalent is often useless on its own: "prognosis → prognoz" tells a
         learner nothing they did not already half-know. */
      ' "translation": the ' + lang + ' equivalent, followed by a short parenthesis saying what it',
      '   actually means when that helps — e.g. "prognoz (hastalığın seyri hakkında tıbbi öngörü)".',
      '   A bare one-word gloss is only enough for a word with one plain everyday meaning.'
    ];
    if (!extras) return core.join('\n');
    return core.concat([
      /* "Up to 4" reads as "give me 4" unless padding is named as the failure. */
      ' "collocations": fixed phrases the word genuinely occurs in, each containing the word.',
      '   AT MOST 4, and fewer is normal — most words have one or two, many have none.',
      '   Only phrases a dictionary would list as set expressions. Do NOT pad the list to',
      '   reach four: an ordinary sentence with the word in it is not a collocation,',
      ' "synonyms": up to 3 genuine ones, or an empty list,',
      ' "antonyms": up to 2, or an empty list — plenty of words have no opposite,',
      ' "family": up to 6 words built on the same root, each a SEPARATE dictionary word.',
      '   Never a mere inflection of the word itself: no plurals, no past tenses, and no',
      '   -ing form unless it is a word in its own right (diagnose → NOT "diagnosing";',
      '   analyse → analysis, analytical, analytically; build → building is fine, since a',
      '   building is a thing). An empty list is the right answer for a word with no family'
    ]).join('\n');
  },

  /* Fill in the empty parts of a card. Whatever the learner has already
     written is sent along and must come back untouched — and the app checks
     that too, because an instruction is not a guarantee. */
  async enrich(term, current) {
    const lang = this.cfg.nativeLanguage || 'Turkish';
    const has = current || {};
    const known = [];
    const add = (label, v) => { if (v && String(v).length) known.push(label + ': ' + v); };
    add('part of speech', has.pos);
    add('meaning', has.definition);
    add('example', has.example);
    add('translation', has.translation);
    add('collocations', (has.collocations || []).join('; '));
    add('synonyms', (has.synonyms || []).join(', '));
    add('antonyms', (has.antonyms || []).join(', '));
    add('word family', (has.family || []).join(', '));

    const res = await this.json([
      { role: 'system', content:
        'You are a bilingual lexicographer building vocabulary flashcards for a learner whose native ' +
        'language is ' + lang + '. Answer only with JSON.' },
      { role: 'user', content:
        'Word or phrase: "' + term + '"\n' +
        (known.length
          ? 'The learner has already written these, and they are correct. Repeat them back ' +
            'unchanged and do not improve them:\n' + known.map(k => '  ' + k).join('\n') + '\n\n'
          : '') +
        'Return JSON with exactly these keys:\n{\n' + this.cardFieldSpec(lang, true) + '\n}\n' +
        'Leave a list empty rather than inventing something to fill it.' }
    ], { temperature: 0.4, maxTokens: 2000 });

    return {
      pos: res.pos || '', definition: res.definition || '', example: res.example || '',
      translation: res.translation || '',
      collocations: cleanList(res.collocations, 4),
      synonyms: cleanList(res.synonyms, 3),
      antonyms: cleanList(res.antonyms, 2),
      family: cleanList(res.family, 6).filter(f => !isInflectionOf(f, term))
    };
  },

  /* Invent a batch of new cards on a topic. `detail` decides whether each card
     comes back with its collocations, relations and family — off, the cards are
     a third of the size, which is what makes a deck of fifty affordable in one
     request. */
  async suggestCards(topic, level, count, detail) {
    const lang = this.cfg.nativeLanguage || 'Turkish';
    const res = await this.json([
      { role: 'system', content: 'You build vocabulary decks for learners of English. Answer only with JSON.' },
      { role: 'user', content:
        'Create ' + count + ' useful English vocabulary items about "' + topic + '" at CEFR level ' + level + '.\n' +
        'Avoid very basic words the learner certainly knows, and do not repeat a term.\n' +
        'Return JSON: {"cards":[{ "term":"",\n' + this.cardFieldSpec(lang, detail) + '\n}]}\n' +
        (detail ? 'Leave a list empty rather than inventing something to fill it.\n' : '') }
    ], { temperature: 0.85, maxTokens: Math.min(24000, Math.max(4000, count * (detail ? 260 : 130))) });

    return (res.cards || []).filter(c => c && c.term).map(c => ({
      term: c.term, pos: c.pos || '', definition: c.definition || '',
      example: c.example || '', translation: c.translation || '',
      collocations: cleanList(c.collocations, 4),
      synonyms: cleanList(c.synonyms, 3),
      antonyms: cleanList(c.antonyms, 2),
      family: cleanList(c.family, 6).filter(f => !isInflectionOf(f, c.term))
    }));
  },

  /* Fresh, context-rich questions the offline generator cannot produce. */
  async makeQuestions(cards, count, choices) {
    choices = clampChoices(choices);
    const lang = this.cfg.nativeLanguage || 'Turkish';
    const list = cards.map(c => '- ' + c.term + ' (' + (c.pos || '?') + '): ' + (c.definition || c.translation)).join('\n');
    const res = await this.json([
      { role: 'system', content: 'You are an English teacher writing exam questions. Answer only with JSON.' },
      { role: 'user', content:
        'Learner native language: ' + lang + '.\nTarget words:\n' + list + '\n\n' +
        'Write ' + count + ' multiple-choice questions with exactly ' + choices + ' options each. ' +
        'Use a NEW sentence for each word (do not reuse the ' +
        'definitions above word for word). Mix these question styles:\n' +
        '  • a sentence with a gap where only the target word fits\n' +
        '  • "which word means ...?"\n' +
        '  • choosing the correct usage in context\n' +
        'Distractors must be plausible but clearly wrong. Return JSON:\n' +
        '{"questions":[{"term":"the target word","prompt":"question text, use ____ for a gap",' +
        '"options":[' + Array.from({ length: choices }, (_, i) => '"option ' + (i + 1) + '"').join(',') + '],' +
        '"answer":"the exact correct option","explanation":"one short sentence"}]}' }
    ], { temperature: 0.8, maxTokens: 6000 });
    return (res.questions || []).filter(q => q && q.prompt && Array.isArray(q.options) && q.answer);
  },

  /* Mark a sentence the learner wrote using the target word. */
  async gradeSentence(card, sentence) {
    const lang = this.cfg.nativeLanguage || 'Turkish';
    const res = await this.json([
      { role: 'system', content:
        'You are a friendly but precise English writing tutor. Be encouraging and concrete. Answer only with JSON.' },
      { role: 'user', content:
        'Target word: "' + card.term + '" (' + (card.pos || '') + ') — ' + (card.definition || card.translation) + '\n' +
        'The learner wrote: "' + sentence + '"\n\n' +
        'Judge whether the target word is used correctly and whether the sentence is natural English.\n' +
        'Return JSON: {"correct":true|false,"score":0-100,"feedback":"2-3 sentences in English, ' +
        'name the specific problem if there is one","corrected":"a corrected or improved version of their sentence",' +
        '"note":"one short tip in ' + lang + '"}' }
    ], { temperature: 0.4, maxTokens: 2500 });
    return res;
  },

  /* Short explanation shown after a wrong answer. */
  async explain(card, wrongAnswer) {
    const lang = this.cfg.nativeLanguage || 'Turkish';
    return await this.chat([
      { role: 'system', content: 'You are a concise English teacher. Maximum 45 words. No preamble.' },
      { role: 'user', content:
        'The learner (native language ' + lang + ') was asked about "' + card.term + '" and answered "' +
        wrongAnswer + '", which is wrong. The right meaning is: ' + (card.definition || card.translation) +
        '. Explain the difference in one or two short sentences, then give one memory hook.' }
    ], { temperature: 0.6, maxTokens: 1200 });
  }
};

function clampChoices(n) { return Math.max(2, Math.min(5, parseInt(n, 10) || 4)); }

/* A family member has to be a different word, not the same word wearing a
   suffix. The prompt says so; this is the part that does not depend on the
   model having listened.

   Only the mechanical endings are stripped, and a form already saved as a word
   of its own is kept — "building" is a thing, "diagnosing" is not, and the
   collection is the only evidence available for telling those apart. */
function isInflectionOf(form, term) {
  const a = String(form || '').trim().toLowerCase();
  const b = String(term || '').trim().toLowerCase();
  if (!a || !b || a === b) return a === b;
  if (typeof Store !== 'undefined' && Store.state && Store.cardByTerm && Store.cardByTerm(a)) return false;
  /* Plurals that do not simply add an s — common enough in medical and academic
     English that leaving them out would let half of them through. */
  const latin = [['is', 'es'], ['us', 'i'], ['um', 'a'], ['on', 'a'],
                 ['a', 'ae'], ['ex', 'ices'], ['ix', 'ices']];
  for (const [end, plural] of latin) {
    if (b.length > end.length + 2 && b.slice(-end.length) === end &&
        a === b.slice(0, -end.length) + plural) return true;
  }

  const stems = [b];
  if (/e$/.test(b)) stems.push(b.slice(0, -1));                 /* diagnose -> diagnos-  */
  if (/is$/.test(b)) stems.push(b.slice(0, -2));                /* prognosis -> prognos- */
  if (/[bdgklmnprt]$/.test(b)) stems.push(b + b.slice(-1));     /* run      -> runn-     */
  if (/y$/.test(b)) stems.push(b.slice(0, -1) + 'i');           /* study    -> studi-    */
  return stems.some(stem => ['s', 'es', 'ed', 'd', 'ing'].some(suf => a === stem + suf));
}

/* Whatever a model returns where a list was asked for: trimmed, de-duplicated,
   emptied of junk and cut to the agreed length. The prompt asks for at most N;
   this is what makes it true. */
function cleanList(v, max) {
  const arr = Array.isArray(v) ? v : (typeof v === 'string' ? v.split(/[;,\n]/) : []);
  const seen = {};
  return arr.map(x => String(x == null ? '' : x).trim())
    .filter(x => x && x.length < 80 && !seen[x.toLowerCase()] && (seen[x.toLowerCase()] = 1))
    .slice(0, max);
}

/* Models sometimes wrap JSON in prose or code fences — dig it out. */
function parseLooseJSON(text) {
  if (!text) throw new Error('The AI returned an empty response.');
  let t = String(text).trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```$/, '')
    .trim();
  try { return JSON.parse(t); } catch (e) {}
  const start = t.search(/[{[]/);
  const end = Math.max(t.lastIndexOf('}'), t.lastIndexOf(']'));
  if (start !== -1 && end > start) {
    try { return JSON.parse(t.slice(start, end + 1)); } catch (e) {}
  }
  /* Saying what came back instead is the difference between a puzzle and a
     clue — an apology, a refusal and a truncated object all look the same
     otherwise. */
  throw new Error('The AI response was not valid JSON. It began: "' +
    String(text).trim().slice(0, 80).replace(/\s+/g, ' ') + '". Try again, or pick another model.');
}
