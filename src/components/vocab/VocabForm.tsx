'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Panel } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { FieldLabel, FieldWrapper, Select, TextArea, TextInput } from '@/components/ui/Field';
import { TagInput } from '@/components/vocab/TagInput';
import { AIFieldButton } from '@/components/vocab/AIFieldButton';
import { CambridgeLookupLink } from '@/components/vocab/CambridgeLookupLink';
import { HighlightedSentence } from '@/components/vocab/HighlightedSentence';
import { PronunciationPlayer } from '@/components/vocab/PronunciationPlayer';
import { findWordSpans, serializeSpans } from '@/lib/highlight';
import { CEFR_LEVELS, PART_OF_SPEECH_LABELS, PARTS_OF_SPEECH } from '@/types';
import type { CardWithRelations, CefrLevel, PartOfSpeech } from '@/types';

interface MeaningFormState {
  partOfSpeech: PartOfSpeech | '';
  ipa: string;
  label: string;
  cefr: CefrLevel | '';
  definitionEn: string;
  definitionTr: string;
  synonyms: string;
  antonyms: string;
  tags: string[];
  examples: string[];
}

interface FormState {
  vocabulary: string;
  ipa: string;
  audioUrl: string;
  meanings: MeaningFormState[];
  collocations: string;
  mnemonic: string;
  notes: string;
}

const BLANK_MEANING: MeaningFormState = {
  partOfSpeech: '',
  ipa: '',
  label: '',
  cefr: '',
  definitionEn: '',
  definitionTr: '',
  synonyms: '',
  antonyms: '',
  tags: [],
  examples: [''],
};

function initialStateFromCard(card?: CardWithRelations): FormState {
  if (!card) {
    return {
      vocabulary: '',
      ipa: '',
      audioUrl: '',
      meanings: [{ ...BLANK_MEANING }],
      collocations: '',
      mnemonic: '',
      notes: '',
    };
  }
  return {
    vocabulary: card.vocabulary,
    ipa: card.ipa ?? '',
    audioUrl: card.audioUrl ?? '',
    meanings: card.meanings.length
      ? card.meanings.map((m) => ({
          partOfSpeech: m.partOfSpeech ?? '',
          ipa: m.ipa ?? '',
          label: m.label ?? '',
          cefr: m.cefr ?? '',
          definitionEn: m.definitionEn ?? '',
          definitionTr: m.definitionTr ?? '',
          synonyms: m.synonyms ?? '',
          antonyms: m.antonyms ?? '',
          tags: m.tags.map((t) => t.tag.name),
          examples: m.examples.length ? m.examples.map((e) => e.text) : [''],
        }))
      : [{ ...BLANK_MEANING }],
    collocations: card.collocations ?? '',
    mnemonic: card.mnemonic ?? '',
    notes: card.notes ?? '',
  };
}

export function VocabForm({ card, aiConfigured }: { card?: CardWithRelations; aiConfigured: boolean }) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(() => initialStateFromCard(card));
  const [saving, setSaving] = useState(false);
  const [generatingFull, setGeneratingFull] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const isEdit = Boolean(card);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  // Context for the card-level AI fields that remain (mnemonic/collocations)
  // — grounded in the primary (first) meaning, since that's the sense being
  // memorized.
  const primaryContext = { definitionEn: form.meanings[0]?.definitionEn, partOfSpeech: form.meanings[0]?.partOfSpeech };

  function updateMeaning(index: number, patch: Partial<MeaningFormState>) {
    setForm((prev) => ({ ...prev, meanings: prev.meanings.map((m, i) => (i === index ? { ...m, ...patch } : m)) }));
  }
  /** Opens a new blank sense — everything left empty since its part of speech and pronunciation might match the existing one(s) or not. */
  function addMeaning() {
    setForm((prev) => ({ ...prev, meanings: [...prev.meanings, { ...BLANK_MEANING, examples: [''] }] }));
  }
  function removeMeaning(index: number) {
    setForm((prev) => ({ ...prev, meanings: prev.meanings.filter((_, i) => i !== index) }));
  }
  function updateMeaningExample(meaningIndex: number, exampleIndex: number, text: string) {
    setForm((prev) => ({
      ...prev,
      meanings: prev.meanings.map((m, i) =>
        i === meaningIndex ? { ...m, examples: m.examples.map((e, j) => (j === exampleIndex ? text : e)) } : m,
      ),
    }));
  }
  function addMeaningExample(meaningIndex: number) {
    setForm((prev) => ({
      ...prev,
      meanings: prev.meanings.map((m, i) => (i === meaningIndex ? { ...m, examples: [...m.examples, ''] } : m)),
    }));
  }
  function removeMeaningExample(meaningIndex: number, exampleIndex: number) {
    setForm((prev) => ({
      ...prev,
      meanings: prev.meanings.map((m, i) => (i === meaningIndex ? { ...m, examples: m.examples.filter((_, j) => j !== exampleIndex) } : m)),
    }));
  }

  async function handleGenerateFullCard() {
    if (!form.vocabulary.trim()) {
      setError('Enter the vocabulary word first.');
      return;
    }
    setGeneratingFull(true);
    setError(null);
    try {
      const res = await fetch('/api/ai/generate-card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word: form.vocabulary.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'AI generation failed');
      const draft = data.draft;
      setForm((prev) => {
        const meanings = [...prev.meanings];
        meanings[0] = {
          ...meanings[0],
          partOfSpeech: draft.partOfSpeech ?? meanings[0].partOfSpeech,
          cefr: draft.cefr ?? meanings[0].cefr,
          definitionEn: draft.definitionEn ?? meanings[0].definitionEn,
          definitionTr: draft.definitionTr ?? meanings[0].definitionTr,
          synonyms: draft.synonyms || meanings[0].synonyms,
          antonyms: draft.antonyms || meanings[0].antonyms,
          tags: Array.from(new Set([...meanings[0].tags, ...(draft.suggestedTags ?? [])])),
          examples: draft.exampleSentences?.length ? draft.exampleSentences : meanings[0].examples,
        };
        return {
          ...prev,
          ipa: draft.ipa ?? prev.ipa,
          audioUrl: draft.audioUrl ?? prev.audioUrl,
          mnemonic: draft.mnemonic ?? prev.mnemonic,
          collocations: draft.collocations ?? prev.collocations,
          meanings,
        };
      });
      setNotice('AI drafted the primary meaning — review and tweak it, then use "+ Add another meaning" below if the word has other common senses.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI generation failed');
    } finally {
      setGeneratingFull(false);
    }
  }

  async function handleLookupPronunciation() {
    if (!form.vocabulary.trim()) return;
    try {
      const res = await fetch('/api/ai/pronunciation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word: form.vocabulary.trim() }),
      });
      const data = await res.json();
      setForm((prev) => ({ ...prev, ipa: data.ipa || prev.ipa, audioUrl: data.audioUrl || prev.audioUrl }));
    } catch {
      /* non-fatal */
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.vocabulary.trim()) {
      setError('Vocabulary is required.');
      return;
    }
    setSaving(true);
    setError(null);
    const payload = {
      vocabulary: form.vocabulary.trim(),
      ipa: form.ipa || null,
      audioUrl: form.audioUrl || null,
      mnemonic: form.mnemonic || null,
      collocations: form.collocations || null,
      notes: form.notes || null,
      meanings: form.meanings.map((m) => ({
        partOfSpeech: m.partOfSpeech || null,
        ipa: m.ipa || null,
        label: m.label || null,
        cefr: m.cefr || null,
        definitionEn: m.definitionEn || null,
        definitionTr: m.definitionTr || null,
        synonyms: m.synonyms || null,
        antonyms: m.antonyms || null,
        tags: m.tags,
        examples: m.examples.filter((ex) => ex.trim()).map((text) => ({ text, source: 'USER' as const })),
      })),
    };

    try {
      const res = await fetch(isEdit ? `/api/cards/${card!.id}` : '/api/cards', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not save card');
      router.push(`/cards/${data.card.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save card');
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Panel>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-heading text-lg font-semibold">{isEdit ? 'Edit card' : 'New vocabulary card'}</h2>
            <p className="text-sm text-ink-soft">Build it fully by hand, fully with AI, or mix both — field by field.</p>
          </div>
          <Button type="button" variant="primary" loading={generatingFull} disabled={!aiConfigured} onClick={handleGenerateFullCard} title={aiConfigured ? 'Draft the whole card with AI' : 'Set OPENAI_API_KEY on the server to enable AI'}>
            ✨ Generate full card with AI
          </Button>
        </div>

        <FieldWrapper>
          <FieldLabel htmlFor="vocabulary" action={<CambridgeLookupLink word={form.vocabulary} />}>
            Vocabulary
          </FieldLabel>
          <TextInput id="vocabulary" required value={form.vocabulary} onChange={(e) => set('vocabulary', e.target.value)} placeholder="e.g. resilient" />
        </FieldWrapper>

        <FieldWrapper>
          <FieldLabel
            htmlFor="ipa"
            hint="IPA / phonetic spelling"
            action={
              <span className="flex items-center gap-2">
                <Button type="button" variant="outline" size="sm" onClick={handleLookupPronunciation}>
                  🔎 Look up
                </Button>
                <AIFieldButton field="ipa" word={form.vocabulary} disabled={!aiConfigured} onResult={(r) => set('ipa', String(r.ipa ?? ''))} />
              </span>
            }
          >
            Pronunciation
          </FieldLabel>
          <div className="flex items-center gap-3">
            <TextInput id="ipa" value={form.ipa} onChange={(e) => set('ipa', e.target.value)} placeholder="/rɪˈzɪliənt/" className="max-w-xs font-mono" />
            <PronunciationPlayer word={form.vocabulary || 'word'} ipa="" audioUrl={form.audioUrl} />
          </div>
        </FieldWrapper>

        {/* Each new card starts with exactly one meaning, rendered inline
            (no "Meanings" section, no box) so a simple single-sense card —
            most of them — is just one continuous set of fields, same as
            Vocabulary/Pronunciation above. A box only appears once there's
            more than one meaning to tell apart; "+ Add another meaning"
            below opens one. */}
        {form.meanings.map((meaning, mi) => (
          <MeaningBlock
            key={mi}
            index={mi}
            meaning={meaning}
            word={form.vocabulary}
            aiConfigured={aiConfigured}
            boxed={form.meanings.length > 1}
            onChange={(patch) => updateMeaning(mi, patch)}
            onRemove={() => removeMeaning(mi)}
            onExampleChange={(ei, text) => updateMeaningExample(mi, ei, text)}
            onExampleAdd={() => addMeaningExample(mi)}
            onExampleRemove={(ei) => removeMeaningExample(mi, ei)}
          />
        ))}

        <FieldWrapper>
          <FieldLabel htmlFor="collocations" action={<AIFieldButton field="collocations" word={form.vocabulary} context={primaryContext} disabled={!aiConfigured} onResult={(r) => set('collocations', String(r.collocations ?? ''))} />}>
            Collocations & Context
          </FieldLabel>
          <TextInput id="collocations" value={form.collocations} onChange={(e) => set('collocations', e.target.value)} placeholder="remain resilient, resilient economy, emotionally resilient" />
        </FieldWrapper>

        <FieldWrapper>
          <FieldLabel htmlFor="mnemonic" action={<AIFieldButton field="mnemonic" word={form.vocabulary} context={primaryContext} disabled={!aiConfigured} onResult={(r) => set('mnemonic', String(r.mnemonic ?? ''))} />}>
            Memory Hook / Mnemonic
          </FieldLabel>
          <TextArea id="mnemonic" rows={2} value={form.mnemonic} onChange={(e) => set('mnemonic', e.target.value)} placeholder="Picture a RE-SILIENT rubber ball bouncing right back after every hit." />
        </FieldWrapper>

        <FieldWrapper>
          <FieldLabel htmlFor="notes">Notes (optional)</FieldLabel>
          <TextArea id="notes" rows={2} value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Anything else you want to remember…" />
        </FieldWrapper>

        <div className="mb-5 border-t border-line pt-4">
          <Button type="button" variant="outline" size="sm" onClick={addMeaning}>
            + Add another meaning
          </Button>
          <p className="mt-1.5 text-xs text-ink-soft">
            For a different part of speech (object noun vs. verb) or another sense of the same one (make out: perceive / fare / kiss).
          </p>
        </div>

        {notice && <p className="mb-3 rounded-lg bg-success/10 px-3 py-2 text-sm text-success">{notice}</p>}
        {error && <p className="mb-3 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
        {!aiConfigured && (
          <p className="mb-3 rounded-lg bg-warn/10 px-3 py-2 text-sm text-warn">
            AI features are disabled — set <code className="font-mono">OPENAI_API_KEY</code> on the server to enable auto-fill.
          </p>
        )}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" loading={saving}>
            {isEdit ? 'Save changes' : 'Create card'}
          </Button>
        </div>
      </Panel>
    </form>
  );
}

/**
 * One meaning's fields. For the common case — a word with a single sense
 * — `boxed` is false and this renders inline as part of the normal form
 * flow, exactly like the Vocabulary/Pronunciation fields above it, so a
 * simple card doesn't feel like a nested sub-form. Once there's more than
 * one meaning, each gets a light bordered box headed by the word itself
 * (repeating it, the way a dictionary repeats the headword on each entry)
 * plus a remove button. Pronunciation override, sense label, and CEFR
 * level are the more dictionary-specific fields — most cards don't need
 * them — so they live behind a collapsed "More fields" disclosure rather
 * than adding three more rows to every meaning. Tags sit last, at the
 * bottom of the block, since they describe this specific sense.
 */
function MeaningBlock({
  index,
  meaning,
  word,
  aiConfigured,
  boxed,
  onChange,
  onRemove,
  onExampleChange,
  onExampleAdd,
  onExampleRemove,
}: {
  index: number;
  meaning: MeaningFormState;
  word: string;
  aiConfigured: boolean;
  boxed: boolean;
  onChange: (patch: Partial<MeaningFormState>) => void;
  onRemove: () => void;
  onExampleChange: (exampleIndex: number, text: string) => void;
  onExampleAdd: () => void;
  onExampleRemove: (exampleIndex: number) => void;
}) {
  const context = { definitionEn: meaning.definitionEn, partOfSpeech: meaning.partOfSpeech };

  const content = (
    <>
      {boxed && (
        <div className="mb-3 flex items-center justify-between">
          <span className="font-heading text-base font-semibold text-ink">{word.trim() || 'This word'}</span>
          <Button type="button" variant="ghost" size="sm" onClick={onRemove}>
            🗑️ Remove
          </Button>
        </div>
      )}

      <FieldWrapper>
        <FieldLabel
          htmlFor={`pos-${index}`}
          action={<AIFieldButton field="partOfSpeech" word={word} context={context} disabled={!aiConfigured} onResult={(r) => onChange({ partOfSpeech: r.partOfSpeech as PartOfSpeech })} />}
        >
          Part of Speech
        </FieldLabel>
        <Select id={`pos-${index}`} value={meaning.partOfSpeech} onChange={(e) => onChange({ partOfSpeech: e.target.value as PartOfSpeech | '' })} className="max-w-xs">
          <option value="">Select…</option>
          {PARTS_OF_SPEECH.map((p) => (
            <option key={p} value={p}>
              {PART_OF_SPEECH_LABELS[p]}
            </option>
          ))}
        </Select>
      </FieldWrapper>

      <div className="grid gap-4 sm:grid-cols-2">
        <FieldWrapper>
          <FieldLabel
            htmlFor={`def-en-${index}`}
            action={<AIFieldButton field="definitionEn" word={word} context={context} disabled={!aiConfigured} onResult={(r) => onChange({ definitionEn: String(r.definitionEn ?? '') })} />}
          >
            Definition (English)
          </FieldLabel>
          <TextArea
            id={`def-en-${index}`}
            rows={3}
            value={meaning.definitionEn}
            onChange={(e) => onChange({ definitionEn: e.target.value })}
            placeholder="Able to recover quickly from difficulties."
          />
        </FieldWrapper>
        <FieldWrapper>
          <FieldLabel
            htmlFor={`def-tr-${index}`}
            action={<AIFieldButton field="definitionTr" word={word} context={context} disabled={!aiConfigured} onResult={(r) => onChange({ definitionTr: String(r.definitionTr ?? '') })} />}
          >
            Turkish translation
          </FieldLabel>
          <TextArea
            id={`def-tr-${index}`}
            rows={3}
            value={meaning.definitionTr}
            onChange={(e) => onChange({ definitionTr: e.target.value })}
            placeholder="Zorluklardan çabuk toparlanabilen, dirençli."
          />
        </FieldWrapper>
      </div>

      <FieldWrapper>
        <FieldLabel
          action={
            <AIFieldButton
              field="examples"
              word={word}
              context={context}
              disabled={!aiConfigured}
              label="AI fill"
              onResult={(r) => {
                const sentences = r.exampleSentences as string[] | undefined;
                if (sentences?.length) onChange({ examples: sentences });
              }}
            />
          }
        >
          Example Sentences
        </FieldLabel>
        <div className="space-y-2">
          {meaning.examples.map((ex, ei) => {
            const spans = word.trim() ? findWordSpans(ex, word.trim()) : [];
            return (
              <div key={ei} className="space-y-1">
                <div className="flex items-start gap-2">
                  <TextArea rows={2} value={ex} onChange={(e) => onExampleChange(ei, e.target.value)} placeholder="Write a sentence using the word…" />
                  <Button type="button" variant="ghost" size="sm" onClick={() => onExampleRemove(ei)} aria-label="Remove sentence">
                    🗑️
                  </Button>
                </div>
                {ex.trim() && (
                  <p className="rounded-lg bg-paper-alt px-3 py-1.5 text-sm text-ink-soft">
                    Preview: <HighlightedSentence text={ex} highlightSpans={serializeSpans(spans)} />
                  </p>
                )}
              </div>
            );
          })}
          <Button type="button" variant="outline" size="sm" onClick={onExampleAdd}>
            + Add sentence
          </Button>
        </div>
      </FieldWrapper>

      <div className="grid gap-4 sm:grid-cols-2">
        <FieldWrapper>
          <FieldLabel
            htmlFor={`syn-${index}`}
            hint="optional"
            action={<AIFieldButton field="synonyms" word={word} context={context} disabled={!aiConfigured} onResult={(r) => onChange({ synonyms: String(r.synonyms ?? '') })} />}
          >
            Synonyms
          </FieldLabel>
          <TextInput id={`syn-${index}`} value={meaning.synonyms} onChange={(e) => onChange({ synonyms: e.target.value })} placeholder="hardy, tough, adaptable" />
        </FieldWrapper>
        <FieldWrapper>
          <FieldLabel
            htmlFor={`ant-${index}`}
            hint="optional"
            action={<AIFieldButton field="antonyms" word={word} context={context} disabled={!aiConfigured} onResult={(r) => onChange({ antonyms: String(r.antonyms ?? '') })} />}
          >
            Antonyms
          </FieldLabel>
          <TextInput id={`ant-${index}`} value={meaning.antonyms} onChange={(e) => onChange({ antonyms: e.target.value })} placeholder="fragile, vulnerable" />
        </FieldWrapper>
      </div>

      <details className="group">
        <summary className="flex cursor-pointer list-none items-center gap-1 text-xs font-medium text-ink-soft [&::-webkit-details-marker]:hidden">
          <span className="inline-block transition-transform group-open:rotate-90">▸</span>
          More fields — pronunciation, sense label, CEFR level
        </summary>
        <div className="mt-3 grid gap-4 sm:grid-cols-3">
          <FieldWrapper>
            <FieldLabel
              htmlFor={`ipa-${index}`}
              hint="if different from the pronunciation above"
              action={<AIFieldButton field="ipa" word={word} context={context} disabled={!aiConfigured} onResult={(r) => onChange({ ipa: String(r.ipa ?? '') })} />}
            >
              Pronunciation
            </FieldLabel>
            <TextInput id={`ipa-${index}`} value={meaning.ipa} onChange={(e) => onChange({ ipa: e.target.value })} placeholder="/əbˈdʒɛkt/" className="font-mono" />
          </FieldWrapper>
          <FieldWrapper>
            <FieldLabel
              htmlFor={`label-${index}`}
              action={<AIFieldButton field="label" word={word} context={context} disabled={!aiConfigured} onResult={(r) => onChange({ label: String(r.label ?? '') })} />}
            >
              Sense label
            </FieldLabel>
            <TextInput id={`label-${index}`} value={meaning.label} onChange={(e) => onChange({ label: e.target.value })} placeholder="e.g. THING, PURPOSE" />
          </FieldWrapper>
          <FieldWrapper>
            <FieldLabel
              htmlFor={`cefr-${index}`}
              action={<AIFieldButton field="cefr" word={word} context={context} disabled={!aiConfigured} onResult={(r) => onChange({ cefr: r.cefr as CefrLevel })} />}
            >
              CEFR level
            </FieldLabel>
            <Select id={`cefr-${index}`} value={meaning.cefr} onChange={(e) => onChange({ cefr: e.target.value as CefrLevel | '' })}>
              <option value="">—</option>
              {CEFR_LEVELS.map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </Select>
          </FieldWrapper>
        </div>
      </details>

      <FieldWrapper>
        <FieldLabel htmlFor={`tags-${index}`}>Tags</FieldLabel>
        <TagInput value={meaning.tags} onChange={(tags) => onChange({ tags })} />
      </FieldWrapper>
    </>
  );

  if (!boxed) return <div className="space-y-1">{content}</div>;

  return <div className="mb-5 rounded-xl border border-line bg-paper p-4">{content}</div>;
}
