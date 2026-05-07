<?php

namespace App\Http\Controllers\Employee;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\Employees\StoreEmployeeFileRequest;
use App\Http\Requests\Admin\Employees\UpdateEmployeePhotoRequest;
use App\Http\Requests\Employee\UpdateProfileRequest;
use App\Models\Employee as EmployeeModel;
use App\Models\EmployeeFile;
use App\Support\PublicStorageAsset;
use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ProfileController extends Controller
{
    public function show(Request $request): Response
    {
        $employee = $this->employeeForRequest($request);

        abort_unless($employee, 404);

        return Inertia::render('employee/profile', [
            'employee' => $this->mapEmployee($employee),
            'employee_form' => $this->formPayload($employee),
            'positions' => EmployeeModel::availablePositions(),
            'banner' => 'Вы управляете своим профилем, контактами, фото и личными файлами.',
            'is_active_employee' => $employee->status === EmployeeModel::STATUS_ACTIVE,
        ]);
    }

    public function update(
        UpdateProfileRequest $request,
    ): RedirectResponse {
        $employee = $this->employeeForRequest($request);

        abort_unless($employee, 404);

        $employee->update($request->employeeData());

        if ($employee->user) {
            $employee->user->update([
                'name' => $employee->name,
                'email' => $employee->email,
            ]);
        }

        return back()->with('success', 'Профиль обновлен.');
    }

    public function updatePhoto(
        UpdateEmployeePhotoRequest $request,
    ): RedirectResponse {
        $employee = $this->employeeForRequest($request);

        abort_unless($employee, 404);

        $photo = $request->file('photo');
        $path = $photo->store("employees/{$employee->id}/photo", 'public');

        PublicStorageAsset::delete($employee->photo_url);

        $employee->update([
            'photo_url' => PublicStorageAsset::url($path),
        ]);

        return back()->with('success', 'Фото профиля обновлено.');
    }

    public function storeFile(
        StoreEmployeeFileRequest $request,
    ): RedirectResponse {
        $employee = $this->employeeForRequest($request);

        abort_unless($employee, 404);

        $uploadedFile = $request->file('file');
        $path = $uploadedFile->store("employees/{$employee->id}/files", 'public');
        $extension = strtolower($uploadedFile->getClientOriginalExtension() ?: $uploadedFile->extension() ?: 'file');
        $originalName = $uploadedFile->getClientOriginalName();
        $title = trim((string) $request->string('title')) ?: pathinfo($originalName, PATHINFO_FILENAME);

        $employee->files()->create([
            'title' => $title,
            'original_name' => $originalName,
            'path' => $path,
            'extension' => $extension,
            'size_label' => $this->formatBytes($uploadedFile->getSize() ?: 0),
            'uploaded_at' => now(),
        ]);

        return back()->with('success', 'Файл прикреплен.');
    }

    public function destroyFile(
        Request $request,
        EmployeeFile $file,
    ): RedirectResponse {
        $employee = $this->employeeForRequest($request);

        abort_unless($employee && $file->employee_id === $employee->id, 404);

        if ($file->path) {
            Storage::disk('public')->delete($file->path);
        }

        $file->delete();

        return back()->with('success', 'Файл удален.');
    }

    public function downloadFile(
        Request $request,
        EmployeeFile $file,
    ): StreamedResponse {
        $employee = $this->employeeForRequest($request);

        abort_unless($employee && $file->employee_id === $employee->id, 404);
        abort_if(blank($file->path), 404);

        return Storage::disk('public')->download($file->path, $file->original_name);
    }

    private function employeeForRequest(Request $request): ?EmployeeModel
    {
        return $request->user()?->employee()
            ->with('files')
            ->first();
    }

    private function mapEmployee(EmployeeModel $employee): array
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
            'manager_notes' => null,
            'schedule' => $employee->schedule ?: EmployeeModel::defaultSchedule(),
            'files' => $employee->files->map(fn ($file) => [
                'id' => $file->id,
                'title' => $file->title,
                'original_name' => $file->original_name,
                'path' => $file->path,
                'extension' => $file->extension,
                'size_label' => $file->size_label,
                'uploaded_at' => $file->uploaded_at?->toIso8601String(),
                'download_url' => $file->path
                    ? route('employee.profile.files.download', $file)
                    : null,
            ])->values(),
        ];
    }

    private function formPayload(EmployeeModel $employee): array
    {
        return [
            'name' => $employee->name,
            'email' => $employee->email,
            'phone' => $employee->phone ?? '',
            'position' => $employee->position,
            'joined_on' => $employee->joined_on?->toDateString() ?? now()->toDateString(),
            'status' => $employee->status,
            'manager_notes' => '',
            'schedule' => $employee->schedule ?: EmployeeModel::defaultSchedule(),
        ];
    }

    private function formatBytes(int $bytes): string
    {
        if ($bytes >= 1024 * 1024) {
            return number_format($bytes / (1024 * 1024), 1, '.', '').' МБ';
        }

        if ($bytes >= 1024) {
            return number_format($bytes / 1024, 0, '.', '').' КБ';
        }

        return $bytes.' Б';
    }
}
