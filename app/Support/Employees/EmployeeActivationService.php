<?php

namespace App\Support\Employees;

use App\Models\Employee;
use App\Models\KnowledgeUserPermission;
use App\Models\User;

class EmployeeActivationService
{
    public function canDeactivateEmployee(Employee $employee): bool
    {
        return ! $employee->isProtectedFromDeactivation();
    }

    public function canDeactivateUser(User $user): bool
    {
        return ! $user->isAdmin() && ! $user->employee?->isProtectedFromDeactivation();
    }

    public function syncEmployeeStatus(Employee $employee, bool $isActive): void
    {
        $employee->forceFill([
            'status' => $isActive ? Employee::STATUS_ACTIVE : Employee::STATUS_INACTIVE,
        ]);

        if ($employee->isDirty('status')) {
            $employee->save();
        }

        if (! $employee->user) {
            return;
        }

        $employee->user->forceFill([
            'is_active' => $isActive,
        ]);

        if ($employee->user->isDirty('is_active')) {
            $employee->user->save();
        }
    }

    public function syncUserStatus(User $user, bool $isActive): void
    {
        $user->forceFill([
            'is_active' => $isActive,
        ]);

        if ($user->isDirty('is_active')) {
            $user->save();
        }

        if (! $user->employee) {
            return;
        }

        $user->employee->forceFill([
            'status' => $isActive ? Employee::STATUS_ACTIVE : Employee::STATUS_INACTIVE,
        ]);

        if ($user->employee->isDirty('status')) {
            $user->employee->save();
        }
    }

    public function syncKnowledgeDeactivation(
        User $user,
        bool $isDeactivated,
        ?int $updatedBy = null,
    ): void {
        KnowledgeUserPermission::query()->updateOrCreate(
            ['user_id' => $user->id],
            array_filter([
                'is_deactivated' => $isDeactivated,
                'updated_by' => $updatedBy,
            ], static fn ($value) => $value !== null),
        );
    }
}
