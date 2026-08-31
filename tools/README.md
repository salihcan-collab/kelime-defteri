# Building the B1 Preliminary deck

These three scripts turn Cambridge's *B1 Preliminary and Preliminary for
Schools Vocabulary List* (August 2025) into the word list the deck is written
from. They are here so the deck can be audited and rebuilt, not because the app
needs them: Lexio itself is still three script tags and no build step.

The PDF is Cambridge's and is **not** in this repository. Point `PDF` in
`extract.py` at your own copy.

    python3 extract.py    # the list -> pv-records.json   (headwords + examples)
    python3 verify.py     # checks that reading against a plain reading of the PDF
    python3 plan.py       # applies the deck's rules -> pv-cards.json

## Why it is not a three-line script

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
and reports anything the two readings disagree about: headwords the plain
reading can see and this one cannot, entries out of alphabetical order that the
PDF does not itself have out of order, records with no part of speech, empty
headwords. All four should be zero — except the ordering, where Cambridge's own
list has 27 pairs the other way round.
