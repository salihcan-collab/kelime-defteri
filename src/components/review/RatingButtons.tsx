'use client';

import { Button } from '@/components/ui/Button';
import type { ReviewRating } from '@/types';

const RATINGS: { rating: ReviewRating; label: string; hint: string; className: string }[] = [
  { rating: 'AGAIN', label: 'Again', hint: '< 1 min', className: 'bg-danger text-white hover:opacity-90' },
  { rating: 'HARD', label: 'Hard', hint: 'soon', className: 'bg-warn text-white hover:opacity-90' },
  { rating: 'GOOD', label: 'Good', hint: 'later', className: 'bg-accent text-accent-ink hover:opacity-90' },
  { rating: 'EASY', label: 'Easy', hint: 'much later', className: 'bg-success text-white hover:opacity-90' },
];

export function RatingButtons({ onRate, disabled }: { onRate: (rating: ReviewRating) => void; disabled?: boolean }) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {RATINGS.map((r) => (
        <Button key={r.rating} type="button" disabled={disabled} onClick={() => onRate(r.rating)} className={r.className} size="lg">
          <span className="flex flex-col items-center">
            <span className="text-2xl font-bold">{r.label}</span>
            <span className="text-[10px] font-normal opacity-80">{r.hint}</span>
          </span>
        </Button>
      ))}
    </div>
  );
}
