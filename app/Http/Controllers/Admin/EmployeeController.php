<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\Employees\UpsertEmployeeRequest;
use App\Models\Employee;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class EmployeeController extends Controller
{
    public function index(): Response
    {
        $employees = Employee::query()
            ->orderByRaw("status = 'active' desc")
            ->orderBy('name')
            ->get()
            ->map(fn (Employee $employee) => [
                'id' => $employee->id,
                'name' => $employee->name,
                'email' => $employee->email,
                'phone' => $employee->phone,
                'position' => $employee->position,
                'joined_on' => $employee->joined_on?->toDateString(),
                'status' => $employee->status,
                'salary' => $employee->salary,
                'photo_url' => $employee->photo_url,
            ]);

        $positions = Employee::availablePositions();

        return Inertia::render('admin/employees/index', [
            'employees' => $employees,
            'positions' => $positions,
            'employeeFormDefaults' => $this->formDefaults(),
            'stats' => [
                'total' => $employees->count(),
                'active' => $employees->where('status', Employee::STATUS_ACTIVE)->count(),
                'positions' => count($positions),
            ],
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('admin/employees/create', [
            'positions' => Employee::availablePositions(),
            'employee' => $this->formDefaults(),
        ]);
    }

    public function show(Employee $employee): Response
    {
        $employee->load('files');

        return Inertia::render('admin/employees/show', [
            'employee' => $this->mapEmployee($employee, true),
        ]);
    }

    public function edit(Employee $employee): Response
    {
        return Inertia::render('admin/employees/edit', [
            'positions' => Employee::availablePositions(),
            'employeeId' => $employee->id,
            'employee' => $this->formPayload($employee),
        ]);
    }

    public function store(UpsertEmployeeRequest $request): RedirectResponse
    {
        Employee::query()->create($request->employeeData());

        return redirect()
            ->route('admin.employees.index')
            ->with('success', 'Сотрудник создан.');
    }

    public function update(UpsertEmployeeRequest $request, Employee $employee): RedirectResponse
    {
        $employee->update($request->employeeData());

        if ($employee->user) {
            $employee->user->update([
                'name' => $employee->name,
                'email' => $employee->email,
                'is_active' => $employee->status === Employee::STATUS_ACTIVE,
            ]);
        }

        return redirect()
            ->route('admin.employees.show', $employee)
            ->with('success', 'Данные сотрудника обновлены.');
    }

    public function toggleStatus(Employee $employee): RedirectResponse
    {
        $employee->update([
            'status' => $employee->status === Employee::STATUS_ACTIVE
                ? Employee::STATUS_INACTIVE
                : Employee::STATUS_ACTIVE,
        ]);

        if ($employee->user) {
            $employee->user->update([
                'is_active' => $employee->status === Employee::STATUS_ACTIVE,
            ]);
        }

        return back()->with('success', 'Статус сотрудника обновлен.');
    }

    private function mapEmployee(Employee $employee, bool $includeManagerNotes): array
    {
        return [
            'id' => $employee->id,
            'name' => $employee->name,
            'email' => $employee->email,
            'phone' => $employee->phone,
            'position' => $employee->position,
            'joined_on' => $employee->joined_on?->toDateString(),
            'status' => $employee->status,
            'salary' => $employee->salary,
            'photo_url' => $employee->photo_url,
            'manager_notes' => $includeManagerNotes ? $employee->manager_notes : null,
            'schedule' => $employee->schedule,
            'files' => $employee->files->map(fn ($file) => [
                'id' => $file->id,
                'title' => $file->title,
                'original_name' => $file->original_name,
                'path' => $file->path,
                'extension' => $file->extension,
                'size_label' => $file->size_label,
                'uploaded_at' => $file->uploaded_at?->toIso8601String(),
                'download_url' => $file->path
                    ? route('admin.employees.files.download', [$employee, $file])
                    : null,
            ])->values(),
        ];
    }

    private function formDefaults(): array
    {
        return [
            'name' => '',
            'email' => '',
            'phone' => '',
            'position' => Employee::positions()[0],
            'joined_on' => now()->toDateString(),
            'status' => Employee::STATUS_ACTIVE,
            'manager_notes' => '',
            'schedule' => Employee::defaultSchedule(),
        ];
    }

    private function formPayload(Employee $employee): array
    {
        return [
            'name' => $employee->name,
            'email' => $employee->email,
            'phone' => $employee->phone ?? '',
            'position' => $employee->position,
            'joined_on' => $employee->joined_on?->toDateString() ?? now()->toDateString(),
            'status' => $employee->status,
            'manager_notes' => $employee->manager_notes ?? '',
            'schedule' => $employee->schedule ?: Employee::defaultSchedule(),
        ];
    }
}
