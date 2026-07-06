<?php

use App\Http\Controllers\Api\AdminAuthController;
use App\Http\Controllers\Api\AttendanceController;
use App\Http\Controllers\Api\BadgeController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\EventController;
use App\Http\Controllers\Api\MemberCardController;
use App\Http\Controllers\Api\MemberController;
use App\Http\Controllers\Api\OnboardingController;
use App\Http\Controllers\Api\OrganizationController;
use App\Http\Controllers\Api\OrganizationSettingsController;
use App\Http\Controllers\Api\QrCodeController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\ScanController;
use App\Http\Controllers\Api\WhatsAppController;
use Illuminate\Support\Facades\Route;

// Public routes
Route::post('/onboarding', [OnboardingController::class, 'store']);
Route::post('/attendance', [AttendanceController::class, 'store']);
Route::get('/events/public', [EventController::class, 'public']);

// Téléchargement de badges (navigation native ; auth par token en query)
Route::get('/download/badge/{member}', [BadgeController::class, 'single']);
Route::get('/download/badges', [BadgeController::class, 'batch']);
Route::get('/download/badges-blank', [BadgeController::class, 'blankBatch']);
Route::get('/download/card/{member}', [MemberCardController::class, 'single']);
Route::get('/download/cards', [MemberCardController::class, 'batch']);

// Admin auth
Route::post('/admin/login', [AdminAuthController::class, 'login']);

// Protected routes (authenticated)
Route::middleware('auth:sanctum')->group(function () {
    // Accessible à tout utilisateur authentifié (tous rôles)
    Route::post('/admin/logout', [AdminAuthController::class, 'logout']);
    Route::get('/admin/me', [AdminAuthController::class, 'me']);

    // Plateforme — gestion des organisations (super-admin interne)
    Route::middleware('role:super_admin')->group(function () {
        Route::get('/admin/organizations', [OrganizationController::class, 'index']);
        Route::post('/admin/organizations', [OrganizationController::class, 'store']);
    });

    // Terrain — scan du QR personnel (app mobile staff)
    Route::middleware('role:admin,scanner')->group(function () {
        Route::get('/scan/events', [ScanController::class, 'events']);
        // Création d'événement depuis l'app scanner (même logique que le back-office)
        Route::post('/scan/events', [EventController::class, 'store']);
        Route::post('/scan', [ScanController::class, 'store']);
        Route::post('/scan/onboard', [ScanController::class, 'onboard']);
        Route::get('/scan/manifest', [ScanController::class, 'manifest']);
        Route::post('/scan/sync', [ScanController::class, 'sync']);
    });

    // Paramètres de l'organisation (administrateur de l'org)
    Route::middleware('role:admin')->group(function () {
        Route::get('/admin/organization', [OrganizationSettingsController::class, 'show']);
        Route::post('/admin/organization', [OrganizationSettingsController::class, 'update']);
    });

    // Back-office — gestion (administrateur & secrétaire)
    Route::middleware('role:admin,secretaire')->group(function () {
        Route::get('/admin/dashboard', [DashboardController::class, 'index']);
        Route::get('/admin/notifications', [DashboardController::class, 'notifications']);

        Route::get('/admin/members', [MemberController::class, 'index']);
        Route::post('/admin/members', [MemberController::class, 'store']);
        Route::get('/admin/members/{member}', [MemberController::class, 'show']);
        Route::get('/admin/members/{member}/qr', [MemberController::class, 'qr']);
        Route::post('/admin/badges/blank', [BadgeController::class, 'createBlankBatch']);

        // Carte de membre sur WhatsApp (service whatsapp-web.js)
        Route::get('/admin/whatsapp/status', [WhatsAppController::class, 'status']);
        Route::post('/admin/members/{member}/whatsapp-card', [WhatsAppController::class, 'sendCard']);

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
