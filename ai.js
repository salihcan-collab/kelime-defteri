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

  /* The same assistant pointed at a different provider: one small daily
     request can go to a free key while the drills use whichever key the
     learner pays for. Everything else — the prompts, the budgets, the
     counting — is shared. */
  as(cfg) {
    const alt = Object.create(this);
    Object.defineProperty(alt, 'cfg', { get: function () { return cfg; } });
    return alt;
  },

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
  /* The band the learner is working at. It steers the English around the target
     words — the sentences, the marking, the explanations — never the target
     words themselves, which are whatever the learner has saved. */
  level() { return CEFR_BANDS[this.cfg.level] ? this.cfg.level : 'B1-B2'; },
  levelSays() {
    const band = this.level();
    return 'The learner is at CEFR level ' + band + ' (' + CEFR_BANDS[band] + '). Write the English ' +
      'around the target words at that level — sentence length, grammar and everyday vocabulary. ' +
      'The target words stay as they are, however hard they are.';
  },

  /* The other half of what a level means: English written TO the learner rather
     than for them to work through. A beginner who cannot read the explanation
     has been told nothing; an advanced learner does not need it thinned out. */
  levelTalk() {
    return 'The learner is at CEFR level ' + this.level() + '. ' + LEVEL_TALK[this.level()];
  },

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
      /* Two ways to get this wrong, not one: a single arbitrary equivalent teaches
         less than the word has to offer, and a parenthesis on every card is noise
         the learner soon reads past. The gloss earns its place only where no native
         word carries the meaning by itself. */
      ' "translation": what the word means in ' + lang + '. Most words have more than one natural',
      '   rendering: give 2-3 of them, separated by commas, rather than one arbitrary pick.',
      '   A single word is right only where ' + lang + ' truly offers only one — and do not pad',
      '   the other way either, by inventing a second word nobody would use.',
      '   Add a parenthesis explaining the sense ONLY when no ' + lang + ' word carries the',
      '   meaning on its own, e.g. "prognoz (hastalığın seyri hakkında tıbbi öngörü)".',
      '   An everyday word with a well-known equivalent gets no parenthesis at all.'
    ];
    if (!extras) return core.join('\n');
    return core.concat([
      /* "Up to 4" reads as "give me 4" unless padding is named as the failure. */
      ' "collocations": fixed phrases the word genuinely occurs in, each containing the word.',
      '   AT MOST 4, and fewer is normal — most words have one or two, many have none.',
      '   Only phrases a dictionary would list as set expressions. Do NOT pad the list to',
      '   reach four: an ordinary sentence with the word in it is not a collocation,',
      /* Two came back every time while the ceiling was three — the ceiling was
         being read as the target. */
      ' "synonyms": every word that genuinely means the same, up to 4 — two is not a quota.',
      '   A word with four real synonyms gets four; a word with none gets an empty list,',
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
      synonyms: cleanList(res.synonyms, 4),
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
      synonyms: cleanList(c.synonyms, 4),
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
        'Learner native language: ' + lang + '. ' + this.levelSays() + '\nTarget words:\n' + list + '\n\n' +
        'Write ' + count + ' multiple-choice questions with exactly ' + choices + ' options each. ' +
        'Use a NEW sentence for each word (do not reuse the ' +
        'definitions above word for word). Mix these question styles:\n' +
        '  • a sentence with a gap where only the target word fits\n' +
        '  • "which word means ...?"\n' +
        '  • choosing the correct usage in context\n' +
        /* The two ways an otherwise fine question is wasted: several options fit,
           or the odd one out is spottable without knowing any of the words. */
        'Two rules decide whether a question is worth asking:\n' +
        '  1. EXACTLY ONE option can be right. Put enough in the sentence to rule the others\n' +
        '     out before you choose them. If a careful reader could argue for a second option,\n' +
        '     the question is broken: sharpen the sentence or replace that option. A gap any\n' +
        '     word of the right sort would fill ("a ____ overview of the project") is the\n' +
        '     usual failure.\n' +
        '  2. All ' + choices + ' options must be the same kind of word as the answer: same part of\n' +
        '     speech, same form, phrasal verbs alongside phrasal verbs, single words alongside\n' +
        '     single words. The wrong ones are real words a learner could confuse with the\n' +
        '     answer — never its synonyms, and never a word that would also fit.\n' +
        'Return JSON:\n' +
        '{"questions":[{"term":"the target word","prompt":"question text, use ____ for a gap",' +
        '"options":[' + Array.from({ length: choices }, (_, i) => '"option ' + (i + 1) + '"').join(',') + '],' +
        '"answer":"the exact correct option",' +
        '"explanation":"one or two short sentences: why the answer fits, and why the closest ' +
        'wrong option does not"}]}\n' + this.levelTalk() }
    ], { temperature: 0.8, maxTokens: 6000 });
    return (res.questions || []).filter(q => q && q.prompt && Array.isArray(q.options) && q.answer);
  },

  /* Banked gap-fill: one short text per group of words, with the words taken
     out of it. The learner puts them back, so what is being tested is the
     context around the gap rather than the word in isolation. */
  async makePassages(groups) {
    const brief = (c) => String(c.definition || c.translation || '').split(/\s+/).slice(0, 12).join(' ');
    const list = groups.map((g, i) =>
      '  Text ' + (i + 1) + ': ' + g.map(c => c.term + ' (' + (c.pos || '?') + ' — ' + brief(c) + ')').join('; ')
    ).join('\n');
    const res = await this.json([
      { role: 'system', content: 'You are an English teacher writing texts for a gap-fill exercise. Answer only with JSON.' },
      { role: 'user', content:
        this.levelSays() + '\n\nWrite one text for each group of target words:\n' + list + '\n\n' +
        /* An exam paragraph is the wrong home for "put off" and a dialogue is the
           wrong home for "photosynthesis": the words decide which they get. */
        'Let the words themselves decide what kind of text they belong in:\n' +
        '  • everyday, spoken words — phrasal verbs, idioms, ordinary verbs and adjectives — ' +
        'call for a short conversation between two people, each turn on its own line, ' +
        'beginning "Alex:" or "Sam:".\n' +
        '  • academic, technical or formal words call for an exam-style reading paragraph on a ' +
        'real subject: science, history, culture, society, the environment, economics.\n' +
        'Either way it runs 5-7 sentences (or turns) that hang together — one situation, one ' +
        'line of thought — not unrelated sentences sharing a topic.\n' +
        /* The gaps are cut out of this text afterwards, which is why the text is
           asked for whole: a word written into the wrong hole is the one mistake
           this drill cannot survive, and prose cannot make it. */
        'Write the text out in full, with the target words in it. Do not mark, number or ' +
        'blank out anything.\n' +
        /* Each of these is a word the learner loses: the app can only ask about a
           word it can find exactly once, standing where a sentence does not
           begin. */
        'Every word of the group must appear, exactly once, and nowhere else in the text in any ' +
        'form — a text that leaves one out, or uses one twice, is a failed text. Keep each one in ' +
        'the form written above unless the sentence needs another, and never let one open a ' +
        'sentence or a turn.\n' +
        'What decides whether the text is worth doing: each target word must be pinned down by ' +
        'the sentences around it, so that a reader who covered it could name it from what is ' +
        'said before and after. If another word of the group could stand in its place, say more ' +
        'about what is happening there until one word only fits.\n' +
        /* A learner reads the whole text to work out one gap, so a text that
           argues with itself makes every gap harder for the wrong reason. */
        'It also has to hold together as one situation: the same person, the same stretch of ' +
        'time, reasons that agree with each other. Read it back before you answer — someone who ' +
        'put a job off because they were busy cannot two sentences later refuse an invitation ' +
        'because duty comes first.\n' +
        '"extra" is one more English word, the same kind of word as the targets and tempting at ' +
        'a glance, that appears nowhere in the text and fits none of the places they stand.\n' +
        'Return JSON: {"passages":[{"text":"the whole text, target words included",' +
        '"extra":"one spare word"}]}' }
    ], { temperature: 0.7, maxTokens: Math.min(6000, 1400 * groups.length) });
    return (res.passages || []).filter(p => p && p.text);
  },

  /* The forms of a word that no ending would produce. Whoever goes looking for
     a word in a sentence needs these to know what to look for — "fell" is not
     "fall" with anything on the end. */
  formsOf(word) {
    return (IRREGULAR[String(word || '').trim().toLowerCase()] || []).slice();
  },

  /* The stems a regular ending is built on. "study" becomes "studies" and
     "rise" becomes "rising", neither of which is the word with something added
     to the end of it, so a search for the word alone would miss both. */
  stemsOf(word) {
    const w = String(word || '').trim().toLowerCase();
    const out = [];
    if (/e$/.test(w) && w.length > 3) out.push(w.slice(0, -1));
    if (/[^aeiou]y$/.test(w) && w.length > 2) out.push(w.slice(0, -1) + 'i');
    return out;
  },

  /* Whether two forms are the same word: a sentence may need "diagnosed" where
     the card says "diagnose", or "worked out" for "work out". Word by word, so
     a phrase is judged as a phrase. */
  sameWord(a, b) {
    const x = String(a || '').trim().toLowerCase().split(/\s+/).filter(Boolean);
    const y = String(b || '').trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (!x.length || x.length !== y.length) return false;
    return x.every((w, i) => w === y[i] || inflects(w, y[i]) || inflects(y[i], w));
  },

  /* One clue per word for a crossword. The grid is the app's business — a
     model cannot be trusted to lay one out — but the clues are the part worth
     writing, and a definition off the card is not a clue. */
  async crosswordClues(cards) {
    const list = cards.map(c =>
      '- ' + c.term + ' (' + (c.pos || '?') + '): ' + (c.definition || c.translation)).join('\n');
    const res = await this.json([
      { role: 'system', content: 'You write crossword clues for English learners. Answer only with JSON.' },
      { role: 'user', content:
        this.levelTalk() + '\n\nWrite one crossword clue for each word:\n' + list + '\n\n' +
        /* A clue containing its own answer is the one way a crossword clue can
           be worthless, and the app cannot rewrite it — only refuse it. */
        'A clue names the word without ever using it: not the word, not a longer or shorter form ' +
        'of it, and not another word from the list above.\n' +
        'At most 12 words. A short definition, a description of what it is for, or a sentence ' +
        'with the word left out — vary them.\n' +
        'Say nothing about spelling or letter count; the grid takes care of that.\n' +
        'Return JSON: {"clues":[{"term":"the word, exactly as written above","clue":"the clue"}]}' }
    ], { temperature: 0.7, maxTokens: Math.min(4000, Math.max(600, cards.length * 140)) });
    return (res.clues || []).filter(c => c && c.term && c.clue);
  },

  /* A word to meet today. The model has no way of reading a dictionary's word
     of the day — it is a text call, with no web — so it chooses one itself,
     which is the honest version of the same idea. One request a day. */
  async wordOfTheDay(avoid) {
    const lang = this.cfg.nativeLanguage || 'Turkish';
    const seen = (avoid || []).slice(-60);
    const res = await this.json([
      { role: 'system', content: 'You choose a word worth learning and present it plainly. Answer only with JSON.' },
      { role: 'user', content:
        'Pick one English word or short phrase worth meeting today. ' + this.levelSays() + '\n' +
        'It should be genuinely useful or interesting to a learner — a word they will meet again — ' +
        'not a rarity nobody says, and not one of the first hundred words anyone learns.\n' +
        (seen.length ? 'Not any of these, which have already been offered: ' + seen.join(', ') + '\n' : '') +
        'Return JSON: {"term":"the word","pos":"one of [' + PARTS_OF_SPEECH.join(', ') + ']",' +
        '"definition":"a clear English definition, at most 25 words",' +
        '"example":"one natural sentence that CONTAINS the word",' +
        '"translation":"what it means in ' + lang + ', 2-3 alternatives where the word has them",' +
        /* Where a word belongs is half of knowing it: a learner who uses a
           courtroom word at a bus stop has learned the meaning and not the
           word. */
        '"note":"one short line in ' + lang + ' on where the word belongs — formal or everyday, ' +
        'spoken or written, and the setting it is at home in (academic, business, medical, ' +
        'journalism, slang…), with a caution if it is easily misused"}' }
    ], { temperature: 0.9, maxTokens: 1200 });
    if (!res.term) throw new Error('No word came back. Try again.');
    return { term: String(res.term).trim(), pos: res.pos || '', definition: res.definition || '',
             example: res.example || '', translation: res.translation || '', note: res.note || '' };
  },

  /* Mark a sentence the learner wrote using the target word. */
  async gradeSentence(card, sentence) {
    const lang = this.cfg.nativeLanguage || 'Turkish';
    const res = await this.json([
      { role: 'system', content:
        'You are a friendly but precise English writing tutor. Be encouraging and concrete. Answer only with JSON.' },
      { role: 'user', content:
        'Target word: "' + card.term + '" (' + (card.pos || '') + ') — ' + (card.definition || card.translation) + '\n' +
        'The learner wrote: "' + sentence + '"\n' + this.levelTalk() + '\n\n' +
        'Judge whether the target word is used correctly and whether the sentence is natural English. ' +
        /* Marking a beginner against C1 English teaches them only that they
           failed; the word is what is being practised. */
        'Mark the use of the word first, and hold the rest of the sentence to what someone at ' +
        'that level should manage — at A1-A2 a short, plain sentence that uses the word correctly ' +
        'is a success.\n' +
        'The corrected version stays their sentence, at their level: repair it, do not replace it ' +
        'with English they could not have written.\n' +
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
        this.levelTalk() + '\n' +
        'The learner (native language ' + lang + ') was asked about "' + card.term + '" and answered "' +
        wrongAnswer + '", which is wrong. The right meaning is: ' + (card.definition || card.translation) +
        '. Explain the difference in one or two short sentences, then give one memory hook.' }
    ], { temperature: 0.6, maxTokens: 1200 });
  }
};

/* The three bands the app offers, and what each one means to a model. */
const CEFR_BANDS = {
  'A1-A2': 'beginner',
  'B1-B2': 'intermediate',
  'C1-C2': 'advanced'
};

/* And how to talk to someone at each of them. Explanations sit a step below the
   level being practised: understanding the correction is not meant to be the
   hard part. */
const LEVEL_TALK = {
  'A1-A2': 'Write everything you say TO them in very simple English — short sentences, ' +
    'A1-A2 words, no grammar jargon beyond "verb", "noun" and the like. Give a plain example ' +
    'rather than a rule where you can.',
  'B1-B2': 'Write everything you say TO them in clear, simple English at about B1 — ' +
    'straightforward sentences and only the common grammar terms.',
  'C1-C2': 'Write everything you say TO them in ordinary unsimplified English (B2-C1); ' +
    'precise grammatical terms are welcome and need no explaining.'
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
  return inflects(a, b);
}

/* English verbs that do not take their endings the regular way. Without these
   a drill cannot find its own word in its own sentence: "The car has broken
   down" would not match "break down", and the gap could not be cut. Each entry
   is the plain form followed by the past and the participle; the -s and -ing
   forms are regular and are handled below. */
const IRREGULAR = ('be was been|beat beat beaten|become became become|begin began begun|' +
  'bend bent|bet bet|bite bit bitten|bleed bled|blow blew blown|break broke broken|' +
  'bring brought|build built|burn burnt|buy bought|catch caught|choose chose chosen|' +
  'come came come|cost cost|cut cut|deal dealt|dig dug|do did done|draw drew drawn|' +
  'dream dreamt|drink drank drunk|drive drove driven|eat ate eaten|fall fell fallen|' +
  'feed fed|feel felt|fight fought|find found|fly flew flown|forget forgot forgotten|' +
  'forgive forgave forgiven|freeze froze frozen|get got gotten|give gave given|' +
  'go went gone|grow grew grown|hang hung|have had|hear heard|hide hid hidden|hit hit|' +
  'hold held|hurt hurt|keep kept|know knew known|lay laid|lead led|learn learnt|' +
  'leave left|lend lent|let let|lie lay lain|light lit|lose lost|make made|mean meant|' +
  'meet met|pay paid|put put|quit quit|read read|ride rode ridden|ring rang rung|' +
  'rise rose risen|run ran run|say said|see saw seen|sell sold|send sent|set set|' +
  'sew sewed sewn|shake shook shaken|shine shone|shoot shot|show showed shown|' +
  'shut shut|sing sang sung|sink sank sunk|sit sat|sleep slept|slide slid|smell smelt|' +
  'speak spoke spoken|spell spelt|spend spent|spill spilt|split split|spoil spoilt|' +
  'spread spread|stand stood|steal stole stolen|stick stuck|sting stung|swear swore sworn|' +
  'sweep swept|swim swam swum|swing swung|take took taken|teach taught|tear tore torn|' +
  'tell told|think thought|throw threw thrown|understand understood|wake woke woken|' +
  'wear wore worn|win won|write wrote written').split('|').reduce((map, line) => {
    const parts = line.split(' ');
    map[parts[0]] = parts.slice(1);
    return map;
  }, {});

/* The mechanical half of that question, with no opinion about what the learner
   has saved: is `a` simply `b` wearing a regular ending? */
function inflects(a, b) {
  const irregular = IRREGULAR[b];
  if (irregular && irregular.indexOf(a) !== -1) return true;
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
