# Building the B1 Preliminary deck

Three jobs live here: reading Cambridge's list out of its PDF, drafting the
plain cards on your own computer with Ollama, and holding every card to the
same rules whoever wrote it. None of it is needed to *run* Lexio — the app is
still three script tags and no build step.

## The word list

`words.json` is the Cambridge *B1 Preliminary and Preliminary for Schools
Vocabulary List* (August 2025) as 3,359 cards: the word, its part of speech,
whichever bracket note Cambridge attached, and the examples it printed. It is
already built, so you only need the Python scripts if you want to check the
reading or rebuild it from a newer edition.

The PDF is Cambridge's and is **not** in this repository. Point `PDF` in
`extract.py` at your own copy.

    python3 extract.py    # the list -> pv-records.json   (headwords + examples)
    python3 verify.py     # checks that reading against a plain reading of the PDF
    python3 plan.py       # applies the deck's rules -> pv-cards.json
    python3 topics.py     # Appendix 2's topic lists, matched to those words

### The tags

Appendix 2 files about half the vocabulary under 22 headings — Food and Drink,
Travel and Transport, Work and Jobs. Those become each card's tags, which are a
different thing from its deck: a deck is what you chose to study, a tag is what
the word is about, and a card can carry several.

Those pages are set four columns wide, with each topic occupying a band of rows
across all four and its columns moving from page to page. None of it has to be
parsed exactly, though, because the vocabulary is already known from the
alphabetical list — the lines are read loosely and matched against it, allowing
for the two lists disagreeing with each other (`chat room` against `chatroom`,
`socks` against `sock`, `doctor / Dr` against plain `doctor`).

297 words are filed under more than one heading, and each card ships with one
of them: the narrowest, which is what keeps small lists like Services and
Colours from being emptied by larger ones. It is a judgement the data cannot
settle, and tags are yours to add to or change in the editor.

### Why reading it is not a three-line script

The list is set in two columns, so a plain text dump interleaves them: a
`camera` turns up in the D section, and half an example sentence is read as a
headword. Reading the page as coordinates keeps the columns apart, but the
entries still do not come one to a line — where a line has room to spare, the
next entry simply starts on it (`dinner (n) dinosaur`, with `(n) diploma (n)`
underneath). So the list is read as a stream and cut on its part-of-speech
labels instead.

That leaves the examples, which are the hard part. An example can run over two
lines, carry its own label (`His mind was on other things. (n)`), hold a gloss
(`It's plain to me. (clear)`), contain two sentences, or lose its bullet
altogether. Three signals decide where one ends: whether the line stopped at
the column's right edge, whether it stopped on a word that can end a sentence,
and whether what follows has the shape of a headword — a word or three with a
label behind it, sitting where the alphabet says an entry belongs.

`verify.py` is the check on all of it. It reads the same pages the ordinary way
and reports anything the two readings disagree about. All of it should be zero,
except the ordering: Cambridge's own list has 27 pairs out of alphabetical
order, and those are reported as its own.

## Drafting the cards

410 of the cards are marked `byHand` — the phrasal verbs, the phrases, the
exclamations, the plural nouns, the words carrying a British/American note, and
the words split into several senses whose examples have to be told apart.
Those are written by hand. The other 2,949 are ordinary nouns, verbs,
adjectives and adverbs, drafted against an Ollama running on your own machine.

**`uret.html` is how** — a page like the app itself, needing nothing installed.
Start the folder's own `sunucu-baslat` and open
<http://localhost:8000/tools/uret.html>. (It has to be served: a page opened
straight off the disk cannot read the word list beside it. That server sends
everything with `Cache-Control: no-store`, so a page you have opened before
still comes back the version you have now, not the one your browser kept.)

Try twenty words first and read what comes back. They are taken from across the
alphabet rather than off the front, because the As are not the hard part.

### Why the Turkish is not drafted

It was, at first. Twenty calibration cards from qwen2.5:14b came back with
English worth keeping — clean definitions, natural examples, real collocations
— and Turkish that was wrong in seven of fifteen: `challenge` as *itiraf etmek*
(to confess), `nowadays` as *şimdiki zaman* (the present tense), `roll` as
*rol*, and `dağrita`, which is not a word in any language.

None of that can be caught mechanically. They are plausible Turkish strings, and
a learner meeting them on a card has no way of knowing. So the model is asked
for English only — where it is good, and where the checks have teeth — and the
translations, three words a card against sixty, are written by hand afterwards.

The model is never asked about tags and never told them. They were read out of
Cambridge's appendix long before any of this, sit in `words.json` beside each
word, and are put on the card as it is built — the model writes the English and
nothing else.

Nothing the model says is trusted. Every card goes through the same checks in
`card-rules.js` that the deck itself is held to, and a card that fails is asked
for again with the reason attached. A word that fails three times is left out
and listed at the end. The page keeps what it has written after every batch, in the browser's own
store, so a run survives a closed laptop and picks up where it left off rather
than starting again. It never writes into `deck-b1.js`: it hands over
`drafted-cards.json`, and folding that in is a separate, reviewed step.

No batch ever carries two senses of one word. Answers are matched back by their
term, and a model asked for `cook` twice writes it once — leaving no way to tell
which of the two the answer belonged to. They meet later instead: a card is
checked against every draft already written, and a noun that says the same
thing as its own verb is sent back to be written again. What keeps them apart
in the first place is that a verb's meaning begins with "To " and nothing
else's does, which is asked for and checked.

## The rules

`card-rules.js` holds them once — as the instructions a model is given, and as
the checks its answer goes through. A rule asked for but not checked is a wish;
a rule checked but never asked for is a trap.

    node tools/check-b1.js

runs them over the whole deck: the example contains the word (using the app's
own matcher, so a card that passes is a card the drills can actually use), the
definition is short and does not contain the word it defines, the translation
is Turkish and not the English word again, collocations contain their word,
family members are separate words rather than endings, and two senses of one
word always say which is which.
