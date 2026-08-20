'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Panel } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { FieldLabel, FieldWrapper, Select, TextArea, TextInput } from '@/components/ui/Field';
import { TagInput } from '@/components/vocab/TagInput';
import { AIFieldButton } from '@/components/vocab/AIFieldButton';
import { HighlightedSentence } from '@/components/vocab/HighlightedSentence';
import { PronunciationPlayer } from '@/components/vocab/PronunciationPlayer';
import { findWordSpans, serializeSpans } from '@/lib/highlight';
import { PART_OF_SPEECH_LABELS, PARTS_OF_SPEECH } from '@/types';
import type { CardWithRelations, PartOfSpeech } from '@/types';

interface FormState {
  vocabulary: string;
  ipa: string;
  audioUrl: string;
  definitionEn: string;
  definitionTr: string;
  partOfSpeech: PartOfSpeech | '';
  mnemonic: string;
  collocations: string;
  notes: string;
  tags: string[];
  examples: string[];
}

function initialStateFromCard(card?: CardWithRelations): FormState {
  if (!card) {
    return {
      vocabulary: '',
      ipa: '',
      audioUrl: '',
      definitionEn: '',
      definitionTr: '',
      partOfSpeech: '',
      mnemonic: '',
      collocations: '',
      notes: '',
      tags: [],
      examples: [''],
    };
  }
  return {
    vocabulary: card.vocabulary,
    ipa: card.ipa ?? '',
    audioUrl: card.audioUrl ?? '',
    definitionEn: card.definitionEn ?? '',
    definitionTr: card.definitionTr ?? '',
    partOfSpeech: card.partOfSpeech ?? '',
    mnemonic: card.mnemonic ?? '',
    collocations: card.collocations ?? '',
    notes: card.notes ?? '',
    tags: card.tags.map((t) => t.tag.name),
    examples: card.examples.length ? card.examples.map((e) => e.text) : [''],
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

  const context = useMemo(() => ({ definitionEn: form.definitionEn, partOfSpeech: form.partOfSpeech }), [form.definitionEn, form.partOfSpeech]);

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
      setForm((prev) => ({
        ...prev,
        ipa: draft.ipa ?? prev.ipa,
        audioUrl: draft.audioUrl ?? prev.audioUrl,
        definitionEn: draft.definitionEn ?? prev.definitionEn,
        definitionTr: draft.definitionTr ?? prev.definitionTr,
        partOfSpeech: draft.partOfSpeech ?? prev.partOfSpeech,
        mnemonic: draft.mnemonic ?? prev.mnemonic,
        collocations: draft.collocations ?? prev.collocations,
        examples: draft.exampleSentences?.length ? draft.exampleSentences : prev.examples,
        tags: Array.from(new Set([...prev.tags, ...(draft.suggestedTags ?? [])])),
      }));
      setNotice('AI drafted the whole card — review and tweak anything before saving.');
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

  function updateExample(index: number, text: string) {
    setForm((prev) => ({ ...prev, examples: prev.examples.map((e, i) => (i === index ? text : e)) }));
  }
  function addExample() {
    setForm((prev) => ({ ...prev, examples: [...prev.examples, ''] }));
  }
  function removeExample(index: number) {
    setForm((prev) => ({ ...prev, examples: prev.examples.filter((_, i) => i !== index) }));
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
      definitionEn: form.definitionEn || null,
      definitionTr: form.definitionTr || null,
      partOfSpeech: form.partOfSpeech || null,
      mnemonic: form.mnemonic || null,
      collocations: form.collocations || null,
      notes: form.notes || null,
      tags: form.tags,
      examples: form.examples.filter((e) => e.trim()).map((text) => ({ text, source: 'USER' as const })),
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
      <Panel className="notebook-lines">
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
          <FieldLabel htmlFor="vocabulary">Vocabulary</FieldLabel>
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

        <div className="grid gap-4 sm:grid-cols-2">
          <FieldWrapper>
            <FieldLabel htmlFor="definitionEn" action={<AIFieldButton field="definitionEn" word={form.vocabulary} disabled={!aiConfigured} onResult={(r) => set('definitionEn', String(r.definitionEn ?? ''))} />}>
              Definition / Meaning (English)
            </FieldLabel>
            <TextArea id="definitionEn" rows={3} value={form.definitionEn} onChange={(e) => set('definitionEn', e.target.value)} placeholder="Able to recover quickly from difficulties." />
          </FieldWrapper>
          <FieldWrapper>
            <FieldLabel htmlFor="definitionTr" action={<AIFieldButton field="definitionTr" word={form.vocabulary} context={context} disabled={!aiConfigured} onResult={(r) => set('definitionTr', String(r.definitionTr ?? ''))} />}>
              Turkish translation
            </FieldLabel>
            <TextArea id="definitionTr" rows={3} value={form.definitionTr} onChange={(e) => set('definitionTr', e.target.value)} placeholder="Zorluklardan çabuk toparlanabilen, dirençli." />
          </FieldWrapper>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FieldWrapper>
            <FieldLabel htmlFor="partOfSpeech" action={<AIFieldButton field="partOfSpeech" word={form.vocabulary} context={context} disabled={!aiConfigured} onResult={(r) => set('partOfSpeech', r.partOfSpeech as PartOfSpeech)} />}>
              Parts of Speech
            </FieldLabel>
            <Select id="partOfSpeech" value={form.partOfSpeech} onChange={(e) => set('partOfSpeech', e.target.value as PartOfSpeech | '')}>
              <option value="">Select…</option>
              {PARTS_OF_SPEECH.map((p) => (
                <option key={p} value={p}>
                  {PART_OF_SPEECH_LABELS[p]}
                </option>
              ))}
            </Select>
          </FieldWrapper>
          <FieldWrapper>
            <FieldLabel htmlFor="tags">Tags</FieldLabel>
            <TagInput value={form.tags} onChange={(tags) => set('tags', tags)} />
          </FieldWrapper>
        </div>

        <FieldWrapper>
          <FieldLabel htmlFor="mnemonic" action={<AIFieldButton field="mnemonic" word={form.vocabulary} context={context} disabled={!aiConfigured} onResult={(r) => set('mnemonic', String(r.mnemonic ?? ''))} />}>
            Memory Hook / Mnemonic
          </FieldLabel>
          <TextArea id="mnemonic" rows={2} value={form.mnemonic} onChange={(e) => set('mnemonic', e.target.value)} placeholder="Picture a RE-SILIENT rubber ball bouncing right back after every hit." />
        </FieldWrapper>

        <FieldWrapper>
          <FieldLabel htmlFor="collocations" action={<AIFieldButton field="collocations" word={form.vocabulary} context={context} disabled={!aiConfigured} onResult={(r) => set('collocations', String(r.collocations ?? ''))} />}>
            Collocations & Context
          </FieldLabel>
          <TextInput id="collocations" value={form.collocations} onChange={(e) => set('collocations', e.target.value)} placeholder="remain resilient, resilient economy, emotionally resilient" />
        </FieldWrapper>

        <FieldWrapper>
          <FieldLabel
            action={
              <AIFieldButton
                field="examples"
                word={form.vocabulary}
                context={context}
                disabled={!aiConfigured}
                label="AI fill"
                onResult={(r) => {
                  const sentences = r.exampleSentences as string[] | undefined;
                  if (sentences?.length) set('examples', sentences);
                }}
              />
            }
          >
            Example Sentences
          </FieldLabel>
          <div className="space-y-2">
            {form.examples.map((ex, i) => {
              const spans = form.vocabulary.trim() ? findWordSpans(ex, form.vocabulary.trim()) : [];
              return (
                <div key={i} className="space-y-1">
                  <div className="flex items-start gap-2">
                    <TextArea rows={2} value={ex} onChange={(e) => updateExample(i, e.target.value)} placeholder="Write a sentence using the word…" />
                    <Button type="button" variant="ghost" size="sm" onClick={() => removeExample(i)} aria-label="Remove sentence">
                      🗑️
                    </Button>
                  </div>
                  {ex.trim() && (
                    <p className="rounded-lg bg-paper px-3 py-1.5 text-sm text-ink-soft">
                      Preview: <HighlightedSentence text={ex} highlightSpans={serializeSpans(spans)} />
                    </p>
                  )}
                </div>
              );
            })}
            <Button type="button" variant="outline" size="sm" onClick={addExample}>
              + Add sentence
            </Button>
          </div>
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
