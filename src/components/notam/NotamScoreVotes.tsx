'use client';

import { useState } from 'react';
import { ThumbsDown, ThumbsUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { voteNotamTarget } from '@/lib/notam/api';

const styles = {
  text: '#37322f',
  textMuted: '#605a57',
  border: '#e0dedb',
};

export function NotamScoreVotes({
  targetType,
  targetId,
  score,
  myVote,
  disabled,
  onChanged,
}: {
  targetType: 'notam' | 'reply';
  targetId: string;
  score: number;
  myVote: number;
  disabled?: boolean;
  onChanged: () => Promise<void> | void;
}) {
  const [busy, setBusy] = useState(false);

  const cast = async (value: 1 | -1) => {
    setBusy(true);
    try {
      await voteNotamTarget(targetType, targetId, value);
      await onChanged();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="inline-flex items-center gap-1">
      <Button
        type="button"
        size="sm"
        variant={myVote === 1 ? 'default' : 'outline'}
        disabled={disabled || busy}
        onClick={() => cast(1)}
        style={
          myVote === 1 ? { backgroundColor: styles.text, color: '#fbfaf9' } : undefined
        }
        title="Pouce en l air (+1)"
      >
        <ThumbsUp className="h-3.5 w-3.5" />
      </Button>
      <span
        className="min-w-[2rem] text-center text-sm font-semibold"
        style={{ color: styles.text }}
      >
        {score}
      </span>
      <Button
        type="button"
        size="sm"
        variant={myVote === -1 ? 'default' : 'outline'}
        disabled={disabled || busy}
        onClick={() => cast(-1)}
        style={
          myVote === -1 ? { backgroundColor: '#9a3412', color: '#fff7ed' } : undefined
        }
        title="Pouce en bas (-1)"
      >
        <ThumbsDown className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
