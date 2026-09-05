import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { Statement } from '@/lib/types';

type VoteResult =
  | { ok: true; needsAuth: false; action: 'cast' | 'changed' | 'removed' }
  | { ok: false; needsAuth: boolean };

export function useInlineVoting(rawStatements: Statement[]) {
  const { user } = useAuth();
  const [statements, setStatements] = useState<Statement[]>(rawStatements);
  const [myVotes, setMyVotes] = useState<Record<string, 'agree' | 'disagree'>>({});
  const [votingId, setVotingId] = useState<string | null>(null);

  const idsKey = rawStatements.map((s) => s.id).join(',');

  useEffect(() => {
    setStatements(rawStatements);
  }, [rawStatements]);

  useEffect(() => {
    if (!user || !idsKey) {
      setMyVotes({});
      return;
    }
    const ids = idsKey.split(',');
    supabase
      .from('votes')
      .select('statement_id, value')
      .eq('user_id', user.id)
      .in('statement_id', ids)
      .then(({ data }) => {
        const map: Record<string, 'agree' | 'disagree'> = {};
        (data ?? []).forEach(
          (v: { statement_id: string; value: 'agree' | 'disagree' }) => {
            map[v.statement_id] = v.value;
          },
        );
        setMyVotes(map);
      });
  }, [user, idsKey]);

  const vote = useCallback(
    async (statementId: string, value: 'agree' | 'disagree'): Promise<VoteResult> => {
      if (!user) return { ok: false, needsAuth: true };
      setVotingId(statementId);
      const current = myVotes[statementId];
      try {
        let error: { message: string } | null = null;
        if (current === value) {
          ({ error } = await supabase
            .from('votes')
            .delete()
            .eq('statement_id', statementId)
            .eq('user_id', user.id));
        } else if (current) {
          ({ error } = await supabase
            .from('votes')
            .update({ value, updated_at: new Date().toISOString() })
            .eq('statement_id', statementId)
            .eq('user_id', user.id));
        } else {
          ({ error } = await supabase
            .from('votes')
            .insert({ statement_id: statementId, user_id: user.id, value }));
        }
        if (error) return { ok: false, needsAuth: false };

        if (current === value) {
          setMyVotes((prev) => {
            const next = { ...prev };
            delete next[statementId];
            return next;
          });
          setStatements((prev) =>
            prev.map((s) =>
              s.id !== statementId
                ? s
                : {
                    ...s,
                    agree_count:
                      value === 'agree' ? s.agree_count - 1 : s.agree_count,
                    disagree_count:
                      value === 'disagree'
                        ? s.disagree_count - 1
                        : s.disagree_count,
                    total_votes: s.total_votes - 1,
                  },
            ),
          );
          return { ok: true, needsAuth: false, action: 'removed' as const };
        } else if (current) {
          setMyVotes((prev) => ({ ...prev, [statementId]: value }));
          setStatements((prev) =>
            prev.map((s) =>
              s.id !== statementId
                ? s
                : {
                    ...s,
                    agree_count:
                      value === 'agree'
                        ? s.agree_count + 1
                        : s.agree_count - 1,
                    disagree_count:
                      value === 'disagree'
                        ? s.disagree_count + 1
                        : s.disagree_count - 1,
                  },
            ),
          );
          return { ok: true, needsAuth: false, action: 'changed' as const };
        } else {
          setMyVotes((prev) => ({ ...prev, [statementId]: value }));
          setStatements((prev) =>
            prev.map((s) =>
              s.id !== statementId
                ? s
                : {
                    ...s,
                    agree_count:
                      value === 'agree' ? s.agree_count + 1 : s.agree_count,
                    disagree_count:
                      value === 'disagree'
                        ? s.disagree_count + 1
                        : s.disagree_count,
                    total_votes: s.total_votes + 1,
                  },
            ),
          );
          return { ok: true, needsAuth: false, action: 'cast' as const };
        }
      } finally {
        setVotingId(null);
      }
    },
    [user, myVotes],
  );

  return { statements, myVotes, votingId, vote };
}
