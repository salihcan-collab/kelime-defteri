# Building the B1 Preliminary deck

Two jobs live here: reading Cambridge's list out of its PDF, and holding every
card to the same rules whoever wrote it. A third — drafting the plain cards
with a model — is finished and gone; what it was and what it taught is below.
None of it is needed to *run* Lexio: the app is still three script tags and no
build step.

## The word list

`words.json` is the Cambridge *B1 Preliminary and Preliminary for Schools
Vocabulary List* (August 2025) as 3,353 entries: the word, its part of speech,
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

One headword in `words.json` does not match the reading: the list prints
`suprising`, and the card says **surprising**. Both readings of the PDF agree
on the misspelling, so it is the source's and not ours — but a card is what a
learner reads and copies, and this one would teach them to spell it wrong.
Nothing else is corrected: a list that quietly disagrees with its source is
worse than one that does so in a single line you can find.

## How the cards were drafted

404 of the cards are marked `byHand` — the phrasal verbs, the phrases, the
exclamations, the plural nouns, the words carrying a British/American note, and
the words split into several senses whose examples have to be told apart. Those
were written by hand. The other 2,949 were drafted by a hosted model through a
page in this folder, `uret.html`, and then held to the checks below.

That page has gone: the deck is written, and 3,352 of the 3,353 words are in
it. It is in the history if a newer edition of the list ever needs the same
treatment — `git log -- tools/uret.html` finds it. For a word or two at a time
the app's own auto-fill does the same job inside the card editor, where the
result can be read before it is kept.

Two decisions it was built on are worth keeping, because they are what made the
result usable:

**The Turkish was not drafted, at first.** Twenty calibration cards from
qwen2.5:14b came back with English worth keeping — clean definitions, natural
examples, real collocations — and Turkish that was wrong in seven of fifteen:
`challenge` as *itiraf etmek* (to confess), `nowadays` as *şimdiki zaman* (the
present tense), `roll` as *rol*, and `dağrita`, which is not a word in any
language. None of that can be caught mechanically: they are plausible Turkish
strings, and a learner meeting them on a card has no way of knowing. A larger
hosted model later earned the job, and its translations went through the same
checks as everything else — but the rule stands for whatever writes them next:
the Turkish is trusted last.

**Nothing a model said was trusted.** Every card went through the checks in
`card-rules.js` that the deck itself is held to, and a card that failed was
asked for again with the reason attached. The tags were never part of that:
they were read out of Cambridge's appendix long before any of it, sit in
`words.json` beside each word, and were put on the card as it was built.

## The rules

`card-rules.js` holds them and

    node tools/check-b1.js

runs them over the whole deck: the example contains the word (using the app's
own matcher, so a card that passes is a card the drills can actually use), the
definition is short and does not contain the word it defines, the translation
is Turkish and not the English word again, collocations contain their word,
family members are separate words rather than endings, and two senses of one
word always say which is which.
