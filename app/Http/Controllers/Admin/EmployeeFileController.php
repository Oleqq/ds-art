<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\Employees\StoreEmployeeFileRequest;
use App\Models\Employee;
use App\Models\EmployeeFile;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class EmployeeFileController extends Controller
{
    public function store(StoreEmployeeFileRequest $request, Employee $employee): RedirectResponse
    {
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

    public function destroy(Employee $employee, EmployeeFile $file): RedirectResponse
    {
        abort_unless($file->employee_id === $employee->id, 404);

        if ($file->path) {
            Storage::disk('public')->delete($file->path);
        }

        $file->delete();

        return back()->with('success', 'Файл удален.');
    }

    public function download(Employee $employee, EmployeeFile $file): StreamedResponse
    {
        abort_unless($file->employee_id === $employee->id, 404);
        abort_if(blank($file->path), 404);

        return Storage::disk('public')->download($file->path, $file->original_name);
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
