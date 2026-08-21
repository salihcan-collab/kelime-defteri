'use client';

import { useMemo, useState } from 'react';
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
import { groupMeaningsByPos } from '@/lib/meaningGroups';
import { CEFR_LEVELS, PART_OF_SPEECH_LABELS, PARTS_OF_SPEECH } from '@/types';
import type { CardWithRelations, CefrLevel, PartOfSpeech } from '@/types';

const SENSE_LETTERS = 'abcdefghijklmnopqrstuvwxyz';

interface MeaningFormState {
  partOfSpeech: PartOfSpeech | '';
  ipa: string;
  label: string;
  cefr: CefrLevel | '';
  definitionEn: string;
  definitionTr: string;
  examples: string[];
}

interface FormState {
  vocabulary: string;
  ipa: string;
  audioUrl: string;
  tags: string[];
  meanings: MeaningFormState[];
  collocations: string;
  synonyms: string;
  antonyms: string;
  mnemonic: string;
  notes: string;
}

const BLANK_MEANING: MeaningFormState = { partOfSpeech: '', ipa: '', label: '', cefr: '', definitionEn: '', definitionTr: '', examples: [''] };

function initialStateFromCard(card?: CardWithRelations): FormState {
  if (!card) {
    return {
      vocabulary: '',
      ipa: '',
      audioUrl: '',
      tags: [],
      meanings: [{ ...BLANK_MEANING }],
      collocations: '',
      synonyms: '',
      antonyms: '',
      mnemonic: '',
      notes: '',
    };
  }
  return {
    vocabulary: card.vocabulary,
    ipa: card.ipa ?? '',
    audioUrl: card.audioUrl ?? '',
    tags: card.tags.map((t) => t.tag.name),
    meanings: card.meanings.length
      ? card.meanings.map((m) => ({
          partOfSpeech: m.partOfSpeech ?? '',
          ipa: m.ipa ?? '',
          label: m.label ?? '',
          cefr: m.cefr ?? '',
          definitionEn: m.definitionEn ?? '',
          definitionTr: m.definitionTr ?? '',
          examples: m.examples.length ? m.examples.map((e) => e.text) : [''],
        }))
      : [{ ...BLANK_MEANING }],
    collocations: card.collocations ?? '',
    synonyms: card.synonyms ?? '',
    antonyms: card.antonyms ?? '',
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

  // Context for card-level AI fields (mnemonic/collocations/synonyms/antonyms) —
  // grounded in the primary (first) meaning, since that's the sense being memorized.
  const primaryContext = useMemo(
    () => ({ definitionEn: form.meanings[0]?.definitionEn, partOfSpeech: form.meanings[0]?.partOfSpeech }),
    [form.meanings],
  );

  function updateMeaning(index: number, patch: Partial<MeaningFormState>) {
    setForm((prev) => ({ ...prev, meanings: prev.meanings.map((m, i) => (i === index ? { ...m, ...patch } : m)) }));
  }
  /** Adds a new blank sense, optionally pre-assigned to a part of speech so it joins that group immediately. */
  function addMeaning(partOfSpeech: PartOfSpeech | '' = '') {
    setForm((prev) => ({ ...prev, meanings: [...prev.meanings, { ...BLANK_MEANING, partOfSpeech, examples: [''] }] }));
  }
  /** Changing the shared "Part of Speech" select for a group re-tags every sense currently in it. */
  function updateGroupPartOfSpeech(indices: number[], partOfSpeech: PartOfSpeech | '') {
    setForm((prev) => ({
      ...prev,
      meanings: prev.meanings.map((m, i) => (indices.includes(i) ? { ...m, partOfSpeech } : m)),
    }));
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
          examples: draft.exampleSentences?.length ? draft.exampleSentences : meanings[0].examples,
        };
        return {
          ...prev,
          ipa: draft.ipa ?? prev.ipa,
          audioUrl: draft.audioUrl ?? prev.audioUrl,
          mnemonic: draft.mnemonic ?? prev.mnemonic,
          collocations: draft.collocations ?? prev.collocations,
          synonyms: draft.synonyms || prev.synonyms,
          antonyms: draft.antonyms || prev.antonyms,
          meanings,
          tags: Array.from(new Set([...prev.tags, ...(draft.suggestedTags ?? [])])),
        };
      });
      setNotice(
        'AI drafted the primary meaning — review and tweak it, then use "+ Add another sense" or "+ Add a different part of speech" below if the word has other common meanings.',
      );
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
      synonyms: form.synonyms || null,
      antonyms: form.antonyms || null,
      notes: form.notes || null,
      tags: form.tags,
      meanings: form.meanings.map((m) => ({
        partOfSpeech: m.partOfSpeech || null,
        ipa: m.ipa || null,
        label: m.label || null,
        cefr: m.cefr || null,
        definitionEn: m.definitionEn || null,
        definitionTr: m.definitionTr || null,
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

  const meaningGroups = groupMeaningsByPos(form.meanings);

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

        <FieldWrapper>
          <FieldLabel htmlFor="tags">Tags</FieldLabel>
          <TagInput value={form.tags} onChange={(tags) => set('tags', tags)} />
        </FieldWrapper>

        <div className="mb-4 mt-6 border-t border-line pt-5">
          <FieldLabel hint="Grouped by part of speech — e.g. object (noun) vs. object (verb). Within a part of speech, add another sense for words like make out (perceive / fare / kiss).">
            Meanings
          </FieldLabel>
          <div className="space-y-4">
            {meaningGroups.map((group, gi) => (
              <MeaningGroupBlock
                key={group.partOfSpeech ?? `blank-${gi}`}
                group={group}
                groupIndex={gi}
                totalGroups={meaningGroups.length}
                word={form.vocabulary}
                aiConfigured={aiConfigured}
                canRemoveSense={form.meanings.length > 1}
                onPosChange={(pos) => updateGroupPartOfSpeech(group.items.map((it) => it.index), pos)}
                onIpaChange={(ipa) => updateMeaning(group.items[0].index, { ipa })}
                onAddSense={() => addMeaning(group.partOfSpeech ?? '')}
                onChange={updateMeaning}
                onRemove={removeMeaning}
                onExampleChange={updateMeaningExample}
                onExampleAdd={addMeaningExample}
                onExampleRemove={removeMeaningExample}
              />
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => addMeaning('')}>
              + Add a different part of speech
            </Button>
          </div>
        </div>

        <FieldWrapper>
          <FieldLabel htmlFor="collocations" action={<AIFieldButton field="collocations" word={form.vocabulary} context={primaryContext} disabled={!aiConfigured} onResult={(r) => set('collocations', String(r.collocations ?? ''))} />}>
            Collocations & Context
          </FieldLabel>
          <TextInput id="collocations" value={form.collocations} onChange={(e) => set('collocations', e.target.value)} placeholder="remain resilient, resilient economy, emotionally resilient" />
        </FieldWrapper>

        <div className="grid gap-4 sm:grid-cols-2">
          <FieldWrapper>
            <FieldLabel htmlFor="synonyms" hint="optional" action={<AIFieldButton field="synonyms" word={form.vocabulary} context={primaryContext} disabled={!aiConfigured} onResult={(r) => set('synonyms', String(r.synonyms ?? ''))} />}>
              Synonyms
            </FieldLabel>
            <TextInput id="synonyms" value={form.synonyms} onChange={(e) => set('synonyms', e.target.value)} placeholder="hardy, tough, adaptable" />
          </FieldWrapper>
          <FieldWrapper>
            <FieldLabel htmlFor="antonyms" hint="optional" action={<AIFieldButton field="antonyms" word={form.vocabulary} context={primaryContext} disabled={!aiConfigured} onResult={(r) => set('antonyms', String(r.antonyms ?? ''))} />}>
              Antonyms
            </FieldLabel>
            <TextInput id="antonyms" value={form.antonyms} onChange={(e) => set('antonyms', e.target.value)} placeholder="fragile, vulnerable" />
          </FieldWrapper>
        </div>

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
 * One part-of-speech group in the editor — a shared "Part of Speech" +
 * "Pronunciation" pair up top (stress often shifts by word class, e.g.
 * "OB-ject" noun vs. "ob-JECT" verb), then one MeaningBlock per sense
 * within that part of speech. Re-derived from form.meanings on every
 * render (see groupMeaningsByPos), so changing a sense's part of speech
 * moves it into a different group automatically.
 */
function MeaningGroupBlock({
  group,
  groupIndex,
  totalGroups,
  word,
  aiConfigured,
  canRemoveSense,
  onPosChange,
  onIpaChange,
  onAddSense,
  onChange,
  onRemove,
  onExampleChange,
  onExampleAdd,
  onExampleRemove,
}: {
  group: ReturnType<typeof groupMeaningsByPos<MeaningFormState>>[number];
  groupIndex: number;
  totalGroups: number;
  word: string;
  aiConfigured: boolean;
  canRemoveSense: boolean;
  onPosChange: (pos: PartOfSpeech | '') => void;
  onIpaChange: (ipa: string) => void;
  onAddSense: () => void;
  onChange: (index: number, patch: Partial<MeaningFormState>) => void;
  onRemove: (index: number) => void;
  onExampleChange: (index: number, exampleIndex: number, text: string) => void;
  onExampleAdd: (index: number) => void;
  onExampleRemove: (index: number, exampleIndex: number) => void;
}) {
  const groupContext = { partOfSpeech: group.partOfSpeech ?? '' };
  const firstIpa = group.items[0].meaning.ipa;

  return (
    <div className="rounded-2xl border-2 border-line/70 p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
          Part of speech {totalGroups > 1 && `— ${groupIndex + 1} of ${totalGroups}`}
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FieldWrapper>
          <FieldLabel
            htmlFor={`pos-${groupIndex}`}
            action={<AIFieldButton field="partOfSpeech" word={word} context={{ definitionEn: group.items[0].meaning.definitionEn }} disabled={!aiConfigured} onResult={(r) => onPosChange(r.partOfSpeech as PartOfSpeech)} />}
          >
            Part of Speech
          </FieldLabel>
          <Select id={`pos-${groupIndex}`} value={group.partOfSpeech ?? ''} onChange={(e) => onPosChange(e.target.value as PartOfSpeech | '')}>
            <option value="">Select…</option>
            {PARTS_OF_SPEECH.map((p) => (
              <option key={p} value={p}>
                {PART_OF_SPEECH_LABELS[p]}
              </option>
            ))}
          </Select>
        </FieldWrapper>
        <FieldWrapper>
          <FieldLabel
            htmlFor={`group-ipa-${groupIndex}`}
            hint="optional — only if it differs from the word's main pronunciation"
            action={<AIFieldButton field="ipa" word={word} context={groupContext} disabled={!aiConfigured} onResult={(r) => onIpaChange(String(r.ipa ?? ''))} />}
          >
            Pronunciation for this part of speech
          </FieldLabel>
          <TextInput id={`group-ipa-${groupIndex}`} value={firstIpa} onChange={(e) => onIpaChange(e.target.value)} placeholder="/əbˈdʒɛkt/" className="font-mono" />
        </FieldWrapper>
      </div>

      <div className="mt-4 space-y-4">
        {group.items.map(({ meaning, index }, si) => (
          <MeaningBlock
            key={index}
            index={index}
            meaning={meaning}
            word={word}
            aiConfigured={aiConfigured}
            senseLetter={group.items.length > 1 ? SENSE_LETTERS[si] ?? String(si + 1) : null}
            removable={canRemoveSense}
            onChange={(patch) => onChange(index, patch)}
            onRemove={() => onRemove(index)}
            onExampleChange={(ei, text) => onExampleChange(index, ei, text)}
            onExampleAdd={() => onExampleAdd(index)}
            onExampleRemove={(ei) => onExampleRemove(index, ei)}
          />
        ))}
        <Button type="button" variant="outline" size="sm" onClick={onAddSense}>
          + Add another sense for this part of speech
        </Button>
      </div>
    </div>
  );
}

function MeaningBlock({
  index,
  meaning,
  word,
  aiConfigured,
  senseLetter,
  removable,
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
  senseLetter: string | null;
  removable: boolean;
  onChange: (patch: Partial<MeaningFormState>) => void;
  onRemove: () => void;
  onExampleChange: (exampleIndex: number, text: string) => void;
  onExampleAdd: () => void;
  onExampleRemove: (exampleIndex: number) => void;
}) {
  const context = { definitionEn: meaning.definitionEn, partOfSpeech: meaning.partOfSpeech };

  return (
    <div className="rounded-xl border border-line bg-paper p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-ink-soft">
          {senseLetter ? (
            <>
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[11px] font-semibold normal-case text-accent">
                {senseLetter}
              </span>
              Sense {senseLetter}
            </>
          ) : (
            'Meaning'
          )}
        </span>
        {removable && (
          <Button type="button" variant="ghost" size="sm" onClick={onRemove}>
            🗑️ Remove {senseLetter ? 'sense' : 'meaning'}
          </Button>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FieldWrapper>
          <FieldLabel
            htmlFor={`label-${index}`}
            hint="optional"
            action={<AIFieldButton field="label" word={word} context={context} disabled={!aiConfigured} onResult={(r) => onChange({ label: String(r.label ?? '') })} />}
          >
            Sense label
          </FieldLabel>
          <TextInput id={`label-${index}`} value={meaning.label} onChange={(e) => onChange({ label: e.target.value })} placeholder="e.g. THING, PURPOSE, CAUSE" />
        </FieldWrapper>
        <FieldWrapper>
          <FieldLabel
            htmlFor={`cefr-${index}`}
            hint="optional"
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

      <div className="grid gap-4 sm:grid-cols-2">
        <FieldWrapper>
          <FieldLabel
            htmlFor={`def-en-${index}`}
            action={<AIFieldButton field="definitionEn" word={word} context={context} disabled={!aiConfigured} onResult={(r) => onChange({ definitionEn: String(r.definitionEn ?? '') })} />}
          >
            Definition / Meaning (English)
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
    </div>
  );
}
