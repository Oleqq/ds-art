<?php

namespace Tests\Feature\Auth;

use App\Mail\EmployeeActivationCodeMail;
use App\Models\Employee;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class EmployeeActivationTest extends TestCase
{
    use RefreshDatabase;

    public function test_employee_can_request_activation_code_and_activate_account(): void
    {
        Mail::fake();

        $employee = Employee::query()->create([
            'name' => 'Дарья Влас',
            'email' => 'daria@agency.ru',
            'phone' => '+7 999 555-22-11',
            'position' => 'SMM-менеджер',
            'joined_on' => '2024-03-01',
            'status' => Employee::STATUS_ACTIVE,
            'schedule' => Employee::defaultSchedule(),
        ]);

        $user = User::factory()->create([
            'name' => $employee->name,
            'email' => $employee->email,
            'role' => User::ROLE_EMPLOYEE,
            'employee_id' => $employee->id,
            'is_active' => true,
            'email_verified_at' => null,
            'activated_at' => null,
            'password' => 'temporary-password',
        ]);

        $this->get('/register')
            ->assertOk()
            ->assertSee('"component":"auth\/register"', false);

        $this->post('/register/send-code', [
            'email' => $employee->email,
        ])->assertRedirect();

        $sentCode = null;

        Mail::assertSent(EmployeeActivationCodeMail::class, function (EmployeeActivationCodeMail $mail) use ($employee, &$sentCode) {
            $sentCode = $mail->code;

            return $mail->hasTo($employee->email);
        });

        $user->refresh();

        $this->assertNotNull($user->activation_code);
        $this->assertNotNull($user->activation_code_expires_at);
        $this->assertTrue(Hash::check((string) $sentCode, (string) $user->activation_code));

        $this->post('/register', [
            'email' => $employee->email,
            'code' => $sentCode,
            'password' => 'SecurePass1',
            'password_confirmation' => 'SecurePass1',
        ])->assertRedirect(route('dashboard'));

        $user->refresh();

        $this->assertNotNull($user->email_verified_at);
        $this->assertNotNull($user->activated_at);
        $this->assertNull($user->activation_code);
        $this->assertNull($user->activation_code_expires_at);
        $this->assertNull($user->activation_code_sent_at);
        $this->assertAuthenticatedAs($user);
    }
}
