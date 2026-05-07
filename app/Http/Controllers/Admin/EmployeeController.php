<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\Employees\UpsertEmployeeRequest;
use App\Models\Employee;
use App\Models\User;
use App\Support\Employees\EmployeeActivationService;
use App\Support\Employees\EmployeeRolesCatalog;
use App\Support\PublicStorageAsset;
use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class EmployeeController extends Controller
{
    private const FALLBACK_ROLE = 'Без роли';

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

    public function roles(): Response
    {
        $defaultPositions = collect(Employee::positions())
            ->map(fn (string $position) => mb_strtolower($position));

        $roles = collect(Employee::availablePositions())
            ->map(fn (string $name) => [
                'name' => $name,
                'employees_count' => Employee::query()
                    ->where('position', $name)
                    ->count(),
                'employees' => Employee::query()
                    ->where('position', $name)
                    ->orderBy('name')
                    ->get(['id', 'name', 'email', 'photo_url'])
                    ->map(fn (Employee $employee) => [
                        'id' => $employee->id,
                        'name' => $employee->name,
                        'email' => $employee->email,
                        'href' => route('admin.employees.show', $employee),
                        'photo_url' => $employee->photo_url,
                    ])
                    ->values(),
                'can_delete' => ! $defaultPositions->contains(
                    fn (string $position) => $position === mb_strtolower($name),
                ) && mb_strtolower($name) !== mb_strtolower(self::FALLBACK_ROLE),
            ])
            ->values();

        return Inertia::render('admin/employees/roles', [
            'roles' => $roles,
            'stats' => [
                'total' => $roles->count(),
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
        $employee = Employee::query()->create($request->employeeData());

        if (! in_array($employee->position, Employee::positions(), true)) {
            EmployeeRolesCatalog::add($employee->position);
        }
        $this->syncEmployeeUser($employee);

        return redirect()
            ->route('admin.employees.index')
            ->with('success', 'Сотрудник создан.');
    }

    public function update(
        UpsertEmployeeRequest $request,
        Employee $employee,
        EmployeeActivationService $activationService,
    ): RedirectResponse
    {
        $employeeData = $request->employeeData();

        if (
            ($employeeData['status'] ?? null) === Employee::STATUS_INACTIVE
            && ! $activationService->canDeactivateEmployee($employee)
        ) {
            Inertia::flash('toast', [
                'type' => 'error',
                'message' => 'РђРєРєР°СѓРЅС‚С‹ СЂСѓРєРѕРІРѕРґСЃС‚РІР° РЅРµР»СЊР·СЏ РґРµР°РєС‚РёРІРёСЂРѕРІР°С‚СЊ.',
            ]);

            return back();
        }

        $employee->update($employeeData);

        if (! in_array($employee->position, Employee::positions(), true)) {
            EmployeeRolesCatalog::add($employee->position);
        }

        $activationService->syncEmployeeStatus(
            $employee,
            $employee->status === Employee::STATUS_ACTIVE,
        );

        if ($employee->user) {
            $employee->user->update([
                'name' => $employee->name,
                'email' => $employee->email,
            ]);
        } else {
            $this->syncEmployeeUser($employee);
        }

        if ($employee->user) {
            $activationService->syncKnowledgeDeactivation(
                $employee->user,
                $employee->status !== Employee::STATUS_ACTIVE,
                $request->user()?->id,
            );
        }

        return redirect()
            ->route('admin.employees.show', $employee)
            ->with('success', 'Данные сотрудника обновлены.');
    }

    public function toggleStatus(
        Request $request,
        Employee $employee,
        EmployeeActivationService $activationService,
    ): RedirectResponse
    {
        $isActivating = $employee->status !== Employee::STATUS_ACTIVE;

        if (! $isActivating && ! $activationService->canDeactivateEmployee($employee)) {
            Inertia::flash('toast', [
                'type' => 'error',
                'message' => 'Аккаунты руководства нельзя деактивировать.',
            ]);

            return back();
        }

        $activationService->syncEmployeeStatus($employee, $isActivating);

        if ($employee->user) {
            $activationService->syncKnowledgeDeactivation(
                $employee->user,
                ! $isActivating,
                $request->user()?->id,
            );
        }

        return back()->with('success', 'Статус сотрудника обновлен.');
    }

    public function destroy(Employee $employee): RedirectResponse
    {
        $employee->loadMissing(['files', 'user']);

        if ($employee->user?->isAdmin()) {
            Inertia::flash('toast', [
                'type' => 'error',
                'message' => 'Профиль руководителя удалить нельзя.',
            ]);

            return back();
        }

        $employeeName = $employee->name;

        DB::transaction(function () use ($employee): void {
            foreach ($employee->files as $file) {
                if ($file->path) {
                    Storage::disk('public')->delete($file->path);
                }
            }

            PublicStorageAsset::delete($employee->photo_url);

            $employee->delete();
        });

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => sprintf('Сотрудник %s удален.', $employeeName),
        ]);

        return redirect()
            ->route('admin.employees.index')
            ->with('success', 'Сотрудник удален.');
    }

    public function storeRole(Request $request): RedirectResponse
    {
        $payload = $request->validate([
            'name' => ['required', 'string', 'max:120'],
        ]);

        $name = trim((string) $payload['name']);

        $alreadyExists = collect(Employee::availablePositions())
            ->contains(
                fn (string $position) => mb_strtolower($position) === mb_strtolower($name),
            );

        if ($alreadyExists) {
            return back()->withErrors([
                'name' => 'Такая роль уже есть в списке.',
            ]);
        }

        EmployeeRolesCatalog::add($name);

        return redirect()
            ->route('admin.employees.roles.index')
            ->with('success', 'Роль добавлена.');
    }

    public function destroyRole(Request $request): RedirectResponse
    {
        $payload = $request->validate([
            'name' => ['required', 'string', 'max:120'],
        ]);

        $name = trim((string) $payload['name']);
        $defaultPositions = collect(Employee::positions())
            ->map(fn (string $position) => mb_strtolower($position));

        if ($defaultPositions->contains(fn (string $position) => $position === mb_strtolower($name))) {
            return back()->withErrors([
                'name' => 'Базовую роль нельзя удалить из каталога.',
            ]);
        }

        $affectedEmployees = Employee::query()
            ->where('position', $name)
            ->count();

        DB::transaction(function () use ($affectedEmployees, $name): void {
            if ($affectedEmployees > 0) {
                EmployeeRolesCatalog::add(self::FALLBACK_ROLE);

                Employee::query()
                    ->where('position', $name)
                    ->update(['position' => self::FALLBACK_ROLE]);
            }

            EmployeeRolesCatalog::remove($name);
        });

        return redirect()
            ->route('admin.employees.roles.index')
            ->with(
                'success',
                $affectedEmployees > 0
                    ? sprintf(
                        'Роль удалена. Сотрудники автоматически переведены в "%s".',
                        self::FALLBACK_ROLE,
                    )
                    : 'Роль удалена.',
            );
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
            'can_delete' => ! $employee->user?->isAdmin(),
            'can_toggle_status' => ! (
                $employee->status === Employee::STATUS_ACTIVE
                && $employee->isProtectedFromDeactivation()
            ),
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

    private function syncEmployeeUser(Employee $employee): void
    {
        $user = $employee->user
            ?: User::query()
                ->where('email', $employee->email)
                ->first();

        $emailChanged = $user && $user->email !== $employee->email;

        $payload = [
            'name' => $employee->name,
            'email' => $employee->email,
            'role' => $user?->role ?? User::ROLE_EMPLOYEE,
            'is_active' => $employee->status === Employee::STATUS_ACTIVE,
            'employee_id' => $employee->id,
        ];

        if ($user) {
            $user->forceFill([
                ...$payload,
                'password' => $user->password ?: Str::password(32),
                'email_verified_at' => $emailChanged
                    ? null
                    : $user->email_verified_at,
                'activated_at' => $emailChanged
                    ? null
                    : $user->activated_at,
                'activation_code' => $emailChanged
                    ? null
                    : $user->activation_code,
                'activation_code_expires_at' => $emailChanged
                    ? null
                    : $user->activation_code_expires_at,
                'activation_code_sent_at' => $emailChanged
                    ? null
                    : $user->activation_code_sent_at,
            ])->save();

            return;
        }

        User::query()->create([
            ...$payload,
            'password' => Str::password(32),
            'email_verified_at' => null,
            'activated_at' => null,
            'activation_code' => null,
            'activation_code_expires_at' => null,
            'activation_code_sent_at' => null,
        ]);
    }
}
