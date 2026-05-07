<?php

namespace App\Http\Middleware;

use App\Models\Employee;
use App\Models\User;
use App\Support\KnowledgeBase\KnowledgeBasePresenter;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        $presenter = app(KnowledgeBasePresenter::class);
        $user = $request->user();

        if ($user instanceof User) {
            $user = $this->ensureAdminEmployeeProfile($user);
            $user->loadMissing([
                'employee',
                'knowledgePermission',
                'knowledgeCategoryPermissions',
                'knowledgeArticlePermissions',
            ]);
        }

        return [
            ...parent::share($request),
            'name' => config('app.name'),
            'auth' => [
                'user' => $user ? $this->authUserPayload($user) : null,
            ],
            'sidebarOpen' => ! $request->hasCookie('sidebar_state') || $request->cookie('sidebar_state') === 'true',
            'knowledgeBaseSidebar' => fn () => $presenter->sharedSidebar($user),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function authUserPayload(User $user): array
    {
        $payload = [
            ...$user->toArray(),
            'avatar' => $user->employee?->photo_url,
        ];

        if (! $user->isAdmin() && is_array($payload['employee'] ?? null)) {
            $payload['employee']['manager_notes'] = null;
        }

        return $payload;
    }

    private function ensureAdminEmployeeProfile(User $user): User
    {
        if (! $user->isAdmin()) {
            return $user;
        }

        $employee = $user->employee;

        if (! $employee) {
            $employee = Employee::query()->firstOrCreate(
                ['email' => $user->email],
                [
                    'name' => $user->name,
                    'phone' => null,
                    'position' => 'Руководитель',
                    'joined_on' => $user->created_at?->toDateString() ?? now()->toDateString(),
                    'status' => $user->is_active ? Employee::STATUS_ACTIVE : Employee::STATUS_INACTIVE,
                    'salary' => null,
                    'photo_url' => null,
                    'manager_notes' => null,
                    'schedule' => Employee::defaultSchedule(),
                ],
            );

            $user->forceFill([
                'employee_id' => $employee->id,
            ])->save();
        }

        $employee->fill([
            'name' => $user->name,
            'email' => $user->email,
            'status' => $user->is_active ? Employee::STATUS_ACTIVE : Employee::STATUS_INACTIVE,
        ]);

        if (! $employee->position) {
            $employee->position = 'Руководитель';
        }

        if (! $employee->joined_on) {
            $employee->joined_on = $user->created_at?->toDateString() ?? now()->toDateString();
        }

        if (! $employee->schedule) {
            $employee->schedule = Employee::defaultSchedule();
        }

        if ($employee->isDirty()) {
            $employee->save();
        }

        $user->setRelation('employee', $employee);

        return $user;
    }
}
