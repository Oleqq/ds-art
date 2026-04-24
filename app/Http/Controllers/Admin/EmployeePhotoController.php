<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\Employees\UpdateEmployeePhotoRequest;
use App\Models\Employee;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Storage;

class EmployeePhotoController extends Controller
{
    public function update(UpdateEmployeePhotoRequest $request, Employee $employee): RedirectResponse
    {
        $photo = $request->file('photo');
        $path = $photo->store("employees/{$employee->id}/photo", 'public');

        if ($employee->photo_url && str_starts_with($employee->photo_url, '/storage/')) {
            $oldPath = ltrim(str_replace('/storage/', '', $employee->photo_url), '/');
            Storage::disk('public')->delete($oldPath);
        }

        $employee->update([
            'photo_url' => Storage::url($path),
        ]);

        return back()->with('success', 'Фото сотрудника обновлено.');
    }
}
