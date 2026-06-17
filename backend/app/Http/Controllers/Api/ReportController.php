<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\PdfService;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Validation\ValidationException;

class ReportController extends Controller
{
    public function generate(Request $request, PdfService $pdf): Response
    {
        $request->validate([
            'date' => ['nullable', 'date'],
            'from' => ['nullable', 'date', 'required_with:to'],
            'to'   => ['nullable', 'date', 'required_with:from', 'after_or_equal:from'],
        ]);

        if ($request->date) {
            $document = $pdf->attendanceByDate($request->date);
            $filename  = 'presences-' . $request->date . '.pdf';
        } elseif ($request->from && $request->to) {
            $document = $pdf->attendanceByPeriod($request->from, $request->to);
            $filename  = 'presences-' . $request->from . '-au-' . $request->to . '.pdf';
        } else {
            throw ValidationException::withMessages([
                'date' => 'Vous devez fournir une date ou une période (from + to).',
            ]);
        }

        return $document->download($filename);
    }
}
