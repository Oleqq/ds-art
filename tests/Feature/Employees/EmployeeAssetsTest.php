<?php

namespace Tests\Feature\Employees;

use App\Models\Employee;
use App\Models\EmployeeFile;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class EmployeeAssetsTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_upload_employee_photo(): void
    {
        Storage::fake('public');

        $employee = Employee::query()->create([
            'name' => 'Анна Волкова',
            'email' => 'anna@agency.ru',
            'position' => 'SMM-менеджер',
            'joined_on' => '2022-03-15',
            'status' => Employee::STATUS_ACTIVE,
            'schedule' => Employee::defaultSchedule(),
        ]);

        $admin = User::factory()->create([
            'role' => User::ROLE_ADMIN,
        ]);

        $this->actingAs($admin)
            ->post(route('admin.employees.photo.update', $employee), [
                'photo' => UploadedFile::fake()->image('avatar.jpg', 300, 300),
            ])
            ->assertRedirect();

        $employee->refresh();

        $this->assertNotNull($employee->photo_url);
        $this->assertStringStartsWith('/storage/employees/', $employee->photo_url);
    }

    public function test_admin_can_upload_and_delete_employee_file(): void
    {
        Storage::fake('public');

        $employee = Employee::query()->create([
            'name' => 'Анна Волкова',
            'email' => 'anna@agency.ru',
            'position' => 'SMM-менеджер',
            'joined_on' => '2022-03-15',
            'status' => Employee::STATUS_ACTIVE,
            'schedule' => Employee::defaultSchedule(),
        ]);

        $admin = User::factory()->create([
            'role' => User::ROLE_ADMIN,
        ]);

        $this->actingAs($admin)
            ->post(route('admin.employees.files.store', $employee), [
                'title' => 'Регламент работы',
                'file' => UploadedFile::fake()->create('reglament.pdf', 512, 'application/pdf'),
            ])
            ->assertRedirect();

        /** @var EmployeeFile $file */
        $file = $employee->files()->firstOrFail();

        $this->assertSame('Регламент работы', $file->title);
        $this->assertNotNull($file->path);
        Storage::disk('public')->assertExists($file->path);

        $this->actingAs($admin)
            ->delete(route('admin.employees.files.destroy', [$employee, $file]))
            ->assertRedirect();

        $this->assertDatabaseMissing('employee_files', [
            'id' => $file->id,
        ]);
        Storage::disk('public')->assertMissing($file->path);
    }
}
