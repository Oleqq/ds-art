<?php

namespace Database\Seeders;

use App\Models\Employee;
use App\Models\User;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $defaultSchedule = [
            'days' => [0, 1, 2, 3, 4],
            'start' => '10:00',
            'end' => '19:00',
        ];

        User::query()
            ->whereNotIn('email', ['admin@agency.ru', 'anna@agency.ru'])
            ->delete();

        Employee::query()
            ->where('email', '!=', 'anna@agency.ru')
            ->delete();

        $anna = Employee::query()->updateOrCreate(
            ['email' => 'anna@agency.ru'],
            [
                'name' => 'Анна Волкова',
                'phone' => '+7 999 123-45-67',
                'position' => 'SMM-менеджер',
                'joined_on' => '2022-03-15',
                'status' => Employee::STATUS_ACTIVE,
                'salary' => 95000,
                'photo_url' => null,
                'manager_notes' => 'Отличный специалист. Ведет 5 клиентов одновременно.',
                'schedule' => $defaultSchedule,
            ],
        );

        $anna->files()->delete();

        foreach ([
            [
                'title' => 'Трудовой договор',
                'original_name' => 'dogovor_anna.pdf',
                'extension' => 'pdf',
                'size_label' => '1.2 МБ',
                'uploaded_at' => '2026-03-01 10:30:00',
            ],
            [
                'title' => 'Паспорт',
                'original_name' => 'passport_anna.pdf',
                'extension' => 'pdf',
                'size_label' => '860 КБ',
                'uploaded_at' => '2026-02-12 14:05:00',
            ],
        ] as $file) {
            $anna->files()->create($file);
        }

        User::query()->updateOrCreate(
            ['email' => 'admin@agency.ru'],
            [
                'name' => 'Михаил Соколов',
                'password' => 'password',
                'role' => User::ROLE_ADMIN,
                'is_active' => true,
                'employee_id' => null,
                'email_verified_at' => now(),
            ],
        );

        User::query()->updateOrCreate(
            ['email' => 'anna@agency.ru'],
            [
                'name' => 'Анна Волкова',
                'password' => 'password',
                'role' => User::ROLE_EMPLOYEE,
                'is_active' => true,
                'employee_id' => $anna->id,
                'email_verified_at' => now(),
            ],
        );

        $this->call(KnowledgeBaseSeeder::class);
    }
}
