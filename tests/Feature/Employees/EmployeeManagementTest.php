<?php

namespace Tests\Feature\Employees;

use App\Models\Employee;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
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
        $linkedUser = User::query()->where('email', 'maria@agency.ru')->firstOrFail();

        $this->assertSame(User::ROLE_EMPLOYEE, $linkedUser->role);
        $this->assertSame($employee->id, $linkedUser->employee_id);
        $this->assertTrue($linkedUser->is_active);

        $this->actingAs($admin)
            ->get(route('admin.access.index', ['user' => $linkedUser->id]))
            ->assertOk()
            ->assertSee('maria@agency.ru');

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
        $this->assertDatabaseHas('knowledge_user_permissions', [
            'user_id' => $linkedUser->id,
            'is_deactivated' => true,
        ]);

        $this->actingAs($admin)
            ->patch(route('admin.employees.status', $employee))
            ->assertRedirect();

        $employee->refresh();
        $linkedUser->refresh();

        $this->assertSame(Employee::STATUS_ACTIVE, $employee->status);
        $this->assertTrue($linkedUser->is_active);
        $this->assertDatabaseHas('knowledge_user_permissions', [
            'user_id' => $linkedUser->id,
            'is_deactivated' => false,
        ]);
    }

    public function test_access_screen_deactivation_syncs_employee_status_and_user_state(): void
    {
        $admin = User::factory()->create([
            'role' => User::ROLE_ADMIN,
            'is_active' => true,
        ]);

        $employee = Employee::query()->create([
            'name' => 'Р•РіРѕСЂ Р›РѕРіРёРЅРѕРІ',
            'email' => 'egor@agency.ru',
            'phone' => '+7 999 111-22-33',
            'position' => 'SMM-РјРµРЅРµРґР¶РµСЂ',
            'joined_on' => '2024-02-14',
            'status' => Employee::STATUS_ACTIVE,
            'schedule' => Employee::defaultSchedule(),
        ]);

        $linkedUser = User::factory()->create([
            'role' => User::ROLE_EMPLOYEE,
            'email' => 'egor@agency.ru',
            'employee_id' => $employee->id,
            'is_active' => true,
        ]);

        $this->actingAs($admin)
            ->patch(route('admin.access.users.update', $linkedUser), [
                'is_deactivated' => true,
                'can_view' => true,
                'can_create' => false,
                'can_update' => false,
                'can_delete' => false,
                'view_all_articles' => true,
                'category_ids' => [],
                'article_ids' => [],
            ])
            ->assertRedirect();

        $employee->refresh();
        $linkedUser->refresh();

        $this->assertSame(Employee::STATUS_INACTIVE, $employee->status);
        $this->assertFalse($linkedUser->is_active);
        $this->assertDatabaseHas('knowledge_user_permissions', [
            'user_id' => $linkedUser->id,
            'is_deactivated' => true,
        ]);

        $this->actingAs($admin)
            ->patch(route('admin.access.users.update', $linkedUser), [
                'is_deactivated' => false,
                'can_view' => true,
                'can_create' => false,
                'can_update' => false,
                'can_delete' => false,
                'view_all_articles' => true,
                'category_ids' => [],
                'article_ids' => [],
            ])
            ->assertRedirect();

        $employee->refresh();
        $linkedUser->refresh();

        $this->assertSame(Employee::STATUS_ACTIVE, $employee->status);
        $this->assertTrue($linkedUser->is_active);
        $this->assertDatabaseHas('knowledge_user_permissions', [
            'user_id' => $linkedUser->id,
            'is_deactivated' => false,
        ]);
    }

    public function test_admin_can_create_employee_with_custom_role(): void
    {
        Storage::fake('local');

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
        Storage::disk('local')->assertExists('employee-roles.json');
        $this->assertStringContainsString(
            'Контент-стратег',
            Storage::disk('local')->get('employee-roles.json'),
        );
    }

    public function test_protected_employee_cannot_be_deactivated(): void
    {
        $operator = User::factory()->create([
            'role' => User::ROLE_ADMIN,
            'is_active' => true,
        ]);

        $employee = Employee::query()->create([
            'name' => 'Михаил Соколов',
            'email' => 'admin@agency.ru',
            'phone' => '+7 999 123-45-67',
            'position' => 'Руководитель',
            'joined_on' => '2024-01-10',
            'status' => Employee::STATUS_ACTIVE,
            'schedule' => Employee::defaultSchedule(),
        ]);

        $protectedAdmin = User::factory()->create([
            'role' => User::ROLE_ADMIN,
            'email' => 'admin@agency.ru',
            'employee_id' => $employee->id,
            'is_active' => true,
        ]);

        $this->actingAs($operator)
            ->patch(route('admin.employees.status', $employee))
            ->assertRedirect();

        $employee->refresh();
        $protectedAdmin->refresh();

        $this->assertSame(Employee::STATUS_ACTIVE, $employee->status);
        $this->assertTrue($protectedAdmin->is_active);
    }

    public function test_admin_can_delete_regular_employee(): void
    {
        Storage::fake('public');

        $admin = User::factory()->create([
            'role' => User::ROLE_ADMIN,
            'is_active' => true,
        ]);

        $employee = Employee::query()->create([
            'name' => 'Дарья Власова',
            'email' => 'daria@agency.ru',
            'phone' => '+7 999 123-45-67',
            'position' => 'Руководитель проектов',
            'joined_on' => '2024-10-28',
            'status' => Employee::STATUS_ACTIVE,
            'photo_url' => '/media/employees/test/photo/avatar.png',
            'schedule' => Employee::defaultSchedule(),
        ]);

        Storage::disk('public')->put('employees/test/photo/avatar.png', 'photo');
        Storage::disk('public')->put('employees/test/files/contract.pdf', 'file');

        $employee->files()->create([
            'title' => 'Договор',
            'original_name' => 'contract.pdf',
            'path' => 'employees/test/files/contract.pdf',
            'extension' => 'pdf',
            'size_label' => '1 МБ',
            'uploaded_at' => now(),
        ]);

        $linkedUser = User::factory()->create([
            'role' => User::ROLE_EMPLOYEE,
            'email' => 'daria@agency.ru',
            'employee_id' => $employee->id,
            'is_active' => true,
        ]);

        $this->actingAs($admin)
            ->delete(route('admin.employees.destroy', $employee))
            ->assertRedirect(route('admin.employees.index'));

        $this->assertDatabaseMissing('employees', [
            'id' => $employee->id,
        ]);
        $this->assertDatabaseMissing('employee_files', [
            'employee_id' => $employee->id,
        ]);
        $this->assertDatabaseHas('users', [
            'id' => $linkedUser->id,
            'employee_id' => null,
        ]);
        Storage::disk('public')->assertMissing('employees/test/photo/avatar.png');
        Storage::disk('public')->assertMissing('employees/test/files/contract.pdf');
    }

    public function test_access_screen_uses_only_linked_employees(): void
    {
        $admin = User::factory()->create([
            'role' => User::ROLE_ADMIN,
            'is_active' => true,
        ]);

        $employee = Employee::query()->create([
            'name' => 'Анна Волкова',
            'email' => 'anna@agency.ru',
            'phone' => '+7 999 123-45-67',
            'position' => 'SMM-менеджер',
            'joined_on' => '2022-03-15',
            'status' => Employee::STATUS_ACTIVE,
            'schedule' => Employee::defaultSchedule(),
        ]);

        $linkedUser = User::factory()->create([
            'role' => User::ROLE_EMPLOYEE,
            'email' => 'anna@agency.ru',
            'employee_id' => $employee->id,
            'is_active' => true,
        ]);

        $orphanUser = User::factory()->create([
            'role' => User::ROLE_EMPLOYEE,
            'name' => 'Orphan User',
            'email' => 'orphan@agency.ru',
            'employee_id' => null,
            'is_active' => true,
        ]);

        $this->actingAs($admin)
            ->get(route('admin.access.index', ['user' => $linkedUser->id]))
            ->assertOk()
            ->assertSee('anna@agency.ru')
            ->assertDontSee($orphanUser->email);
    }

    public function test_access_screen_reflects_employee_status_after_toggle_from_employee_page(): void
    {
        $admin = User::factory()->create([
            'role' => User::ROLE_ADMIN,
            'is_active' => true,
        ]);

        $employee = Employee::query()->create([
            'name' => 'Мария Тестова',
            'email' => 'maria@agency.ru',
            'phone' => '+7 999 555-00-11',
            'position' => 'SMM-менеджер',
            'joined_on' => '2024-01-10',
            'status' => Employee::STATUS_ACTIVE,
            'schedule' => Employee::defaultSchedule(),
        ]);

        $linkedUser = User::factory()->create([
            'role' => User::ROLE_EMPLOYEE,
            'email' => 'maria@agency.ru',
            'employee_id' => $employee->id,
            'is_active' => true,
        ]);

        $this->actingAs($admin)
            ->patch(route('admin.employees.status', $employee))
            ->assertRedirect();

        $employee->refresh();
        $linkedUser->refresh();

        $this->assertSame(Employee::STATUS_INACTIVE, $employee->status);
        $this->assertFalse($linkedUser->is_active);

        $this->actingAs($admin)
            ->get(route('admin.access.index', ['user' => $linkedUser->id]))
            ->assertOk()
            ->assertSee('"is_active":false', false)
            ->assertSee('"can_toggle_status":true', false);
    }

    public function test_admin_can_open_roles_page_and_add_custom_role(): void
    {
        Storage::fake('local');

        Employee::query()->create([
            'name' => 'Максим',
            'email' => 'maxim@agency.ru',
            'phone' => '+7 999 000-11-22',
            'position' => 'SMM-менеджер',
            'joined_on' => '2024-01-10',
            'status' => Employee::STATUS_ACTIVE,
            'schedule' => Employee::defaultSchedule(),
        ]);

        $admin = User::factory()->create([
            'role' => User::ROLE_ADMIN,
        ]);

        $this->actingAs($admin)
            ->get(route('admin.employees.roles.index'))
            ->assertOk()
            ->assertSee('"component":"admin\/employees\/roles"', false)
            ->assertSee(json_encode('SMM-менеджер'), false);

        $this->actingAs($admin)
            ->post(route('admin.employees.roles.store'), [
                'name' => 'Контент-стратег',
            ])
            ->assertRedirect(route('admin.employees.roles.index'));

        Storage::disk('local')->assertExists('employee-roles.json');
        $this->assertStringContainsString(
            'Контент-стратег',
            Storage::disk('local')->get('employee-roles.json'),
        );
    }
    public function test_admin_can_delete_custom_role_and_reassign_employees(): void
    {
        Storage::fake('local');

        Storage::disk('local')->put(
            'employee-roles.json',
            json_encode(['Контент-стратег'], JSON_UNESCAPED_UNICODE),
        );

        $employee = Employee::query()->create([
            'name' => 'Ирина',
            'email' => 'irina@agency.ru',
            'phone' => '+7 999 000-11-23',
            'position' => 'Контент-стратег',
            'joined_on' => '2024-01-10',
            'status' => Employee::STATUS_ACTIVE,
            'schedule' => Employee::defaultSchedule(),
        ]);

        $admin = User::factory()->create([
            'role' => User::ROLE_ADMIN,
        ]);

        $this->actingAs($admin)
            ->delete(route('admin.employees.roles.destroy'), [
                'name' => 'Контент-стратег',
            ])
            ->assertRedirect(route('admin.employees.roles.index'));

        $employee->refresh();

        $this->assertSame('Без роли', $employee->position);
        $this->assertStringNotContainsString(
            'Контент-стратег',
            Storage::disk('local')->get('employee-roles.json'),
        );
        $this->assertStringContainsString(
            'Без роли',
            Storage::disk('local')->get('employee-roles.json'),
        );
    }
}
