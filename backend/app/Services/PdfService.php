<?php

namespace App\Services;

use App\Models\Attendance;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Carbon;

class PdfService
{
    public function attendanceByDate(string $date): mixed
    {
        $attendances = Attendance::with(['member', 'event'])
            ->where('attended_date', $date)
            ->orderBy('created_at')
            ->get();

        return Pdf::loadView('pdf.attendance', [
            'attendances' => $attendances,
            'title'       => 'Rapport de présence du ' . Carbon::parse($date)->translatedFormat('d F Y'),
            'period'      => $date,
        ]);
    }

    public function attendanceByPeriod(string $from, string $to): mixed
    {
        $attendances = Attendance::with(['member', 'event'])
            ->whereBetween('attended_date', [$from, $to])
            ->orderBy('attended_date')
            ->orderBy('created_at')
            ->get();

        $fromLabel = Carbon::parse($from)->translatedFormat('d F Y');
        $toLabel   = Carbon::parse($to)->translatedFormat('d F Y');

        return Pdf::loadView('pdf.attendance', [
            'attendances' => $attendances,
            'title'       => "Rapport de présence du {$fromLabel} au {$toLabel}",
            'period'      => "{$from} — {$to}",
        ]);
    }
}
