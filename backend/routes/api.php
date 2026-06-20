<?php

use App\Http\Controllers\Api\AdminAuthController;
use App\Http\Controllers\Api\AttendanceController;
use App\Http\Controllers\Api\BadgeController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\EventController;
use App\Http\Controllers\Api\MemberController;
use App\Http\Controllers\Api\OnboardingController;
use App\Http\Controllers\Api\QrCodeController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\ScanController;
use Illuminate\Support\Facades\Route;

// Public routes
Route::post('/onboarding', [OnboardingController::class, 'store']);
Route::post('/attendance', [AttendanceController::class, 'store']);
Route::get('/events/public', [EventController::class, 'public']);

// Admin auth
Route::post('/admin/login', [AdminAuthController::class, 'login']);

// Protected routes (authenticated)
Route::middleware('auth:sanctum')->group(function () {
    // Accessible à tout utilisateur authentifié (tous rôles)
    Route::post('/admin/logout', [AdminAuthController::class, 'logout']);
    Route::get('/admin/me', [AdminAuthController::class, 'me']);

    // Terrain — scan du QR personnel (app mobile staff)
    Route::middleware('role:admin,scanner')->group(function () {
        Route::post('/scan', [ScanController::class, 'store']);
        Route::get('/scan/manifest', [ScanController::class, 'manifest']);
        Route::post('/scan/sync', [ScanController::class, 'sync']);
    });

    // Back-office — gestion (administrateur & secrétaire)
    Route::middleware('role:admin,secretaire')->group(function () {
        Route::get('/admin/dashboard', [DashboardController::class, 'index']);

        Route::get('/admin/members', [MemberController::class, 'index']);
        Route::get('/admin/members/{member}', [MemberController::class, 'show']);
        Route::get('/admin/members/{member}/badge', [BadgeController::class, 'single']);
        Route::get('/admin/badges', [BadgeController::class, 'batch']);

        Route::get('/admin/attendances', [AttendanceController::class, 'index']);
        Route::get('/admin/attendances/today', [AttendanceController::class, 'today']);

        Route::get('/admin/events', [EventController::class, 'index']);
        Route::post('/admin/events', [EventController::class, 'store']);
        Route::get('/admin/events/{event}', [EventController::class, 'show']);
        Route::delete('/admin/events/{event}', [EventController::class, 'destroy']);

        Route::get('/admin/reports', [ReportController::class, 'generate']);
        Route::get('/admin/qrcodes', [QrCodeController::class, 'index']);
    });
});
