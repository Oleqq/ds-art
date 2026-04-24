<?php

namespace App\Http\Controllers\Employee;

use App\Http\Controllers\Controller;
use App\Models\Employee as EmployeeModel;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ProfileController extends Controller
{
    public function show(Request $request): Response
    {
        $user = $request->user();
        $employee = $user?->employee()
            ->with('files')
            ->first();

        abort_unless($employee, 404);

        return Inertia::render('employee/profile', [
            'employee' => [
                'id' => $employee->id,
                'name' => $employee->name,
                'email' => $employee->email,
                'phone' => $employee->phone,
                'position' => $employee->position,
                'joined_on' => $employee->joined_on?->toDateString(),
                'status' => $employee->status,
                'salary' => $employee->salary,
                'photo_url' => $employee->photo_url,
                'manager_notes' => null,
                'schedule' => $employee->schedule,
                'files' => $employee->files->map(fn ($file) => [
                    'id' => $file->id,
                    'title' => $file->title,
                    'original_name' => $file->original_name,
                    'extension' => $file->extension,
                    'size_label' => $file->size_label,
                    'uploaded_at' => $file->uploaded_at?->toIso8601String(),
                ])->values(),
            ],
            'banner' => 'Режим просмотра — редактирование доступно только руководителю',
            'is_active_employee' => $employee->status === EmployeeModel::STATUS_ACTIVE,
        ]);
    }
}
