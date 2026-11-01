<?php

namespace Tests\Feature;

use App\Models\Organization;
use App\Models\User;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Password;
use Tests\TestCase;

/**
 * Comptes : mot de passe temporaire à changer, changement de son mot de passe,
 * mot de passe oublié, désactivation, dernière connexion.
 */
class TeamAccountsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        // Clé d'application requise par les jetons de réinitialisation (absente de phpunit.xml).
        config(['app.key' => 'base64:' . base64_encode(str_repeat('k', 32))]);
    }

    private function internal(string $role = 'super_admin', array $attrs = []): User
    {
        return User::factory()->create(array_merge(['organization_id' => null, 'role' => $role, 'password' => 'Secret123'], $attrs));
    }

    private function as(User $user): static
    {
        $this->app['auth']->forgetGuards();

        return $this->withToken($user->createToken('t')->plainTextToken);
    }

    private function login(string $email, string $password)
    {
        $this->app['auth']->forgetGuards();

        return $this->postJson('/api/admin/login', ['email' => $email, 'password' => $password]);
    }

    // ── Connexion ────────────────────────────────────────────────

    public function test_login_records_last_login_and_exposes_the_change_flag(): void
    {
        $user = $this->internal('operator', ['must_change_password' => true]);

        $this->login($user->email, 'Secret123')->assertOk()->assertJsonPath('user.must_change_password', true);
        $this->assertNotNull($user->fresh()->last_login_at);
    }

    public function test_deactivated_account_cannot_log_in_and_its_sessions_stop(): void
    {
        $user = $this->internal('operator');
        $token = $user->createToken('t')->plainTextToken;

        $user->forceFill(['is_active' => false])->save();

        $this->login($user->email, 'Secret123')->assertForbidden()->assertJsonPath('message', 'Ce compte est désactivé. Contactez votre administrateur.');
        $this->app['auth']->forgetGuards();
        $this->withToken($token)->getJson('/api/admin/me')->assertUnauthorized();
    }

    // ── Mot de passe temporaire ──────────────────────────────────

    public function test_accounts_created_with_a_temporary_password_must_change_it(): void
    {
        Mail::fake();
        $super = $this->internal();

        $res = $this->as($super)->postJson('/api/admin/internal-users', ['name' => 'Jean', 'email' => 'jean@equipe.cd', 'role' => 'operator'])->assertCreated();
        $this->assertTrue(User::where('email', 'jean@equipe.cd')->value('must_change_password'));
        $this->login('jean@equipe.cd', $res->json('temp_password'))->assertJsonPath('user.must_change_password', true);

        $this->as($super)->postJson('/api/admin/organizations', ['name' => 'Acme', 'admin_name' => 'Rose', 'admin_email' => 'rose@acme.cd'])->assertCreated();
        $this->assertTrue(User::where('email', 'rose@acme.cd')->value('must_change_password'));
    }

    public function test_admin_reset_forces_a_new_choice_and_closes_sessions(): void
    {
        $super = $this->internal();
        $op = $this->internal('operator');
        $old = $op->createToken('t')->plainTextToken;

        $this->as($super)->postJson("/api/admin/internal-users/{$op->id}/password")->assertOk();

        $this->assertTrue($op->fresh()->must_change_password);
        $this->app['auth']->forgetGuards();
        $this->withToken($old)->getJson('/api/admin/me')->assertUnauthorized();
    }

    // ── Changer son mot de passe ─────────────────────────────────

    public function test_user_changes_own_password(): void
    {
        $user = $this->internal('operator', ['must_change_password' => true]);
        $other = $user->createToken('autre-appareil')->plainTextToken;
        $current = $user->createToken('ici')->plainTextToken;

        $this->app['auth']->forgetGuards();
        $this->withToken($current)->postJson('/api/admin/me/password', [
            'current_password' => 'Secret123', 'password' => 'Nouveau2026', 'password_confirmation' => 'Nouveau2026',
        ])->assertOk()->assertJsonPath('user.must_change_password', false);

        $this->assertFalse($user->fresh()->must_change_password);
        $this->login($user->email, 'Nouveau2026')->assertOk();
        $this->login($user->email, 'Secret123')->assertUnauthorized();

        $this->app['auth']->forgetGuards();
        $this->withToken($current)->getJson('/api/admin/me')->assertOk();           // cette session reste ouverte
        $this->app['auth']->forgetGuards();
        $this->withToken($other)->getJson('/api/admin/me')->assertUnauthorized();   // les autres sont fermées
    }

    public function test_password_change_is_validated(): void
    {
        $user = $this->internal('operator');
        $send = fn (array $body) => $this->as($user)->postJson('/api/admin/me/password', $body);

        $send(['current_password' => 'Faux1234', 'password' => 'Nouveau2026', 'password_confirmation' => 'Nouveau2026'])
            ->assertUnprocessable()->assertJsonValidationErrors('current_password');
        $send(['current_password' => 'Secret123', 'password' => 'Secret123', 'password_confirmation' => 'Secret123'])
            ->assertUnprocessable()->assertJsonValidationErrors('password');
        $send(['current_password' => 'Secret123', 'password' => 'courtmotdepasse', 'password_confirmation' => 'courtmotdepasse'])
            ->assertUnprocessable()->assertJsonValidationErrors('password'); // sans chiffre
        $send(['current_password' => 'Secret123', 'password' => 'Nouveau2026', 'password_confirmation' => 'Autre2026'])
            ->assertUnprocessable()->assertJsonValidationErrors('password');
    }

    public function test_client_admins_can_change_their_password_too(): void
    {
        $admin = User::factory()->create(['organization_id' => Organization::factory()->create()->id, 'role' => 'admin', 'password' => 'Secret123']);

        $this->as($admin)->postJson('/api/admin/me/password', [
            'current_password' => 'Secret123', 'password' => 'Client2026', 'password_confirmation' => 'Client2026',
        ])->assertOk();
    }

    // ── Mot de passe oublié ──────────────────────────────────────

    public function test_forgot_password_sends_a_french_link_to_the_frontend(): void
    {
        Notification::fake();
        config(['app.frontend_url' => 'https://signiq.saas.cd']);
        $user = $this->internal('operator', ['email' => 'jean@equipe.cd', 'name' => 'Jean']);

        $this->postJson('/api/admin/forgot-password', ['email' => 'jean@equipe.cd'])->assertOk();

        Notification::assertSentTo($user, ResetPassword::class, function (ResetPassword $n) use ($user) {
            $mail = $n->toMail($user);

            return str_starts_with($mail->actionUrl, 'https://signiq.saas.cd/reinitialiser-mot-de-passe?token=')
                && str_contains($mail->actionUrl, 'email=jean%40equipe.cd')
                && $mail->subject === 'Réinitialisation de votre mot de passe Signiq';
        });
    }

    public function test_forgot_password_reveals_nothing_about_accounts(): void
    {
        Notification::fake();
        $inactive = $this->internal('operator', ['is_active' => false]);

        $unknown = $this->postJson('/api/admin/forgot-password', ['email' => 'personne@nulle-part.cd'])->assertOk()->json('message');
        $this->app['auth']->forgetGuards();
        $known = $this->postJson('/api/admin/forgot-password', ['email' => $inactive->email])->assertOk()->json('message');

        $this->assertSame($unknown, $known);
        Notification::assertNothingSent(); // ni compte inconnu ni compte désactivé
    }

    public function test_reset_link_sets_a_new_password_and_closes_sessions(): void
    {
        $user = $this->internal('operator', ['must_change_password' => true]);
        $session = $user->createToken('t')->plainTextToken;
        $token = Password::broker()->createToken($user);

        $this->postJson('/api/admin/reset-password', [
            'email' => $user->email, 'token' => 'faux-jeton', 'password' => 'Reprise2026', 'password_confirmation' => 'Reprise2026',
        ])->assertUnprocessable();

        $this->postJson('/api/admin/reset-password', [
            'email' => $user->email, 'token' => $token, 'password' => 'Reprise2026', 'password_confirmation' => 'Reprise2026',
        ])->assertOk();

        $this->assertFalse($user->fresh()->must_change_password);
        $this->login($user->email, 'Reprise2026')->assertOk();
        $this->app['auth']->forgetGuards();
        $this->withToken($session)->getJson('/api/admin/me')->assertUnauthorized();
    }

    public function test_forgot_password_is_rate_limited(): void
    {
        Notification::fake();
        for ($i = 0; $i < 3; $i++) {
            $this->postJson('/api/admin/forgot-password', ['email' => 'x@y.cd'])->assertOk();
        }
        $this->postJson('/api/admin/forgot-password', ['email' => 'x@y.cd'])->assertStatus(429);
    }

    // ── Désactivation ────────────────────────────────────────────

    public function test_super_admin_deactivates_and_reactivates_a_colleague(): void
    {
        $super = $this->internal();
        $op = $this->internal('operator');
        $session = $op->createToken('t')->plainTextToken;

        $this->as($super)->patchJson("/api/admin/internal-users/{$op->id}/active", ['active' => false])
            ->assertOk()->assertJsonPath('user.is_active', false);
        $this->app['auth']->forgetGuards();
        $this->withToken($session)->getJson('/api/admin/me')->assertUnauthorized();

        $this->as($super)->patchJson("/api/admin/internal-users/{$op->id}/active", ['active' => true])->assertOk();
        $this->login($op->email, 'Secret123')->assertOk();

        $this->as($super)->getJson('/api/admin/internal-users')->assertOk()
            ->assertJsonFragment(['email' => $op->email, 'is_active' => true]);
    }

    public function test_deactivation_guards(): void
    {
        $super = $this->internal();
        $op = $this->internal('operator');

        $this->as($super)->patchJson("/api/admin/internal-users/{$super->id}/active", ['active' => false])->assertUnprocessable();
        $this->as($op)->patchJson("/api/admin/internal-users/{$super->id}/active", ['active' => false])->assertForbidden();

        // Un second super-admin désactivé ne compte pas : le premier reste le dernier actif.
        $other = $this->internal('super_admin', ['is_active' => false]);
        $this->as($other)->getJson('/api/admin/me')->assertUnauthorized();
        $third = $this->internal();
        $this->as($third)->patchJson("/api/admin/internal-users/{$super->id}/active", ['active' => false])->assertOk();
        $this->assertFalse($super->fresh()->is_active);
    }
}
