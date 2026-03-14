/**
 * RoundRobinMatrix — Grid showing who played who with results
 */
export default function RoundRobinMatrix({ rounds = [], participants = [] }) {
  if (!participants.length) return null;

  // Build result map: "pidA_pidB" -> {winner, score}
  const results = {};
  for (const round of rounds) {
    for (const m of round.matches || []) {
      if (m.status === 'completed' && m.player_a && m.player_b) {
        const key = `${m.player_a.player_id}_${m.player_b.player_id}`;
        results[key] = { winner: m.winner_id, score: m.score };
        const rev = `${m.player_b.player_id}_${m.player_a.player_id}`;
        results[rev] = { winner: m.winner_id, score: m.score ? m.score.split('-').reverse().join('-') : '' };
      }
    }
  }

  return (
    <div className="overflow-x-auto">
      <table className="text-[10px] border-collapse">
        <thead>
          <tr>
            <th className="p-1 text-white/40 text-left">Player</th>
            {participants.map(p => (
              <th key={p.player_id} className="p-1 text-white/40 text-center w-10" title={p.nickname}>
                {p.nickname?.substring(0, 3)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {participants.map(row => (
            <tr key={row.player_id}>
              <td className="p-1 text-white/70 font-medium whitespace-nowrap">{row.nickname}</td>
              {participants.map(col => {
                if (row.player_id === col.player_id) {
                  return <td key={col.player_id} className="p-1 text-center bg-white/5">—</td>;
                }
                const key = `${row.player_id}_${col.player_id}`;
                const r = results[key];
                if (!r) return <td key={col.player_id} className="p-1 text-center text-white/20">·</td>;
                const won = r.winner === row.player_id;
                return (
                  <td key={col.player_id} className={`p-1 text-center font-mono ${won ? 'text-green-400 bg-green-500/10' : 'text-red-400 bg-red-500/10'}`}>
                    {r.score || (won ? 'W' : 'L')}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
