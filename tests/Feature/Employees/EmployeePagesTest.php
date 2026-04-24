<?php

namespace Tests\Feature\Employees;

use App\Models\Employee;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class EmployeePagesTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_open_employees_index_and_detail_pages(): void
    {
        $employee = Employee::query()->create([
            'name' => 'Анна Волкова',
            'email' => 'anna@agency.ru',
            'phone' => '+7 999 123-45-67',
            'position' => 'SMM-менеджер',
            'joined_on' => '2022-03-15',
            'status' => Employee::STATUS_ACTIVE,
            'manager_notes' => 'Отличный специалист.',
            'schedule' => [
                'days' => [0, 1, 2, 3, 4],
                'start' => '10:00',
                'end' => '19:00',
            ],
        ]);

        $admin = User::factory()->create([
            'role' => User::ROLE_ADMIN,
        ]);

        $this->actingAs($admin)
            ->get(route('admin.employees.index'))
            ->assertOk()
            ->assertSee('"component":"admin\/employees\/index"', false)
            ->assertSee('anna@agency.ru');

        $this->actingAs($admin)
            ->get(route('admin.employees.show', $employee))
            ->assertOk()
            ->assertSee('"component":"admin\/employees\/show"', false)
            ->assertSee(json_encode('Отличный специалист.'), false);
    }

    public function test_employee_can_open_self_view_without_manager_notes(): void
    {
        $employee = Employee::query()->create([
            'name' => 'Анна Волкова',
            'email' => 'anna@agency.ru',
            'phone' => '+7 999 123-45-67',
            'position' => 'SMM-менеджер',
            'joined_on' => '2022-03-15',
            'status' => Employee::STATUS_ACTIVE,
            'manager_notes' => 'Скрытая заметка руководителя.',
            'schedule' => [
                'days' => [0, 1, 2, 3, 4],
                'start' => '10:00',
                'end' => '19:00',
            ],
        ]);

        $user = User::factory()->create([
            'role' => User::ROLE_EMPLOYEE,
            'employee_id' => $employee->id,
        ]);

        $this->actingAs($user)
            ->get(route('employee.profile.show'))
            ->assertOk()
            ->assertSee('"component":"employee\/profile"', false)
            ->assertSee(json_encode('Режим просмотра — редактирование доступно только руководителю'), false)
            ->assertSee('"manager_notes":null', false)
            ->assertDontSee(json_encode('Скрытая заметка руководителя.'), false);
    }
}
