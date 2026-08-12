import React from 'react';
import { Download, FileSpreadsheet } from 'lucide-react';
import { CalculatedTeamScore, Round } from '../types';

interface ExportCSVProps {
  scores: CalculatedTeamScore[];
  rounds: Round[];
}

export const ExportCSV: React.FC<ExportCSVProps> = ({ scores, rounds }) => {
  const handleExport = () => {
    if (!scores || scores.length === 0) return;

    // Header row
    let csv = 'Rank,Nama Tim,Total Poin,Total Kills,Total Booyah,Total Placement Pts';

    // Add round headers
    rounds.forEach((r, idx) => {
      csv += `,R${idx + 1} (${r.label}) Placement,R${idx + 1} Kills,R${idx + 1} Booyah,R${idx + 1} Pts`;
    });

    csv += '\n';

    // Data rows
    scores.forEach((sc) => {
      let row = `${sc.rank},"${sc.team.name.replace(/"/g, '""')}",${sc.totalPoints},${sc.totalKill},${sc.totalBooyah},${sc.totalPlacementPoints}`;

      sc.roundBreakdown.forEach((rb) => {
        row += `,${rb.placement ?? '-'},${rb.kill},${rb.booyah ? 'Ya' : 'Tidak'},${rb.roundTotalPoints}`;
      });

      csv += row + '\n';
    });

    // Create Blob & download link
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Leaderboard_FreeFire_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <button
      onClick={handleExport}
      className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-orbitron font-bold text-xs uppercase tracking-wider transition-all shadow-md active:scale-95"
    >
      <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
      <span>Export CSV</span>
      <Download className="w-3.5 h-3.5 text-slate-400" />
    </button>
  );
};
