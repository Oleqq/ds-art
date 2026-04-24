<?php

namespace Tests\Feature\Employees;

use App\Models\Employee;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class EmployeeManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_open_create_and_edit_employee_pages(): void
    {
        $employee = Employee::query()->create([
            'name' => 'Анна Волкова',
            'email' => 'anna@agency.ru',
            'phone' => '+7 999 123-45-67',
            'position' => 'SMM-менеджер',
            'joined_on' => '2022-03-15',
            'status' => Employee::STATUS_ACTIVE,
            'schedule' => Employee::defaultSchedule(),
        ]);

        $admin = User::factory()->create([
            'role' => User::ROLE_ADMIN,
        ]);

        $this->actingAs($admin)
            ->get(route('admin.employees.create'))
            ->assertOk()
            ->assertSee('"component":"admin\/employees\/create"', false);

        $this->actingAs($admin)
            ->get(route('admin.employees.edit', $employee))
            ->assertOk()
            ->assertSee('"component":"admin\/employees\/edit"', false)
            ->assertSee('anna@agency.ru');
    }

    public function test_admin_can_create_update_and_toggle_employee_status(): void
    {
        $admin = User::factory()->create([
            'role' => User::ROLE_ADMIN,
        ]);

        $this->actingAs($admin)
            ->post(route('admin.employees.store'), [
                'name' => 'Мария Тестова',
                'email' => 'maria@agency.ru',
                'phone' => '+7 999 555-00-11',
                'position' => 'Дизайнер',
                'joined_on' => '2024-01-10',
                'status' => Employee::STATUS_ACTIVE,
                'manager_notes' => 'Новый сотрудник.',
                'schedule' => [
                    'days' => [0, 1, 2, 3, 4],
                    'start' => '10:00',
                    'end' => '19:00',
                ],
            ])
            ->assertRedirect(route('admin.employees.index'));

        $employee = Employee::query()->where('email', 'maria@agency.ru')->firstOrFail();

        $linkedUser = User::factory()->create([
            'role' => User::ROLE_EMPLOYEE,
            'employee_id' => $employee->id,
            'name' => $employee->name,
            'email' => $employee->email,
            'is_active' => true,
        ]);

        $this->actingAs($admin)
            ->put(route('admin.employees.update', $employee), [
                'name' => 'Мария Обновленная',
                'email' => 'maria.updated@agency.ru',
                'phone' => '+7 999 555-00-22',
                'position' => 'Проект-менеджер',
                'joined_on' => '2024-02-11',
                'status' => Employee::STATUS_INACTIVE,
                'manager_notes' => 'Обновленные данные.',
                'schedule' => [
                    'days' => [0, 1, 2],
                    'start' => '09:00',
                    'end' => '18:00',
                ],
            ])
            ->assertRedirect(route('admin.employees.show', $employee));

        $employee->refresh();
        $linkedUser->refresh();

        $this->assertSame('Мария Обновленная', $employee->name);
        $this->assertSame('maria.updated@agency.ru', $employee->email);
        $this->assertSame(Employee::STATUS_INACTIVE, $employee->status);
        $this->assertSame('Мария Обновленная', $linkedUser->name);
        $this->assertSame('maria.updated@agency.ru', $linkedUser->email);
        $this->assertFalse($linkedUser->is_active);

        $this->actingAs($admin)
            ->patch(route('admin.employees.status', $employee))
            ->assertRedirect();

        $employee->refresh();
        $linkedUser->refresh();

        $this->assertSame(Employee::STATUS_ACTIVE, $employee->status);
        $this->assertTrue($linkedUser->is_active);
    }

    public function test_admin_can_create_employee_with_custom_role(): void
    {
        $admin = User::factory()->create([
            'role' => User::ROLE_ADMIN,
        ]);

        $this->actingAs($admin)
            ->post(route('admin.employees.store'), [
                'name' => 'Ирина Смирнова',
                'email' => 'irina@agency.ru',
                'phone' => '+7 999 100-20-30',
                'position' => 'Контент-стратег',
                'joined_on' => '2024-03-01',
                'status' => Employee::STATUS_ACTIVE,
                'manager_notes' => 'Новая роль для команды.',
                'schedule' => [
                    'days' => [0, 1, 2, 3, 4],
                    'start' => '10:00',
                    'end' => '19:00',
                ],
            ])
            ->assertRedirect(route('admin.employees.index'));

        $employee = Employee::query()->where('email', 'irina@agency.ru')->firstOrFail();

        $this->assertSame('Контент-стратег', $employee->position);
        $this->assertContains('Контент-стратег', Employee::availablePositions());
    }
}
