<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\Employees\UpdateEmployeePhotoRequest;
use App\Models\Employee;
use App\Support\PublicStorageAsset;
use Illuminate\Http\RedirectResponse;

class EmployeePhotoController extends Controller
{
    public function update(UpdateEmployeePhotoRequest $request, Employee $employee): RedirectResponse
    {
        $photo = $request->file('photo');
        $path = $photo->store("employees/{$employee->id}/photo", 'public');

        PublicStorageAsset::delete($employee->photo_url);

        $employee->update([
            'photo_url' => PublicStorageAsset::url($path),
        ]);

        return back()->with('success', 'Фото сотрудника обновлено.');
    }
}
